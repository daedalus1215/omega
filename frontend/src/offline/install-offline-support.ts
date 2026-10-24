import {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { jwtDecode } from 'jwt-decode';
import { STORAGE_KEYS } from '../constants/storage';
import { defaultLockManager, type LockManager } from './locks';
import { createOfflineChannel, setDefaultStatusPoster } from './offline-channel';
import { createOfflineAdapter } from './offline-adapter';
import { isBackgroundWrite } from './offline-routes';
import {
  createOfflineStore,
  type EventRange,
  type OfflineStore,
  type OutboxEntry,
} from './offline-store';
import { createWebTransport, type OfflineTransport } from './offline-transport';
import { EVENT_COVERAGE_KEY } from './offline-reads';
import { createOutboxFlusher, FLUSH_LOCK_NAME } from './outbox-flusher';
import { prefetchCalendar } from './prefetch-calendar';
import { startSyncScheduler } from './sync-scheduler';
import {
  getSyncStatus,
  reportSyncProblem,
  updateSyncStatus,
} from './sync-status';

const FLUSH_INTERVAL_MS = 30_000;
const PREFETCH_INTERVAL_MS = 30 * 60_000;
// Leave the rate-limit budget to the screens opened at launch.
const PREFETCH_STARTUP_DELAY_MS = 60_000;
const PREFETCH_RETRY_MS = 5 * 60_000;
const NEXT_PREFETCH_AT_KEY = 'nextPrefetchAt';
export const PREFETCH_LOCK_NAME = 'omega-offline-prefetch';
/** Meta row naming the user the stored data and queued writes belong to. */
const OWNER_KEY = 'owner';
// Clearing waits this long for a running flush or prefetch to finish, so
// neither writes the old user's data back afterwards; past it, it clears
// anyway rather than leave sign-out hanging.
const CLEAR_LOCK_WAIT_MS = 10_000;

/** The `sub` of the stored login token, if there's a readable one. */
const storedUserId = (): string | undefined => {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH.JWT_TOKEN);
    return token === null ? undefined : String(jwtDecode(token).sub);
  } catch {
    return undefined;
  }
};

// Replaying while logged out would 401, and the 401 handler redirects to
// /login — on the login page itself that's a reload loop. With an expired
// session every request would 401 too, so wait for the next login.
const canSync = () =>
  localStorage.getItem(STORAGE_KEYS.AUTH.JWT_TOKEN) !== null &&
  !getSyncStatus().sessionExpired;

// A 401 there means a wrong password, not an expired session.
const isLoginRequest = (config: InternalAxiosRequestConfig) =>
  (config.url ?? '').split('?')[0] === '/api/auth/login';

type InstallOptions = {
  store?: OfflineStore;
  /** Start background flushing; off in tests, which have no window. */
  schedule?: boolean;
  /** The platform's network path; defaults to the browser's. */
  transport?: OfflineTransport;
  /** Cross-tab lock manager; defaults to navigator.locks. */
  locks?: LockManager;
};

let stopPrevious: (() => void) | undefined;
let flushNow: (() => Promise<boolean>) | undefined;
let claimFor: ((userId: string) => Promise<boolean>) | undefined;
let clearAll: (() => Promise<void>) | undefined;

/**
 * Ties the stored data and queued writes to `userId`. Data stored before
 * this existed is adopted; another user's is deleted, since their queued
 * writes can't be sent without their login. Reads and syncing wait for it,
 * so call it before storing the new login token. Resolves to true when it
 * deleted anything. A no-op where offline support isn't installed.
 */
export const claimOfflineData = (userId: string): Promise<boolean> =>
  claimFor?.(userId) ?? Promise.resolve(false);

/**
 * Deletes everything stored for offline use, queued writes included, and
 * tells the other tabs (sign-out). A no-op where offline support isn't
 * installed.
 */
export const clearOfflineData = (): Promise<void> =>
  clearAll?.() ?? Promise.resolve();

export type OfflineSummary = {
  /** Events and occurrences stored, offline-created ones included. */
  events: number;
  /**
   * The ranges the stored events are complete for (the prefetched window,
   * plus whatever was viewed outside it), earliest first.
   */
  coverage: EventRange[];
};

let summarize: (() => Promise<OfflineSummary>) | undefined;

/**
 * What's stored for offline use, for Settings. Undefined where offline
 * support isn't installed.
 */
export const getOfflineSummary = (): Promise<OfflineSummary | undefined> =>
  summarize?.() ?? Promise.resolve(undefined);

/**
 * Sends queued writes straight away rather than at the next tick (the
 * tray's "Sync now"); the outcome shows up in the sync status. Resolves to
 * false without trying when there's no session to sync with.
 */
export const syncNow = (): Promise<boolean> =>
  flushNow?.() ?? Promise.resolve(false);

/**
 * Makes the shared axios instance tolerate the backend being unreachable.
 * In the Tauri app it must run after configureApiForTauri(), which installs
 * the Rust-side fetch the Tauri transport sends through.
 * Safe to call again (StrictMode runs effects twice); the previous install's
 * background work is stopped. Returns one sync pass (flush, then prefetch if
 * due) for tests and manual triggers.
 */
export const installOfflineSupport = (
  api: AxiosInstance,
  {
    store = createOfflineStore(),
    schedule = true,
    transport = createWebTransport(),
    locks = defaultLockManager,
  }: InstallOptions = {}
): (() => Promise<void>) => {
  stopPrevious?.();
  stopPrevious = undefined;

  // Only the user's changes: writes the app sent on its own still sync, but
  // aren't worth a badge or a warning.
  const changes = (entries: OutboxEntry[]) =>
    entries.filter(entry => !isBackgroundWrite(entry)).length;
  const refreshCounts = async () =>
    updateSyncStatus({
      pending: changes(await store.listOutbox()),
      failed: changes(await store.listFailed()),
    });
  void refreshCounts();
  // The other tabs of this origin keep their badges and stored ids in step:
  // queue and id changes are re-read from the shared stores, status flags
  // are applied without re-broadcasting (no echo loops).
  const channel = createOfflineChannel({
    onQueueChanged: () => void refreshCounts(),
    onIdsChanged: () => store.invalidateIdMap(),
    onStatusPatch: patch => updateSyncStatus(patch),
    // Signed out, or another user logged in: nothing on screen is theirs.
    onDataCleared: () => globalThis.location?.reload(),
  });
  setDefaultStatusPoster(patch => channel.post({ type: 'status', patch }));

  const flusher = createOutboxFlusher({
    store,
    replay: request => api.request({ ...request, offlineReplay: true }),
    onProgress: () => {
      void refreshCounts();
      channel.post({ type: 'queue-changed' });
    },
    onIdRecorded: () => channel.post({ type: 'ids-changed' }),
    onRejected: count => reportSyncProblem({ kind: 'rejected', count }),
    locks,
  });

  // Reads, writes and flushes wait for the latest claim (claimOfflineData),
  // so another user's stored data is never served, nor their queued writes
  // replayed, under this login. Replays don't wait themselves: the flush
  // sending them already did, and a claim waits for that flush's lock.
  let claimed: Promise<unknown> = Promise.resolve();
  const flush = async () => {
    await claimed;
    return flusher.flush();
  };
  flushNow = async () => {
    if (!canSync()) return false;
    await flush();
    return true;
  };

  // Holds `name` for `work`, waiting at most CLEAR_LOCK_WAIT_MS for it.
  const underLock = (name: string, work: () => Promise<void>) =>
    locks
      .request(name, { signal: AbortSignal.timeout(CLEAR_LOCK_WAIT_MS) }, work)
      .catch(error => {
        if (error instanceof DOMException && error.name === 'TimeoutError') {
          return work();
        }
        throw error;
      });
  const afterClear = async () => {
    updateSyncStatus({ sessionExpired: false });
    await refreshCounts();
    channel.post({ type: 'data-cleared' });
  };

  claimFor = userId => {
    const claim = (async () => {
      await claimed;
      const owner = await store.getMeta<string>(OWNER_KEY);
      if (owner === userId) return false;
      if (owner !== undefined) {
        // A flush still running would record its ids into the new store.
        // Only the flush lock: a prefetch request made after this point
        // carries no login (a 401) or the new user's, so what it stores is
        // never the old user's.
        await underLock(FLUSH_LOCK_NAME, () => store.clear());
        await afterClear();
      }
      await store.setMeta(OWNER_KEY, userId);
      return owner !== undefined;
    })();
    // A failed check mustn't block every request behind it.
    claimed = claim.catch(error =>
      console.error('Could not check whose offline data this is:', error)
    );
    return claim;
  };

  clearAll = async () => {
    await claimed;
    // A flush or prefetch still running would write the signed-out user's
    // ids and responses back after the clear.
    await underLock(FLUSH_LOCK_NAME, () =>
      underLock(PREFETCH_LOCK_NAME, () => store.clear())
    );
    await afterClear();
  };

  summarize = async () => ({
    events: (await store.listEvents()).length,
    coverage: (await store.getMeta<EventRange[]>(EVENT_COVERAGE_KEY)) ?? [],
  });

  const userId = storedUserId();
  if (userId !== undefined) {
    claimFor(userId).catch(() => undefined); // logged by the claim itself
  }

  // New connection settings get a fresh verdict from Cloudflare Access.
  updateSyncStatus({ accessDenied: false });

  api.defaults.fetchOptions = {
    ...api.defaults.fetchOptions,
    ...transport.fetchOptions,
  };
  const offlineAdapter = createOfflineAdapter({
    send: transport.send,
    requestTimeoutMs: transport.requestTimeoutMs,
    store,
    getUri: config => api.getUri(config),
    requestFlush: () => {
      if (canSync()) void flush();
    },
    onReachabilityChange: reachable => {
      // Every tab talks to the same backend, so the other badges follow
      // (otherwise they say "Syncing" until a request of their own fails).
      // Only changes are posted: this runs on every request.
      if (reachable !== getSyncStatus().reachable) {
        channel.post({ type: 'status', patch: { reachable } });
      }
      updateSyncStatus({ reachable });
    },
    onUnauthorized: config => {
      if (isLoginRequest(config) || getSyncStatus().sessionExpired) return;
      updateSyncStatus({ sessionExpired: true });
      channel.post({ type: 'status', patch: { sessionExpired: true } });
      reportSyncProblem({ kind: 'session-expired' });
    },
    onAccessDeniedChange: denied => {
      if (denied && !getSyncStatus().accessDenied) {
        reportSyncProblem({ kind: 'access-denied' });
      }
      updateSyncStatus({ accessDenied: denied });
      channel.post({ type: 'status', patch: { accessDenied: denied } });
    },
    onQueueChange: () => {
      void refreshCounts();
      channel.post({ type: 'queue-changed' });
    },
  });
  api.defaults.adapter = async config => {
    if (!config.offlineReplay) await claimed;
    return offlineAdapter(config);
  };

  // Prefetch only once the outbox is empty: refetching an event whose offline
  // edit hasn't synced yet would overwrite the stored copy with the server's
  // older one. While the backend is unreachable, each tick's prefetch attempt
  // doubles as the probe that notices it coming back, at which point
  // everything is refreshed straight away.
  //
  // The schedule lives in the meta store, shared by every tab, so one tab's
  // run covers the rest; nothing stored yet (a new device) means due. The
  // startup delay is this tab's own: it holds back even an overdue run.
  let prefetchNotBefore = Date.now() + PREFETCH_STARTUP_DELAY_MS;
  // A run takes minutes (its requests are spaced out) while ticks come
  // every FLUSH_INTERVAL_MS, so a tick can find this tab's run still going.
  let prefetching = false;
  const isPrefetchDue = async () => {
    const next = await store.getMeta<number>(NEXT_PREFETCH_AT_KEY);
    return next === undefined || Date.now() >= next;
  };
  const sync = async () => {
    const flushed = await flush();
    if (flushed !== 'drained') {
      if (flushed === 'unreachable') {
        // Refresh everything as soon as queued writes get through.
        prefetchNotBefore = 0;
        await store.setMeta(NEXT_PREFETCH_AT_KEY, 0);
      }
      return;
    }
    if (prefetching || Date.now() < prefetchNotBefore) return;
    if (!(await isPrefetchDue())) return;
    prefetching = true;
    try {
      // ifAvailable: skip while another tab is mid-run; its run reschedules.
      await locks.request(PREFETCH_LOCK_NAME, { ifAvailable: true }, async () => {
        // Again under the lock: a tab that got it just as another tab's run
        // finished would otherwise repeat that run.
        if (!(await isPrefetchDue())) return;
        const { outcome } = await prefetchCalendar({ api, store });
        await store.setMeta(
          NEXT_PREFETCH_AT_KEY,
          Date.now() +
            {
              complete: PREFETCH_INTERVAL_MS,
              failed: PREFETCH_INTERVAL_MS,
              throttled: PREFETCH_RETRY_MS,
              paused: PREFETCH_RETRY_MS,
              'access-denied': PREFETCH_RETRY_MS,
              // Syncing resumes once the user logs in again; refresh then.
              unauthorized: 0,
              unreachable: 0,
            }[outcome]
        );
      });
    } finally {
      prefetching = false;
    }
  };

  let schedulerStop: (() => void) | undefined;
  if (schedule) {
    schedulerStop = startSyncScheduler({
      sync,
      canSync,
      intervalMs: FLUSH_INTERVAL_MS,
    });
  }
  stopPrevious = () => {
    channel.close();
    setDefaultStatusPoster(undefined);
    schedulerStop?.();
    schedulerStop = undefined;
  };

  return sync;
};
