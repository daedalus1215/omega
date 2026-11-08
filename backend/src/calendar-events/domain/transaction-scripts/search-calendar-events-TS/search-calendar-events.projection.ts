import { RecurringEvent } from '../../entities/recurring-event.entity';

/**
 * Search result for a one-time calendar event.
 */
export type OneTimeEventSearchResult = {
  kind: 'one-time';
  eventId: number;
  calendarId: number;
  title: string;
  color?: string;
  startDate: Date;
  endDate: Date;
};

/**
 * Search result for a recurring event series.
 * Carries the domain entity so the service layer can materialize the next
 * instance and fill in its id and dates.
 */
export type RecurringSeriesSearchResult = {
  kind: 'recurring-series';
  recurringEventId: number;
  calendarId: number;
  title: string;
  color?: string;
  /** First upcoming occurrence date (within the next year), if any. */
  nextOccurrenceDate?: Date;
  /** Series domain entity, used to materialize the next instance. */
  recurrence: RecurringEvent;
  nextInstanceId?: number;
  nextInstanceStartDate?: Date;
  nextInstanceEndDate?: Date;
};

/**
 * A single search result: either a one-time event or a recurring series.
 */
export type CalendarEventSearchResult =
  | OneTimeEventSearchResult
  | RecurringSeriesSearchResult;
