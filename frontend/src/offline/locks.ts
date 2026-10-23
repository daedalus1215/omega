export type LockOptions = {
  ifAvailable?: boolean;
  signal?: AbortSignal;
};

/**
 * Serializes work across tabs so the shared IndexedDB stores are never
 * worked on concurrently: one tab holds the flush lock while replaying
 * outbox entries, and only one tab runs the periodic prefetch. On platforms
 * without navigator.locks (single-window Tauri app, older browsers) see
 * createInMemoryLockManager.
 */
export type LockManager = {
  /**
   * Resolves with the callback's result, or with undefined when the lock
   * was not available (only possible with ifAvailable), in which case the
   * callback doesn't run.
   */
  request: <T>(
    name: string,
    options: LockOptions,
    callback: () => T | Promise<T>
  ) => Promise<T | undefined>;
};

type WebLocks = Pick<Navigator['locks'], 'request'>;

/**
 * navigator.locks behind LockManager. With ifAvailable, the Web Locks API
 * doesn't skip the callback while the lock is held: it calls it with null
 * instead of a lock. A callback that ignores its argument would run the
 * work anyway, so the null is checked here.
 */
export const fromWebLocks = (webLocks: WebLocks): LockManager => ({
  request: <T>(
    name: string,
    options: LockOptions,
    callback: () => T | Promise<T>
  ) =>
    webLocks.request(name, options, lock =>
      lock === null ? undefined : callback()
    ) as Promise<T | undefined>,
});

/**
 * For platforms without navigator.locks: one JS context, nothing to
 * coordinate with but itself. Callers already serialize their own work (the
 * flusher is single-flight, prefetch has its own in-flight guard), so this
 * only honors ifAvailable, giving up while the same lock is held here.
 */
export const createInMemoryLockManager = (): LockManager => {
  const holders = new Map<string, number>();
  return {
    request: async (name, { ifAvailable }, callback) => {
      const held = holders.get(name) ?? 0;
      if (ifAvailable && held > 0) return undefined;
      holders.set(name, held + 1);
      try {
        return await callback();
      } finally {
        const remaining = (holders.get(name) ?? 1) - 1;
        if (remaining > 0) holders.set(name, remaining);
        else holders.delete(name);
      }
    },
  };
};

export const defaultLockManager: LockManager =
  typeof navigator !== 'undefined' && navigator.locks !== undefined
    ? fromWebLocks(navigator.locks)
    : createInMemoryLockManager();
