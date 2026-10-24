import { addPluginListener, invoke } from '@tauri-apps/api/core';
import {
  cancel as cancelPluginNotifications,
  isPermissionGranted,
  requestPermission,
} from '@tauri-apps/plugin-notification';
import {
  createOfflineStore,
  type OfflineStore,
} from '../offline/offline-store';
import {
  planReminders,
  reconcileReminders,
  type PlannedReminder,
  type ReminderPlan,
  type ReminderScheduler,
  type ReminderTap,
} from './reminder-notifications';

/**
 * The Android side of reminder notifications: the app's reminders plugin
 * (RemindersPlugin.kt), the notification permission, and the stored events.
 * Imported dynamically, so Tauri's bindings stay out of the web bundle.
 */

// Its own connection to offline mode's database, only ever read from. The
// offline layer is copied from Chronus and left as it is (specs/offline-apps.md, D4).
let store: OfflineStore | undefined;
const storedEvents = () => (store ??= createOfflineStore()).listEvents();

/** A reminder as RemindersPlugin.kt takes it (Reminder in ReminderAlarms.kt). */
const toAndroid = ({ id, at, title, body, extra }: PlannedReminder) => {
  const { eventId, startDate, signature } = extra;
  const tap: ReminderTap = { eventId, startDate };
  return {
    id,
    at: at.getTime(),
    start: Date.parse(startDate),
    title,
    body,
    signature,
    data: JSON.stringify(tap),
  };
};

const scheduler: ReminderScheduler = {
  pending: async () =>
    (
      await invoke<{ reminders: { id: number; signature: string }[] }>(
        'plugin:reminders|list'
      )
    ).reminders,
  cancel: ids => invoke('plugin:reminders|cancel', { ids }),
  schedule: reminders =>
    invoke('plugin:reminders|schedule', {
      reminders: reminders.map(toAndroid),
    }),
};

/**
 * Builds before this one scheduled reminders through the notification
 * plugin, which loses them on a restart. Until the phone restarts, those
 * alarms would go off alongside this build's, so they're cancelled once.
 */
const PLUGIN_ALARMS_CLEARED_KEY = 'omega.reminder-plugin-alarms-cleared';

const clearPluginAlarms = async (plan: ReminderPlan) => {
  if (localStorage.getItem(PLUGIN_ALARMS_CLEARED_KEY)) return;
  const ids = [...plan.signatures.keys()];
  if (ids.length > 0) await cancelPluginNotifications(ids);
  localStorage.setItem(PLUGIN_ALARMS_CLEARED_KEY, 'yes');
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
    await clearPluginAlarms(plan);
    await reconcileReminders(plan, scheduler);
  });
  return queuedSync;
};

/** Signed out, or reminders turned off. */
export const cancelAllReminders = (): Promise<void> =>
  serially(async () => {
    const ids = (await scheduler.pending()).map(reminder => reminder.id);
    if (ids.length > 0) await scheduler.cancel(ids);
  });

export const countScheduledReminders = async (): Promise<number> =>
  (await scheduler.pending()).length;

export const hasReminderPermission = (): Promise<boolean> =>
  isPermissionGranted();

/**
 * Android 13 and later ask the user; once they've said no twice, Android
 * stops asking and this resolves false straight away.
 */
export const askForReminderPermission = async (): Promise<boolean> =>
  (await requestPermission()) === 'granted';

const parseTap = (data: string | undefined): ReminderTap | undefined => {
  try {
    const tap = JSON.parse(data ?? 'null') as Partial<ReminderTap> | null;
    return typeof tap?.eventId === 'number' && typeof tap.startDate === 'string'
      ? { eventId: tap.eventId, startDate: tap.startDate }
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Calls back with each tapped reminder's event: the one that started the
 * app, if one did, and any tapped while it runs. Android keeps the tap until
 * it's taken, so it waits for this to listen.
 */
export const onReminderTapped = async (
  handler: (tap: ReminderTap) => void
): Promise<{ unregister: () => Promise<void> }> => {
  const takeTap = async () => {
    const { data } = await invoke<{ data?: string }>(
      'plugin:reminders|take_tap'
    );
    const tap = parseTap(data);
    if (tap) handler(tap);
  };
  const listener = await addPluginListener('reminders', 'tapped', () => {
    takeTap().catch(error =>
      console.error('Could not open the tapped reminder:', error)
    );
  });
  await takeTap();
  return listener;
};
