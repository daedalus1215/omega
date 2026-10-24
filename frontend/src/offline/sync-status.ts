import { useSyncExternalStore } from 'react';

export type SyncStatus = {
  /** Whether the last request that reached the network got an answer. */
  reachable: boolean;
  /**
   * The user's writes waiting in the outbox. Background writes (ones the
   * app sends on its own) are queued too, but not counted.
   */
  pending: number;
  /** Writes the server rejected, set aside so they don't block the queue. */
  failed: number;
  /**
   * The backend turned the login token away (401). Stored data and queued
   * writes keep the app usable; syncing waits until the user logs in again.
   */
  sessionExpired: boolean;
  /**
   * Cloudflare Access turned requests away: this device's connection
   * settings (service token) aren't accepted. As with an expired session,
   * stored data and queued writes keep the app usable until they're fixed.
   */
  accessDenied: boolean;
};

// Deliberately free of IndexedDB/Tauri imports: the header reads this on
// every platform, and it just stays at the default wherever the offline
// layer isn't installed.
let status: SyncStatus = {
  reachable: true,
  pending: 0,
  failed: 0,
  sessionExpired: false,
  accessDenied: false,
};
const listeners = new Set<() => void>();

export const getSyncStatus = (): SyncStatus => status;

export const updateSyncStatus = (patch: Partial<SyncStatus>): void => {
  const next = { ...status, ...patch };
  if (
    (Object.keys(next) as (keyof SyncStatus)[]).every(
      key => next[key] === status[key]
    )
  ) {
    return;
  }
  status = next;
  listeners.forEach(listener => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useSyncStatus = (): SyncStatus =>
  useSyncExternalStore(subscribe, getSyncStatus);

/**
 * A sync failure worth telling the user about as it happens, even with the
 * window out of sight (the desktop app shows these as notifications).
 * - `rejected`: the server turned down queued writes during one sync run.
 * - `session-expired`: the login token stopped being accepted.
 * - `access-denied`: Cloudflare Access stopped accepting the connection
 *   settings.
 */
export type SyncProblem =
  | { kind: 'rejected'; count: number }
  | { kind: 'session-expired' }
  | { kind: 'access-denied' };

const problemListeners = new Set<(problem: SyncProblem) => void>();

export const reportSyncProblem = (problem: SyncProblem): void => {
  problemListeners.forEach(listener => listener(problem));
};

export const onSyncProblem = (
  listener: (problem: SyncProblem) => void
): (() => void) => {
  problemListeners.add(listener);
  return () => {
    problemListeners.delete(listener);
  };
};
