export type SyncSchedulerDeps = {
  sync: () => Promise<unknown>;
  /** Syncing is skipped while this is false (e.g. logged out). */
  canSync: () => boolean;
  intervalMs: number;
};

/**
 * Runs `sync` now, whenever the OS reports connectivity returning, and on an
 * interval — the interval is what notices the backend itself coming back,
 * which no browser event reports. Returns a function that stops it.
 */
export const startSyncScheduler = ({
  sync,
  canSync,
  intervalMs,
}: SyncSchedulerDeps): (() => void) => {
  const tick = () => {
    if (!canSync()) return;
    sync().catch(err => console.error('Offline sync failed:', err));
  };

  window.addEventListener('online', tick);
  const timer = window.setInterval(tick, intervalMs);
  tick();

  return () => {
    window.removeEventListener('online', tick);
    window.clearInterval(timer);
  };
};
