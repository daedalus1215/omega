import { addDays, format, isSameDay } from 'date-fns';
import type { CalendarEventResponseDto } from '../api/dtos/calendar-events.dtos';

/**
 * Event reminders as Android notifications, scheduled on the phone from the
 * events offline mode stores (specs/app-reminder-notifications.md). The
 * server still emails them. This copy needs no push service, but it only
 * knows what the last sync brought.
 */

/** How far ahead reminders are scheduled. Every pass moves the window on. */
export const REMINDER_HORIZON_MS = 14 * 24 * 60 * 60_000;

/**
 * Android allows an app 500 pending alarms, one per scheduled notification.
 * Keep well clear of it, soonest first.
 */
export const MAX_SCHEDULED_REMINDERS = 200;

/**
 * Closer than this and the time could pass before Android has it, so the
 * reminder is left to the server's email.
 */
const MIN_LEAD_MS = 10_000;

export const REMINDER_CHANNEL_ID = 'reminders';

/** Status bar icon: res/drawable-*dpi/ic_stat_omega.png (npm run icons). */
export const REMINDER_ICON = 'ic_stat_omega';

/**
 * Notification ids are 32-bit. Server reminder ids are positive serials and
 * are used as they are; a reminder created offline has a negative temp id
 * until it syncs, and gets one from this range instead.
 */
const TEMP_ID_BASE = 1_500_000_000;
const TEMP_ID_SPAN = 600_000_000;

/** Travels with the notification, and comes back when it's tapped. */
export type ReminderExtra = {
  eventId: number;
  startDate: string;
  /**
   * Time and wording, to tell whether a pending notification still matches
   * its event.
   */
  signature: string;
};

export type PlannedReminder = {
  id: number;
  /** Always a whole second; see planReminders. */
  at: Date;
  title: string;
  body: string;
  extra: ReminderExtra;
};

export const notificationIdFor = (reminderId: number): number =>
  reminderId > 0
    ? reminderId
    : TEMP_ID_BASE + (Math.abs(reminderId) % TEMP_ID_SPAN);

const plural = (count: number, unit: string) =>
  `${count} ${unit}${count === 1 ? '' : 's'}`;

/** 90 → "1 hour 30 minutes", 1440 → "1 day". */
export const describeLeadTime = (minutes: number): string => {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  return [
    days > 0 && plural(days, 'day'),
    hours > 0 && plural(hours, 'hour'),
    rest > 0 && plural(rest, 'minute'),
  ]
    .filter(Boolean)
    .join(' ');
};

/**
 * The notification's text under the title: how long until the event, then
 * when it starts, as seen at the moment the notification shows.
 */
export const describeReminder = (
  minutes: number,
  start: Date,
  shownAt: Date
): string => {
  const lead =
    minutes === 0 ? 'Starting now' : `In ${describeLeadTime(minutes)}`;
  const time = format(start, 'h:mm a');
  const when = isSameDay(start, shownAt)
    ? time
    : isSameDay(start, addDays(shownAt, 1))
      ? `Tomorrow, ${time}`
      : `${format(start, 'EEE, MMM d')}, ${time}`;
  return `${lead} · ${when}`;
};

export type ReminderPlan = {
  /**
   * Reminders to have scheduled: due within the horizon, soonest first, up
   * to the cap.
   */
  due: PlannedReminder[];
  /**
   * The signature of every reminder on the stored events, by notification
   * id, whatever its time. A pending notification that still matches is
   * kept, even one whose time has just come that Android hasn't shown yet:
   * cancelling it would lose it.
   */
  signatures: Map<number, string>;
};

/** Works out, from the stored events, which reminders to have scheduled. */
export const planReminders = (
  events: CalendarEventResponseDto[],
  now: number
): ReminderPlan => {
  const due: PlannedReminder[] = [];
  const signatures = new Map<number, string>();
  for (const event of events) {
    const start = Date.parse(event.startDate);
    if (Number.isNaN(start)) continue;
    for (const reminder of event.reminders ?? []) {
      // Whole seconds: the plugin passes the time to Android as text with
      // nine decimal places, and Android reads all of them as milliseconds,
      // so any fraction would move the reminder by hours or days.
      const at =
        Math.floor((start - reminder.reminderMinutes * 60_000) / 1000) * 1000;
      const title = event.title.trim() || 'Untitled event';
      const body = describeReminder(
        reminder.reminderMinutes,
        new Date(start),
        new Date(at)
      );
      const id = notificationIdFor(reminder.id);
      const signature = `${at}|${title}|${body}`;
      signatures.set(id, signature);
      if (at < now + MIN_LEAD_MS || at > now + REMINDER_HORIZON_MS) continue;
      due.push({
        id,
        at: new Date(at),
        title,
        body,
        extra: { eventId: event.id, startDate: event.startDate, signature },
      });
    }
  }
  due.sort((a, b) => a.at.getTime() - b.at.getTime());
  return { due: due.slice(0, MAX_SCHEDULED_REMINDERS), signatures };
};

/** What reconcileReminders needs from the notification plugin. */
export type ReminderScheduler = {
  /**
   * Scheduled notifications that haven't shown yet. On Android the app
   * schedules nothing but reminders, so every one of them is a reminder.
   */
  pending: () => Promise<
    { id: number; extra?: Record<string, unknown> | null }[]
  >;
  cancel: (ids: number[]) => Promise<void>;
  schedule: (reminder: PlannedReminder) => void;
};

/**
 * Brings what Android has scheduled in line with the plan: cancels what
 * belongs to a reminder that's gone or changed, and schedules what's due but
 * missing. Unchanged ones are left alone, so running this often is cheap.
 */
export const reconcileReminders = async (
  plan: ReminderPlan,
  scheduler: ReminderScheduler
): Promise<{ scheduled: number; cancelled: number }> => {
  const pending = await scheduler.pending();
  const current = new Set(
    pending
      .filter(notification => {
        const signature = plan.signatures.get(notification.id);
        return (
          signature !== undefined && signature === notification.extra?.signature
        );
      })
      .map(notification => notification.id)
  );
  const stale = pending
    .map(notification => notification.id)
    .filter(id => !current.has(id));
  if (stale.length > 0) await scheduler.cancel(stale);
  const missing = plan.due.filter(reminder => !current.has(reminder.id));
  missing.forEach(reminder => scheduler.schedule(reminder));
  return { scheduled: missing.length, cancelled: stale.length };
};
