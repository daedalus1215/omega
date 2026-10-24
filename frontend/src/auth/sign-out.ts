import type { SyncStatus } from '../offline/sync-status';

/**
 * Writes that signing out would delete: queued ones and ones the server
 * set aside. Any at all, and sign-out asks first.
 */
export const unsyncedChanges = ({
  pending,
  failed,
}: Pick<SyncStatus, 'pending' | 'failed'>): number => pending + failed;

export type SignOutSteps = {
  /** Drops the login token and the signed-in user. */
  logout: () => void;
  goToLogin: () => void;
  clearOfflineData: () => Promise<void>;
  clearQueryCache: () => void;
};

/**
 * Signs out and leaves none of the user's data on this device. The token
 * goes first, so background syncing stops sending; the login page goes up
 * before the query cache is emptied, so the screen being left doesn't
 * refetch everything it showed. A failed clear still empties the cache: the
 * user asked to be signed out.
 */
export const signOutAndClear = async ({
  logout,
  goToLogin,
  clearOfflineData,
  clearQueryCache,
}: SignOutSteps): Promise<void> => {
  logout();
  goToLogin();
  try {
    await clearOfflineData();
  } catch (error) {
    console.error('Could not clear offline data on sign-out:', error);
  }
  clearQueryCache();
};
