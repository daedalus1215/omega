import {
  cancelAll,
  cancel,
  createChannel,
  Importance,
  isPermissionGranted,
  onAction,
  pending,
  requestPermission,
  Schedule,
  sendNotification,
  Visibility,
} from '@tauri-apps/plugin-notification';
import {
  createOfflineStore,
  type OfflineStore,
} from '../offline/offline-store';
import {
  planReminders,
  reconcileReminders,
  REMINDER_CHANNEL_ID,
  REMINDER_ICON,
  type ReminderExtra,
  type ReminderScheduler,
} from './reminder-notifications';

/**
 * The Android side of reminder notifications: the notification plugin and
 * the stored events. Imported dynamically, so Tauri's bindings stay out of
 * the web bundle.
 */

// Its own connection to offline mode's database, only ever read from. The
// offline layer is copied from Chronus and left as it is (specs/offline-apps.md, D4).
let store: OfflineStore | undefined;
const storedEvents = () => (store ??= createOfflineStore()).listEvents();

const scheduler: ReminderScheduler = {
  // Android hands back each notification's extra too; the type leaves it out.
  pending: () =>
    pending() as Promise<{ id: number; extra?: Record<string, unknown> }[]>,
  cancel,
  schedule: reminder =>
    sendNotification({
      id: reminder.id,
      channelId: REMINDER_CHANNEL_ID,
      title: reminder.title,
      body: reminder.body,
      icon: REMINDER_ICON,
      autoCancel: true,
      extra: reminder.extra,
      // allowWhileIdle: fire on time even in Doze, with the exact alarm
      // permission from AndroidManifest.xml.
      schedule: Schedule.at(reminder.at, false, true),
    }),
};

// One pass at a time, in order: a cancel-all after sign-out must land after
// any pass that was still scheduling.
let queue: Promise<unknown> = Promise.resolve();
const serially = <T>(work: () => Promise<T>): Promise<T> => {
  const next = queue.then(work, work);
  queue = next.catch(() => undefined);
  return next;
};

let queuedSync: Promise<void> | undefined;

/**
 * Schedules the stored events' reminders and cancels the rest. Calls made
 * while a pass waits to start share it; one made during a pass gets another,
 * which sees the newer data.
 */
export const syncReminders = (): Promise<void> => {
  queuedSync ??= serially(async () => {
    queuedSync = undefined;
    const plan = planReminders(await storedEvents(), Date.now());
    await reconcileReminders(plan, scheduler);
  });
  return queuedSync;
};

/** Signed out, or reminders turned off. */
export const cancelAllReminders = (): Promise<void> => serially(cancelAll);

export const countScheduledReminders = async (): Promise<number> =>
  (await pending()).length;

export const createReminderChannel = (): Promise<void> =>
  createChannel({
    id: REMINDER_CHANNEL_ID,
    name: 'Event reminders',
    description: 'The reminders set on your events',
    importance: Importance.High,
    visibility: Visibility.Private,
    vibration: true,
  });

export const hasReminderPermission = (): Promise<boolean> =>
  isPermissionGranted();

/**
 * Android 13 and later ask the user; once they've said no twice, Android
 * stops asking and this resolves false straight away.
 */
export const askForReminderPermission = async (): Promise<boolean> =>
  (await requestPermission()) === 'granted';

/**
 * Calls back with a tapped reminder's event. Only while the app is running:
 * Android starting the app from the tap reports it before anything listens.
 */
export const onReminderTapped = (
  handler: (extra: ReminderExtra) => void
): Promise<{ unregister: () => Promise<void> }> =>
  onAction(event => {
    const extra = event.notification?.extra as
      | Partial<ReminderExtra>
      | undefined;
    if (
      typeof extra?.eventId === 'number' &&
      typeof extra.startDate === 'string'
    ) {
      handler(extra as ReminderExtra);
    }
  });
