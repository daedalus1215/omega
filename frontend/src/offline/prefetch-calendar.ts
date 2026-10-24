import type { AxiosInstance } from 'axios';
import {
  isAccessDenied,
  isBackendUnavailable,
  isBackendUnreachable,
  isRateLimited,
  isUnauthorized,
} from './offline-errors';
import {
  EVENT_COVERAGE_KEY,
  queuedEventRefs,
} from './offline-reads';
import type { EventRange, OfflineStore } from './offline-store';

export type PrefetchDeps = {
  /** Instance with the offline adapter installed, which stores responses. */
  api: AxiosInstance;
  store: OfflineStore;
  /** Gap between requests. */
  spacingMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

export type PrefetchResult = {
  /** Events stored when the run ended. */
  events: number;
  /**
   * - `unreachable`: the server went away mid-run.
   * - `throttled`: the server rate-limited a request.
   * - `paused`: writes got queued mid-run; refetching now could overwrite
   *   their mirrored copies with the server's older ones.
   * - `unauthorized`: the login token was turned away.
   * - `access-denied`: Cloudflare Access rejected the connection settings.
   * - `failed`: the server returned some other error.
   */
  outcome:
    | 'complete'
    | 'unreachable'
    | 'throttled'
    | 'paused'
    | 'unauthorized'
    | 'access-denied'
    | 'failed';
};

// The server allows 100 requests/min, and that budget is likely shared by
// every client behind the same proxy. One request every 2.5s (24/min) leaves
// most of it for interactive use.
const DEFAULT_SPACING_MS = 2_500;

// A request can stall on a dead connection with nothing to time it out. Give
// up on it so the run ends as unreachable and is retried, instead of every
// later run waiting behind it.
const REQUEST_TIMEOUT_MS = 30_000;

const defaultSleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

/** What the app asks for on most screens besides the calendar itself. */
const ACCOUNT_REQUESTS = ['/calendars', '/users/profile', '/calendar-invitations'];

/** The stored window (specs Q2): whole months, this many back and ahead. */
const MONTHS_BACK = 3;
const MONTHS_AHEAD = 12;

const isoDate = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];

/**
 * One request per calendar month of the window, as the calendar's own
 * requests are made: plain dates, read as UTC midnight by the server. A
 * month's end date is the next month's first day; the overlap is harmless.
 */
export const monthRanges = (today = new Date()): [string, string][] => {
  const ranges: [string, string][] = [];
  for (let offset = -MONTHS_BACK; offset <= MONTHS_AHEAD; offset++) {
    const year = today.getFullYear();
    const month = today.getMonth() + offset;
    ranges.push([isoDate(year, month), isoDate(year, month + 1)]);
  }
  return ranges;
};

/**
 * Drops stored events that ended before the window, unless a queued write
 * still needs them, and trims the coverage to match: what's left behind as
 * the months go by.
 */
const pruneBefore = async (store: OfflineStore, start: number) => {
  const refs = await queuedEventRefs(store);
  for (const event of await store.listEvents()) {
    if (Date.parse(event.endDate) < start && !refs.events.has(event.id)) {
      await store.deleteEvent(event.id);
    }
  }
  const coverage =
    (await store.getMeta<EventRange[]>(EVENT_COVERAGE_KEY)) ?? [];
  await store.setMeta(
    EVENT_COVERAGE_KEY,
    coverage
      .filter(range => range.end >= start)
      .map(range => ({ ...range, start: Math.max(range.start, start) }))
  );
};

/**
 * Fetches what the app needs offline so it's stored by the offline adapter,
 * as a side effect of fetching it: the calendars, the profile and pending
 * invitations, then every event in the window, a month per request
 * (specs/offline-apps.md, D6). The server creates repeat occurrences as
 * they're read, so this also creates them up to a year ahead.
 *
 * Requests go one at a time, spaced out, and the run stops at the first
 * sign of trouble rather than pushing on.
 */
export const prefetchCalendar = async ({
  api,
  store,
  spacingMs = DEFAULT_SPACING_MS,
  sleep = defaultSleep,
}: PrefetchDeps): Promise<PrefetchResult> => {
  let isFirstRequest = true;
  const get = async <T>(url: string, params?: Record<string, unknown>) => {
    if (!isFirstRequest) await sleep(spacingMs);
    isFirstRequest = false;
    // Surface failures rather than being handed a stored copy, so the run
    // can tell an outage or throttling from a real answer.
    const response = await api.get<T>(url, {
      params,
      noOfflineFallback: true,
      timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
  };

  const result = async (
    outcome: PrefetchResult['outcome']
  ): Promise<PrefetchResult> => ({
    events: (await store.listEvents()).length,
    outcome,
  });

  const months = monthRanges();
  try {
    for (const url of ACCOUNT_REQUESTS) {
      if ((await store.outboxCount()) > 0) {
        return result('paused');
      }
      try {
        await get(url);
      } catch (error) {
        // One failing endpoint shouldn't cost the rest their refresh.
        if (
          isBackendUnavailable(error) ||
          isUnauthorized(error) ||
          isAccessDenied(error)
        ) {
          throw error;
        }
        console.warn(`Prefetching ${url} failed:`, error);
      }
    }

    // Stored by the events read route as each answer comes in.
    for (const [startDate, endDate] of months) {
      if ((await store.outboxCount()) > 0) {
        return result('paused');
      }
      await get('/calendar-events', { startDate, endDate });
    }
  } catch (error) {
    // Leave the store as it was rather than prune after a partial run.
    if (isRateLimited(error)) return result('throttled');
    if (isBackendUnreachable(error)) return result('unreachable');
    if (isUnauthorized(error)) return result('unauthorized');
    if (isAccessDenied(error)) return result('access-denied');
    console.warn('Calendar prefetch failed:', error);
    return result('failed');
  }

  await pruneBefore(store, Date.parse(months[0][0]));
  return result('complete');
};
