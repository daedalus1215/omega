import type { SyncProblem, SyncStatus } from '../offline/sync-status';

export type NotificationText = { title: string; body: string };

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

/** The tray menu's status line; same precedence as the header badge. */
export const describeSyncStatus = ({
  reachable,
  pending,
  failed,
  sessionExpired,
  accessDenied,
}: SyncStatus): string => {
  const waiting = pending > 0 ? ` · ${pending} pending` : '';
  if (accessDenied) return `Connection rejected${waiting}`;
  if (sessionExpired) return `Log in to sync${waiting}`;
  if (failed > 0) return `${plural(failed, 'change')} not saved${waiting}`;
  if (!reachable) return `Offline${waiting}`;
  if (pending > 0) return `Syncing ${plural(pending, 'change')}`;
  return 'All changes synced';
};

export const describeSyncProblem = (problem: SyncProblem): NotificationText => {
  switch (problem.kind) {
    case 'rejected':
      return {
        title: `${plural(problem.count, 'change')} couldn't be saved`,
        body: `The server rejected ${problem.count === 1 ? 'it' : 'them'} while syncing.`,
      };
    case 'session-expired':
      return {
        title: 'Log in to keep syncing',
        body: 'Your session expired. Changes are saved on this device until you log in again.',
      };
    case 'access-denied':
      return {
        title: 'Cloudflare rejected the connection',
        body: 'Changes are saved on this device. Update the connection settings in Omega to keep syncing.',
      };
  }
};

/**
 * The answer to "Sync now", once the attempt is over. `attempted` is false
 * when there was no session to sync with.
 */
export const describeSyncResult = (
  attempted: boolean,
  { reachable, pending, failed, sessionExpired, accessDenied }: SyncStatus
): NotificationText => {
  const saved =
    pending > 0 ? `${plural(pending, 'change')} saved on this device` : '';
  if (accessDenied) {
    const rejected = 'Cloudflare turned the connection settings away.';
    return {
      title: 'Connection rejected',
      body: saved ? `${rejected} ${saved}.` : rejected,
    };
  }
  if (sessionExpired) {
    return {
      title: 'Log in to sync',
      body: saved ? `Your session expired. ${saved}.` : 'Your session expired.',
    };
  }
  if (!attempted) {
    return { title: 'Log in to sync', body: 'Open Omega to log in.' };
  }
  if (!reachable) {
    return {
      title: "Can't reach the server",
      body: saved
        ? `${saved} will sync when it's back.`
        : "Nothing's waiting to sync.",
    };
  }
  if (pending > 0) {
    return {
      title: 'Still syncing',
      body: `${plural(pending, 'change')} waiting; retrying shortly.`,
    };
  }
  return {
    title: 'Up to date',
    body:
      failed > 0
        ? `Everything else is synced; ${plural(failed, 'change')} couldn't be saved.`
        : 'All changes are synced.',
  };
};
