import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSyncStatus } from '../../../offline/sync-status';
import { calendarEventKeys } from './useCalendarEvents';
import { calendarKeys } from './useCalendars';

/**
 * Refetches the calendar once changes made offline have finished syncing
 * (in the Tauri app; nothing is ever pending on the web). The server's copy
 * then differs from what was shown: events created offline have real ids,
 * and a repeating event's real occurrences replace its placeholder
 * (specs/offline-apps.md, D8).
 */
export const useRefreshAfterSync = (): void => {
  const { pending } = useSyncStatus();
  const queryClient = useQueryClient();
  const previous = useRef(pending);

  useEffect(() => {
    if (previous.current > 0 && pending === 0) {
      void queryClient.invalidateQueries({ queryKey: calendarEventKeys.all });
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['event-reminders'] });
    }
    previous.current = pending;
  }, [pending, queryClient]);
};
