/**
 * Shared limits for event reminders.
 * Mirrored in frontend/src/pages/CalendarPage/constants/reminders.ts.
 */

/** Maximum reminders allowed on a single event. */
export const MAX_REMINDERS_PER_EVENT = 5;

/**
 * Maximum lead time for a reminder, in minutes (28 days).
 *
 * This doubles as the scheduler's forward scan bound: it only inspects events
 * starting within this window, so an offset larger than this could never fire.
 * The two values must stay equal.
 */
export const MAX_REMINDER_MINUTES = 40320;

/**
 * How late a missed reminder may still be delivered, in minutes.
 *
 * Covers deploys, restarts and slow ticks. Anything older is retired without
 * sending, so an outage does not release a flood of stale reminders.
 */
export const LATE_DELIVERY_GRACE_MINUTES = 60;

/**
 * A send this far behind schedule is flagged as late in the email body.
 * Below this, ordinary cron jitter would trigger a misleading notice.
 */
export const LATE_DELIVERY_NOTICE_SECONDS = 90;
