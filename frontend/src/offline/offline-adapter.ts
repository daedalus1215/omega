import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  isAccessDenied,
  isBackendUnavailable,
  isBackendUnreachable,
  isUnauthorized,
} from './offline-errors';
import { deriveOfflineResponse, matchOfflineReadRoute } from './offline-reads';
import { apiPathOf, matchOfflineRoute } from './offline-routes';
import type { OfflineStore } from './offline-store';
import {
  rewriteJsonIds,
  rewriteUrlIds,
  tempIdsIn,
  type IdMap,
} from './temp-ids';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Set by the outbox flusher: send as-is, bypassing offline handling. */
    offlineReplay?: boolean;
    /**
     * Store a successful GET as usual, but surface failures instead of
     * answering from the store — for background fetches that need to know
     * whether the backend actually answered.
     */
    noOfflineFallback?: boolean;
  }
}

/** Set on responses produced locally instead of by the backend. */
export const OFFLINE_RESPONSE_HEADER = 'x-omega-offline';

export type OfflineAdapterDeps = {
  /** The real network adapter. */
  send: AxiosAdapter;
  /**
   * Default timeout for the requests this adapter handles (reads with a
   * non-blob responseType, offline-routable writes, replays). An explicit
   * config.timeout wins.
   */
  requestTimeoutMs?: number;
  store: OfflineStore;
  getUri: (config: InternalAxiosRequestConfig) => string;
  /** Asks for queued writes to be replayed soon. */
  requestFlush?: () => void;
  /** Reports whether each request that went to the network got an answer. */
  onReachabilityChange?: (reachable: boolean) => void;
  /** Called when the backend turns a request's login token away (401). */
  onUnauthorized?: (config: InternalAxiosRequestConfig) => void;
  /**
   * Reports, for each request that got an answer, whether Cloudflare Access
   * turned it away (true) or let it through to the backend (false).
   */
  onAccessDeniedChange?: (denied: boolean) => void;
  /** Called after writes are added to or dropped from the outbox. */
  onQueueChange?: () => void;
};

const synthesizeResponse = (
  config: InternalAxiosRequestConfig,
  data: string
): AxiosResponse => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: new AxiosHeaders({ [OFFLINE_RESPONSE_HEADER]: '1' }),
  config,
});

const parseBody = (data: string | undefined): Record<string, unknown> => {
  if (data === undefined) return {};
  try {
    const parsed: unknown = JSON.parse(data);
    return parsed !== null && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
};

/**
 * Ridden out with stored data and queued writes: an outage, rate limiting,
 * an expired session (which only blocks syncing until the next login), or
 * Cloudflare Access rejecting the connection settings (until they're fixed).
 */
const shouldRideOut = (error: unknown): boolean =>
  isBackendUnavailable(error) || isUnauthorized(error) || isAccessDenied(error);

/**
 * Merges JSON object bodies in order, later fields winning; undefined if any
 * isn't a JSON object.
 */
const mergeJsonBodies = (
  bodies: (string | undefined)[]
): string | undefined => {
  const merged: Record<string, unknown> = {};
  for (const body of bodies) {
    const parsed = parseBody(body);
    if (body === undefined || Object.keys(parsed).length === 0) {
      return undefined;
    }
    Object.assign(merged, parsed);
  }
  return JSON.stringify(merged);
};

const hasUnresolvedTempIds = (
  url: string,
  data: string | undefined,
  ids: IdMap
): boolean => [...tempIdsIn(url, data)].some(id => !ids.has(id));

/**
 * Wraps the network adapter so the app keeps working while the backend is
 * unreachable:
 *
 * - GETs: every successful text response is stored, and replayed verbatim
 *   (pre-transformResponse, so callers can't tell the difference) when the
 *   backend can't be reached. The network is tried first, unless the last
 *   request found the backend unreachable: then a stored copy is returned
 *   straight away while the request goes out in the background. A few
 *   requests with no stored copy are answered from ones that cover them
 *   (see offline-reads.ts).
 * - Writes with an offline route (see offline-routes.ts): if the backend
 *   can't be reached they're queued in the outbox, mirrored into stored
 *   responses, and answered locally. While anything is queued, later writes
 *   queue behind it so the server sees them in order.
 *
 * Rate limiting, an expired session (401) and Cloudflare Access rejecting the
 * connection settings are handled the same way as an outage, so none of them
 * locks the user out of their calendar.
 *
 * Temp ids handed out for entities created offline are swapped for real ids
 * on the way out once known; requests touching a still-unsynced entity never
 * reach the network, since the server has never heard of it.
 */
export const createOfflineAdapter = ({
  send: sendToNetwork,
  store,
  getUri,
  requestFlush,
  onReachabilityChange,
  onUnauthorized,
  onAccessDeniedChange,
  onQueueChange,
  requestTimeoutMs,
}: OfflineAdapterDeps): AxiosAdapter => {
  // Browser fetch has no connect timeout: without this a blackholed backend
  // holds each handled request for minutes before it counts as unreachable.
  // axios merges the instance's `timeout: 0` default into every request, so
  // "no explicit timeout" shows up as 0 as often as undefined.
  const applyTimeout = (config: InternalAxiosRequestConfig): void => {
    if (
      requestTimeoutMs !== undefined &&
      (config.timeout === undefined || config.timeout === 0)
    ) {
      config.timeout = requestTimeoutMs;
    }
  };
  // Set while the last request to go out found the backend unreachable.
  // Requests that can be answered locally then are, instead of each waiting
  // out the connect timeout first: with no network at all (airplane mode on
  // Android), every attempt takes the full timeout.
  let backendUnreachable = false;
  // Meanwhile one read at a time still goes out, in the background, so the
  // app notices the backend coming back.
  let probing = false;

  const send: AxiosAdapter = async config => {
    try {
      const response = await sendToNetwork(config);
      backendUnreachable = false;
      onReachabilityChange?.(true);
      onAccessDeniedChange?.(false);
      return response;
    } catch (error) {
      if (!axios.isCancel(error)) {
        backendUnreachable = isBackendUnreachable(error);
        onReachabilityChange?.(!backendUnreachable);
        if (axios.isAxiosError(error) && error.response) {
          onAccessDeniedChange?.(isAccessDenied(error));
        }
      }
      if (isUnauthorized(error)) {
        onUnauthorized?.(config);
      }
      throw error;
    }
  };

  /** Full URI for another API path, keyed like the GET responses. */
  const uriFor =
    (config: InternalAxiosRequestConfig) =>
    (path: string): string =>
      getUri({ ...config, url: path, params: undefined });

  const handleRead = async (
    config: InternalAxiosRequestConfig,
    unsynced: boolean
  ): Promise<AxiosResponse> => {
    // Blob downloads (audio, exports) run to completion: no default timeout.
    if (config.responseType !== 'blob') {
      applyTimeout(config);
    }
    const uri = getUri(config);
    // Omega: event reads are folded into, and answered from, the events
    // store rather than stored by URL (see offline-reads.ts).
    const readRoute = matchOfflineReadRoute(apiPathOf(config.url ?? ''));
    const readContext = { store, uri: uriFor(config) };
    const query = new URL(uri, 'http://offline.invalid').searchParams;
    const answerFromReadRoute = async (route: NonNullable<typeof readRoute>) => {
      const answer = await route.route.answer(readContext, query, route.params);
      return answer === undefined
        ? undefined
        : synthesizeResponse(config, JSON.stringify(answer));
    };

    if (unsynced) {
      const local = readRoute
        ? await answerFromReadRoute(readRoute)
        : await store
            .getResponse(uri)
            .then(cached => cached && synthesizeResponse(config, cached.data));
      if (local) return local;
      throw new AxiosError(
        'Not available until synced',
        AxiosError.ERR_NETWORK,
        config
      );
    }

    const fetchAndStore = async () => {
      const response = await send(config);
      if (typeof response.data === 'string') {
        const data = response.data;
        await (async () =>
          readRoute
            ? readRoute.route.store(
                readContext,
                query,
                readRoute.params,
                JSON.parse(data)
              )
            : store.putResponse(uri, data))().catch(err =>
          console.warn('Could not store offline response:', err)
        );
      }
      return response;
    };

    const answerLocally = async (): Promise<AxiosResponse | undefined> => {
      if (readRoute) return answerFromReadRoute(readRoute);
      const cached = await store.getResponse(uri);
      if (cached) {
        return synthesizeResponse(config, cached.data);
      }
      const derived = await deriveOfflineResponse(uri, {
        store,
        uri: uriFor(config),
      });
      return derived === undefined
        ? undefined
        : synthesizeResponse(config, JSON.stringify(derived));
    };

    if (backendUnreachable && !config.noOfflineFallback) {
      const local = await answerLocally();
      if (local) {
        if (!probing) {
          probing = true;
          void fetchAndStore()
            .catch(() => undefined)
            .finally(() => {
              probing = false;
            });
        }
        return local;
      }
    }

    try {
      return await fetchAndStore();
    } catch (error) {
      if (config.noOfflineFallback || !shouldRideOut(error)) {
        throw error;
      }
      const local = await answerLocally();
      if (!local) {
        throw error;
      }
      return local;
    }
  };

  const handleWrite = async (
    config: InternalAxiosRequestConfig,
    unsynced: boolean
  ): Promise<AxiosResponse> => {
    const method = (config.method ?? '').toUpperCase();
    const url = config.url ?? '';
    const match = matchOfflineRoute(method, apiPathOf(url));
    if (!match) {
      return send(config);
    }
    applyTimeout(config);

    const body = typeof config.data === 'string' ? config.data : undefined;
    const applyLocally = () =>
      match.route.applyLocally({
        store,
        params: match.params,
        body: parseBody(body),
        uri: uriFor(config),
      });

    const queueAhead = (await store.outboxCount()) > 0;
    const sendNow = !queueAhead && !unsynced && !backendUnreachable;
    if (sendNow) {
      try {
        const response = await send(config);
        // Keep stored copies current, or going offline before the next
        // prefetch would show (and let you edit) the pre-write version.
        if (!match.route.createsEntity) {
          await applyLocally().catch(err =>
            console.warn('Could not mirror write into offline store:', err)
          );
        }
        return response;
      } catch (error) {
        if (!shouldRideOut(error)) {
          throw error;
        }
      }
    }

    const result = await applyLocally();

    if (!result.skipQueue) {
      const sameTarget = (await store.listOutbox()).filter(
        queued => queued.method === method && queued.url === url
      );
      const duplicate =
        match.route.dedupe && sameTarget.some(queued => queued.data === body);
      if (!duplicate) {
        const merged =
          match.route.coalesce && sameTarget.length > 0
            ? mergeJsonBodies([...sameTarget.map(queued => queued.data), body])
            : undefined;
        await store.enqueue({
          method,
          url,
          params: config.params,
          data: merged ?? body,
          tempId: result.tempId,
        });
        // Only once the merged write is safely queued. If the flusher is
        // already sending one of these it still goes out, and the merged
        // write repeats its fields, so nothing is lost.
        if (merged !== undefined) {
          for (const queued of sameTarget) {
            await store.removeFromOutbox(queued.seq);
          }
        }
      }
    }
    onQueueChange?.();
    // Unless it was just tried and failed, try sending it right away. Even
    // while the backend seems unreachable: the flush finds out whether it's
    // back, without holding up this write.
    if (!sendNow) {
      requestFlush?.();
    }

    return synthesizeResponse(
      config,
      result.data === undefined ? '' : JSON.stringify(result.data)
    );
  };

  return async config => {
    if (config.offlineReplay) {
      // A replayed write is always offline-routable.
      applyTimeout(config);
      return send(config);
    }

    const ids = await store.getIdMap();
    const url = rewriteUrlIds(config.url ?? '', ids);
    const data =
      typeof config.data === 'string'
        ? rewriteJsonIds(config.data, ids)
        : config.data;
    const request: InternalAxiosRequestConfig = { ...config, url, data };
    const unsynced = hasUnresolvedTempIds(
      url,
      typeof data === 'string' ? data : undefined,
      ids
    );

    return (request.method ?? 'get').toLowerCase() === 'get'
      ? handleRead(request, unsynced)
      : handleWrite(request, unsynced);
  };
};
