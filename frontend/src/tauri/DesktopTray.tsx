import { useEffect, type FC } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { onAction, sendNotification } from '@tauri-apps/plugin-notification';
import { syncNow } from '../offline/install-offline-support';
import {
  getSyncStatus,
  onSyncProblem,
  useSyncStatus,
} from '../offline/sync-status';
import {
  describeSyncProblem,
  describeSyncResult,
  describeSyncStatus,
} from './tray-messages';

// Emitted by the tray menu; see src-tauri/src/tray.rs.
const SYNC_NOW_EVENT = 'tray-sync-now';

/**
 * Tauri hands back its unsubscribe function asynchronously. This still tears
 * the subscription down when the effect is cleaned up first, which
 * StrictMode does straight away.
 */
const cleanUpLater = (subscription: Promise<() => unknown>) => () => {
  void subscription.then(unsubscribe => unsubscribe());
};

/**
 * Desktop-only, renders nothing: keeps the tray menu's status line current,
 * answers its "Sync now", and shows sync failures as system notifications.
 * Clicking a notification brings the window back.
 */
export const DesktopTray: FC = () => {
  const queryClient = useQueryClient();
  const statusLine = describeSyncStatus(useSyncStatus());

  useEffect(() => {
    invoke('set_tray_status', { text: statusLine }).catch(err =>
      console.error('Failed to update the tray status:', err)
    );
  }, [statusLine]);

  useEffect(
    () =>
      onSyncProblem(problem => sendNotification(describeSyncProblem(problem))),
    []
  );

  useEffect(() => {
    const handleSyncNow = async () => {
      try {
        const attempted = await syncNow();
        // Also fetch the latest for what's on screen. With nothing queued,
        // that's what finds out whether the server is there at all.
        if (attempted) await queryClient.refetchQueries({ type: 'active' });
        sendNotification(describeSyncResult(attempted, getSyncStatus()));
      } catch (err) {
        console.error('Sync from the tray failed:', err);
      }
    };
    return cleanUpLater(listen(SYNC_NOW_EVENT, handleSyncNow));
  }, [queryClient]);

  useEffect(
    () =>
      cleanUpLater(
        onAction(() => void invoke('show_main_window')).then(
          listener => () => listener.unregister()
        )
      ),
    []
  );

  return null;
};
