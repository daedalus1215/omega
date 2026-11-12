import { format, isValid, parseISO } from 'date-fns';

// The value format of a datetime-local input, read as local time.
const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";
const MS_PER_MINUTE = 60 * 1000;
const DEFAULT_FALLBACK_DURATION_MINUTES = 60;

type ShiftEventEndOptions = {
  previousStart: string;
  previousEnd: string;
  nextStart: string;
  fallbackDurationMinutes?: number;
};

const parseLocal = (value: string): Date | null => {
  if (!value) {
    return null;
  }
  const date = parseISO(value);
  return isValid(date) ? date : null;
};

/**
 * The end an event form should show once its start moves from `previousStart`
 * to `nextStart`, so the end follows the start instead of being left behind.
 *
 * - The event keeps its length: the end moves by as much as the start did.
 * - Without a usable previous range (a blank start, or an end not after the
 *   start), the previous end is kept if it is still after the new start,
 *   otherwise the end lands `fallbackDurationMinutes` after it.
 * - While the new start is incomplete (a datetime-local input reports ''),
 *   the end is left alone.
 *
 * All values are datetime-local strings (yyyy-MM-ddTHH:mm, local time).
 */
export const shiftEventEnd = ({
  previousStart,
  previousEnd,
  nextStart,
  fallbackDurationMinutes = DEFAULT_FALLBACK_DURATION_MINUTES,
}: ShiftEventEndOptions): string => {
  const start = parseLocal(nextStart);
  if (!start) {
    return previousEnd;
  }

  const oldStart = parseLocal(previousStart);
  const oldEnd = parseLocal(previousEnd);

  if (oldStart && oldEnd && oldEnd > oldStart) {
    const durationMs = oldEnd.getTime() - oldStart.getTime();
    return format(
      new Date(start.getTime() + durationMs),
      DATETIME_LOCAL_FORMAT
    );
  }

  if (oldEnd && oldEnd > start) {
    return previousEnd;
  }

  return format(
    new Date(start.getTime() + fallbackDurationMinutes * MS_PER_MINUTE),
    DATETIME_LOCAL_FORMAT
  );
};
