import { useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/useAuth';
import { ROUTES } from '../constants/routes';
import type { CalendarRouteState } from '../pages/CalendarPage/calendar-route-state';
import { calendarEventKeys } from '../pages/CalendarPage/hooks/useCalendarEvents';
import {
  askForReminderPermission,
  cancelAllReminders,
  createReminderChannel,
  hasReminderPermission,
  onReminderTapped,
  syncReminders,
} from './reminder-device';
import {
  markPermissionAsked,
  useRemindersEnabled,
  wasPermissionAsked,
} from './reminder-setting';

/**
 * Picks up what a sync brought within this, while the app runs. A sync runs
 * every 30 minutes, so this is plenty.
 */
const RESYNC_INTERVAL_MS = 5 * 60_000;

/**
 * After a change in the app, so a burst of them (an event and its
 * reminders) makes one pass.
 */
const AFTER_CHANGE_DELAY_MS = 1_000;

/** Same as DesktopTray's: Tauri hands back its unsubscribe asynchronously. */
const cleanUpLater = (subscription: Promise<() => unknown>) => () => {
  void subscription.then(unsubscribe => unsubscribe());
};

const logFailure = (what: string) => (error: unknown) =>
  console.error(`Could not ${what}:`, error);

/**
 * Android-only, renders nothing: keeps the phone's scheduled reminder
 * notifications in line with the stored events, and opens an event when its
 * reminder is tapped (specs/app-reminder-notifications.md).
 */
export const ReminderNotifications: FC = () => {
  const { isAuthenticated } = useAuth();
  const enabled = useRemindersEnabled();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    createReminderChannel().catch(logFailure('create the reminder channel'));
  }, []);

  useEffect(
    () =>
      cleanUpLater(
        onReminderTapped(({ eventId, startDate }) => {
          const state: CalendarRouteState = {
            openEventId: eventId,
            openEventStartDate: startDate,
          };
          navigate(ROUTES.CALENDAR, { state });
        }).then(listener => () => listener.unregister())
      ),
    [navigate]
  );

  useEffect(() => {
    if (!isAuthenticated || !enabled) {
      // Signed out: another user's reminders mustn't go off here.
      cancelAllReminders().catch(logFailure('cancel the reminders'));
      return;
    }

    const resync = () =>
      void syncReminders().catch(logFailure('schedule the reminders'));

    // Asked once, on the first launch with reminders on. Settings offers it
    // again after a no.
    if (!wasPermissionAsked()) {
      markPermissionAsked();
      void hasReminderPermission()
        .then(granted => granted || askForReminderPermission())
        .catch(logFailure('ask for notification permission'));
    }

    resync();
    const interval = window.setInterval(resync, RESYNC_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') resync();
    };
    document.addEventListener('visibilitychange', onVisible);
    // Changes made in the app get scheduled straight away. An edit is in the
    // offline store by the time its mutation succeeds; a new event only once
    // the calendar refetches its list, which stores what comes back.
    let afterChange: number | undefined;
    const soon = () => {
      window.clearTimeout(afterChange);
      afterChange = window.setTimeout(resync, AFTER_CHANGE_DELAY_MS);
    };
    const unsubscribeMutations = queryClient
      .getMutationCache()
      .subscribe(event => {
        if (event.type === 'updated' && event.action.type === 'success') {
          soon();
        }
      });
    const unsubscribeQueries = queryClient.getQueryCache().subscribe(event => {
      if (
        event.type === 'updated' &&
        event.action.type === 'success' &&
        event.query.queryKey[0] === calendarEventKeys.all[0]
      ) {
        soon();
      }
    });

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(afterChange);
      document.removeEventListener('visibilitychange', onVisible);
      unsubscribeMutations();
      unsubscribeQueries();
    };
  }, [isAuthenticated, enabled, queryClient]);

  return null;
};
