import axios, {
  AxiosError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';

/**
 * The platform's network path under the offline adapter: the real network
 * adapter, the fetch options that platform needs, and a default timeout for
 * the requests the offline layer handles (browser fetch has none).
 */
export type OfflineTransport = {
  /** The real network adapter the offline adapter wraps. */
  send: AxiosAdapter;
  /** Merged into api.defaults.fetchOptions. */
  fetchOptions?: Record<string, unknown>;
  /** Default timeout for handled requests; an explicit config.timeout wins. */
  requestTimeoutMs?: number;
};

// axios' typings omit getAdapter's second argument, but the runtime needs the
// request config to resolve the fetch adapter against `config.env.fetch`
// (Tauri's Rust-side fetch) instead of the global fetch.
export const resolveFetchAdapter = (
  config: InternalAxiosRequestConfig
): AxiosAdapter =>
  (axios.getAdapter as (
    adapters: 'fetch',
    config: InternalAxiosRequestConfig
  ) => AxiosAdapter)('fetch', config);

// Browser fetch has no connect timeout: without this a blackholed backend
// holds a request for minutes before it counts as unreachable, and every
// screen hangs before it falls back to stored data.
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

/**
 * The browser's transport: the global fetch through axios' fetch adapter.
 *
 * `redirect: 'manual'` is required to detect a Cloudflare Access rejection:
 * followed, the redirect to cloudflareaccess.com fails CORS (cross-origin)
 * and the request dies as a network error that looks exactly like being
 * offline. Manual, it comes back as an opaque redirect (status 0), which the
 * guard below turns into an access-denied error instead of a fake success.
 *
 * Note: the backend API doesn't redirect today; if it ever does, that shows
 * up as "access denied" too.
 */
export const createWebTransport = (
  { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS }: { timeoutMs?: number } = {}
): OfflineTransport => {
  const send: AxiosAdapter = async config => {
    const response = await resolveFetchAdapter(config)(config);
    // An opaque redirect (status 0) must never be treated as an answer:
    // axios' settle() resolves any response with a falsy status, which would
    // store an empty body over real responses and count queued writes as
    // synced, deleting them from the outbox.
    if (response.status === 0) {
      throw new AxiosError(
        'Opaque redirect: Cloudflare Access sign-in may have expired',
        AxiosError.ERR_BAD_RESPONSE,
        config,
        undefined,
        response
      );
    }
    return response;
  };
  return {
    send,
    fetchOptions: { redirect: 'manual' },
    requestTimeoutMs: timeoutMs,
  };
};
