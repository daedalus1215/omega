import axios, { type AxiosResponse } from 'axios';
import { defaultLockManager, type LockManager } from './locks';
import {
  isAccessDenied,
  isBackendUnreachable,
  isRateLimited,
} from './offline-errors';
import { isBackgroundWrite } from './offline-routes';
import type { OfflineStore, OutboxEntry } from './offline-store';
import { rewriteJsonIds, rewriteUrlIds } from './temp-ids';

/**
 * 'busy' means another tab held the flush lock past the wait budget; the
 * outbox is untouched and the next tick retries.
 */
export type FlushOutcome =
  'drained' | 'unreachable' | 'throttled' | 'unauthorized' | 'access-denied' | 'busy';

export type ReplayRequest = Pick<
  OutboxEntry,
  'method' | 'url' | 'params' | 'data'
>;

export type OutboxFlusherDeps = {
  store: OfflineStore;
  /** Sends a queued write to the backend, bypassing offline handling. */
  replay: (request: ReplayRequest) => Promise<AxiosResponse>;
  /** Tries before a write the server keeps erroring on is set aside. */
  maxAttempts?: number;
  /** Called after each entry is processed, successfully or not. */
  onProgress?: () => void;
  /** Called once per flush with how many writes it set aside, if any. */
  onRejected?: (count: number) => void;
  /**
   * Called when a temp id resolved to a real one; the other tabs must
   * re-read their id map to see it.
   */
  onIdRecorded?: () => void;
  /** Serializes flushes across tabs; defaults to navigator.locks. */
  locks?: LockManager;
  /** How long to wait for the flush lock before reporting 'busy'. */
  lockWaitMs?: number;
};

const RETRYABLE_STATUSES = new Set([408]);

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
// Two tabs share one outbox: without a lock, both would peek the same first
// entry and replay it twice.
export const FLUSH_LOCK_NAME = 'omega-offline-flush';
// Give up waiting this long for another tab's flush, then report 'busy'.
export const FLUSH_LOCK_WAIT_MS = 60_000;

/**
 * Replays queued writes in order. Stops (leaving the rest queued) when the
 * backend is unreachable, rate-limiting, the session has expired, or
 * Cloudflare Access rejects the connection settings; writes the server
 * rejects outright are moved to the `failed` store so one bad write can't
 * block everything behind it.
 */
export const createOutboxFlusher = ({
  store,
  replay,
  maxAttempts = 5,
  onProgress,
  onRejected,
  onIdRecorded,
  locks = defaultLockManager,
  lockWaitMs = FLUSH_LOCK_WAIT_MS,
}: OutboxFlusherDeps) => {
  let running: Promise<FlushOutcome> | undefined;
  let rerun = false;
  let rejected = 0;

  const drain = async (): Promise<FlushOutcome> => {
    for (;;) {
      const entry = await store.peekOutbox();
      if (!entry) {
        return 'drained';
      }
      const ids = await store.getIdMap();
      try {
        const response = await replay({
          method: entry.method,
          url: rewriteUrlIds(entry.url, ids),
          params: entry.params,
          data: rewriteJsonIds(entry.data, ids),
        });
        if (entry.tempId !== undefined) {
          const realId = (response.data as { id?: unknown } | undefined)?.id;
          if (typeof realId === 'number') {
            await store.recordId(entry.tempId, realId);
            onIdRecorded?.();
          } else {
            console.warn('Synced create returned no id:', entry, response.data);
          }
        }
        await store.removeFromOutbox(entry.seq);
      } catch (error) {
        if (isBackendUnreachable(error)) {
          return 'unreachable';
        }
        // Transient and not this write's fault: wait without spending one of
        // its attempts.
        if (isRateLimited(error)) {
          return 'throttled';
        }
        // Cloudflare never passed it to the server, so it's no verdict on
        // the write. Keep it queued until the connection settings are fixed.
        if (isAccessDenied(error)) {
          return 'access-denied';
        }
        const status = axios.isAxiosError(error)
          ? error.response?.status
          : undefined;
        if (status === 401) {
          return 'unauthorized';
        }
        const retryable =
          status !== undefined &&
          (RETRYABLE_STATUSES.has(status) || status >= 500);
        if (retryable && (await store.recordAttempt(entry.seq)) < maxAttempts) {
          return 'unreachable';
        }
        // Not the user's change (one the app sent on its own): there's
        // nothing for them to review or redo.
        if (isBackgroundWrite(entry)) {
          console.warn('Dropping a background write the server rejected:', {
            entry,
            status,
          });
          await store.removeFromOutbox(entry.seq);
          continue;
        }
        console.error('Setting aside a queued write the server rejected:', {
          entry,
          status,
        });
        await store.moveToFailed(entry, status, describeError(error));
        rejected++;
      } finally {
        onProgress?.();
      }
    }
  };

  // Hold the cross-tab lock for the whole drain so no other tab peeks the
  // same first entry while this one is replaying it. A wait that outlives
  // the budget reports 'busy' instead of ever replaying an entry twice.
  const lockedDrain = async (): Promise<FlushOutcome> => {
    try {
      const outcome = await locks.request(
        FLUSH_LOCK_NAME,
        { signal: AbortSignal.timeout(lockWaitMs) },
        () => drain()
      );
      return outcome === undefined ? 'busy' : outcome;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        return 'busy';
      }
      throw error;
    }
  };

  /**
   * Single-flight: concurrent calls share the running flush, and a call that
   * arrives mid-flush schedules one more pass so a write queued just after
   * the last peek isn't left waiting for the next trigger.
   */
  const flush = (): Promise<FlushOutcome> => {
    if (running) {
      rerun = true;
      return running;
    }
    running = (async () => {
      let outcome: FlushOutcome;
      rejected = 0;
      do {
        rerun = false;
        outcome = await lockedDrain();
      } while (rerun && outcome === 'drained');
      if (rejected > 0) onRejected?.(rejected);
      return outcome;
    })().finally(() => {
      running = undefined;
    });
    return running;
  };

  return { flush };
};
