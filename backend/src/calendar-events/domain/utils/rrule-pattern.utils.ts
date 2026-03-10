import { RRule, Frequency } from 'rrule';
import { RecurrencePattern } from '../entities/recurrence-pattern.value-object';

/**
 * Convert RecurrencePattern to RRule string (RFC 5545 format).
 *
 * @param pattern - The recurrence pattern to convert
 * @param startDate - The start date of the first occurrence
 * @param endDate - Optional end date for the series
 * @param noEndDate - Whether the series has no end date
 * @returns RFC 5545 RRULE string
 */
export const patternToRruleString = (
  pattern: RecurrencePattern,
  startDate: Date,
  endDate?: Date,
  noEndDate: boolean = false
): string => {
  const frequencyMap: Record<RecurrencePattern['type'], Frequency> = {
    DAILY: RRule.DAILY,
    WEEKLY: RRule.WEEKLY,
    MONTHLY: RRule.MONTHLY,
    YEARLY: RRule.YEARLY,
  };

  const options: RRule.Options = {
    freq: frequencyMap[pattern.type],
    interval: pattern.interval,
    dtstart: startDate,
  };

  // Handle weekly recurrence with specific days
  if (
    pattern.type === 'WEEKLY' &&
    pattern.daysOfWeek &&
    pattern.daysOfWeek.length > 0
  ) {
    // RRule uses 0=Monday, 6=Sunday, but our pattern uses 1=Monday, 7=Sunday
    options.byweekday = pattern.daysOfWeek.map(day => day - 1);
  }

  // Handle monthly recurrence with day of month
  if (pattern.type === 'MONTHLY' && pattern.dayOfMonth) {
    options.bymonthday = [pattern.dayOfMonth];
  }

  // Handle yearly recurrence with month and day
  if (pattern.type === 'YEARLY') {
    if (pattern.monthOfYear) {
      options.bymonth = [pattern.monthOfYear];
    }
    if (pattern.dayOfMonth) {
      options.bymonthday = [pattern.dayOfMonth];
    }
  }

  // Handle end date
  if (!noEndDate && endDate) {
    options.until = endDate;
  }

  const rrule = new RRule(options);
  return rrule.toString();
};

/**
 * Convert RRule string to RecurrencePattern.
 *
 * @param rruleString - RFC 5545 RRULE string
 * @param startDate - The start date of the first occurrence
 * @returns RecurrencePattern object
 */
export const rruleStringToPattern = (
  rruleString: string,
  _startDate: Date
): RecurrencePattern => {
  const rrule = RRule.fromString(rruleString);

  const frequencyMap: Partial<Record<Frequency, RecurrencePattern['type']>> = {
    [RRule.DAILY]: 'DAILY',
    [RRule.WEEKLY]: 'WEEKLY',
    [RRule.MONTHLY]: 'MONTHLY',
    [RRule.YEARLY]: 'YEARLY',
  };

  const type = frequencyMap[rrule.options.freq];
  if (!type) {
    throw new Error(`Unsupported frequency: ${rrule.options.freq}`);
  }
  const interval = rrule.options.interval ?? 1;

  const pattern: RecurrencePattern = {
    type,
    interval,
  };

  // Handle weekly recurrence with specific days
  if (type === 'WEEKLY' && rrule.options.byweekday) {
    // RRule uses 0=Monday, 6=Sunday, but our pattern uses 1=Monday, 7=Sunday
    const byweekday = rrule.options.byweekday;
    if (Array.isArray(byweekday)) {
      pattern.daysOfWeek = byweekday.map(day => {
        if (typeof day === 'number') {
          return day + 1;
        }
        // Weekday is a number in RRule
        return (day as unknown as number) + 1;
      });
    } else if (typeof byweekday === 'number') {
      pattern.daysOfWeek = [byweekday + 1];
    } else {
      // Weekday is a number in RRule
      pattern.daysOfWeek = [(byweekday as unknown as number) + 1];
    }
  }

  // Handle monthly recurrence with day of month
  if (type === 'MONTHLY' && rrule.options.bymonthday) {
    pattern.dayOfMonth = rrule.options.bymonthday[0];
  }

  // Handle yearly recurrence
  if (type === 'YEARLY') {
    if (rrule.options.bymonth) {
      pattern.monthOfYear = rrule.options.bymonth[0];
    }
    if (rrule.options.bymonthday) {
      pattern.dayOfMonth = rrule.options.bymonthday[0];
    }
  }

  return pattern;
};

/**
 * Generate event instances from a recurrence pattern for a given date range.
 *
 * @param pattern - The recurrence pattern
 * @param startDate - The start date of the first occurrence
 * @param endDate - The end date of the first occurrence
 * @param recurrenceEndDate - Optional end date for the series
 * @param noEndDate - Whether the series has no end date
 * @param exceptionDates - Array of dates to exclude from the series
 * @param rangeStart - Start of the date range to generate instances for
 * @param rangeEnd - End of the date range to generate instances for
 * @returns Array of dates representing instance start dates
 */
export const generateInstanceDates = (
  pattern: RecurrencePattern,
  startDate: Date,
  endDate: Date,
  recurrenceEndDate: Date | undefined,
  noEndDate: boolean,
  exceptionDates: Date[],
  rangeStart: Date,
  rangeEnd: Date
): Date[] => {
  const rruleString = patternToRruleString(
    pattern,
    startDate,
    recurrenceEndDate,
    noEndDate
  );
  const rrule = RRule.fromString(rruleString);

  // Generate instances for the date range
  const instances = rrule.between(rangeStart, rangeEnd, true);

  // Filter out exception dates
  // Ensure all exception dates are Date objects (handle both Date and string)
  const exceptionDateStrings = exceptionDates.map(date => {
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toISOString().split('T')[0];
  });
  return instances.filter(date => {
    const dateString = date.toISOString().split('T')[0];
    return !exceptionDateStrings.includes(dateString);
  });
};
