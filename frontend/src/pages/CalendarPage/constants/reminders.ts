/**
 * Reminder limits and presets.
 * Mirrors backend/src/calendar-events/domain/reminder.constants.ts.
 */

/** Maximum reminders allowed on a single event. */
export const MAX_REMINDERS_PER_EVENT = 5;

/** Maximum lead time for a reminder, in minutes (28 days). */
export const MAX_REMINDER_MINUTES = 40320;

export const MINUTES_PER_HOUR = 60;
export const MINUTES_PER_DAY = 1440;

export type ReminderUnit = 'minutes' | 'hours' | 'days';

export const PRESET_OPTIONS = {
  '15min': 15,
  '1hour': MINUTES_PER_HOUR,
  '1day': MINUTES_PER_DAY,
} as const;

export type ReminderPreset = keyof typeof PRESET_OPTIONS;

/** Offsets offered when adding a row, in the order they are suggested. */
export const PRESET_ORDER: readonly number[] = [
  PRESET_OPTIONS['15min'],
  PRESET_OPTIONS['1hour'],
  PRESET_OPTIONS['1day'],
];

export const convertToMinutes = (value: number, unit: ReminderUnit): number => {
  switch (unit) {
    case 'minutes':
      return value;
    case 'hours':
      return value * MINUTES_PER_HOUR;
    case 'days':
      return value * MINUTES_PER_DAY;
  }
};

/** Splits an offset back into the largest unit that divides it exactly. */
export const splitMinutes = (
  minutes: number
): { value: number; unit: ReminderUnit } => {
  if (minutes > 0 && minutes % MINUTES_PER_DAY === 0) {
    return { value: minutes / MINUTES_PER_DAY, unit: 'days' };
  }
  if (minutes > 0 && minutes % MINUTES_PER_HOUR === 0) {
    return { value: minutes / MINUTES_PER_HOUR, unit: 'hours' };
  }
  return { value: minutes, unit: 'minutes' };
};

export const formatReminderText = (minutes: number): string => {
  if (minutes === 0) {
    return 'At time of event';
  }
  const { value, unit } = splitMinutes(minutes);
  const singular = unit.slice(0, -1);
  return `${value} ${value === 1 ? singular : unit} before`;
};

/** The first preset not already in use, for defaulting a newly added row. */
export const nextAvailableOffset = (used: number[]): number => {
  const taken = new Set(used);
  const free = PRESET_ORDER.find(offset => !taken.has(offset));
  if (free !== undefined) {
    return free;
  }
  // Every preset is taken, so step past the largest offset in use.
  const largest = used.length > 0 ? Math.max(...used) : 0;
  return Math.min(largest + MINUTES_PER_DAY, MAX_REMINDER_MINUTES);
};
