/**
 * Search result DTO for a one-time calendar event.
 */
export class OneTimeEventSearchResultDto {
  kind: 'one-time' = 'one-time';
  eventId: number;
  calendarId: number;
  title: string;
  color?: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Search result DTO for a recurring event series.
 * The next instance fields are only present when the series has an
 * upcoming occurrence.
 */
export class RecurringSeriesSearchResultDto {
  kind: 'recurring-series' = 'recurring-series';
  recurringEventId: number;
  calendarId: number;
  title: string;
  color?: string;
  nextInstanceId?: number;
  nextInstanceStartDate?: Date;
  nextInstanceEndDate?: Date;
}

/**
 * A single search result: either a one-time event or a recurring series.
 */
export type SearchCalendarEventsResultDto =
  | OneTimeEventSearchResultDto
  | RecurringSeriesSearchResultDto;
