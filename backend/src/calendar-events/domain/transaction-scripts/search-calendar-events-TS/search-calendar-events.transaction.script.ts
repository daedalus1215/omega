import { Injectable } from '@nestjs/common';
import { addYears } from 'date-fns';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { RecurringEventRepository } from '../../../infra/repositories/recurring-event.repository';
import { RecurrenceExceptionRepository } from '../../../infra/repositories/recurrence-exception.repository';
import { RecurringEventEntity } from '../../../infra/entities/recurring-event.entity';
import { RecurringEvent } from '../../entities/recurring-event.entity';
import { RecurringEventToDomainConverter } from '../create-recurring-event-TS/recurring-event-to-domain.converter';
import { SearchCalendarEventsCommand } from './search-calendar-events.command';
import {
  CalendarEventSearchResult,
  OneTimeEventSearchResult,
  RecurringSeriesSearchResult,
} from './search-calendar-events.result';
import { generateInstanceDates } from '../../utils/rrule-pattern.utils';
import { startOfDayUTC } from '../../utils/date-utc.utils';

/** Maximum number of results returned per category (series and one-time). */
const SEARCH_RESULT_LIMIT = 20;
/** Years ahead to look for a series' next occurrence. */
const NEXT_OCCURRENCE_LOOKAHEAD_YEARS = 1;

/**
 * Compare two next-occurrence dates, placing series without an upcoming
 * occurrence after all series that have one.
 */
const compareNextOccurrenceDate = (
  a: Date | undefined,
  b: Date | undefined
): number => {
  const aTime = a?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const bTime = b?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
};

/**
 * Transaction script for searching calendar events by name.
 * Matches one-time events on title or description and recurring series on
 * title, using a case-insensitive substring of the query.
 * Returns series first (ordered by next occurrence) followed by one-time
 * events (ordered by start date).
 */
@Injectable()
export class SearchCalendarEventsTransactionScript {
  constructor(
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly recurringEventRepository: RecurringEventRepository,
    private readonly recurrenceExceptionRepository: RecurrenceExceptionRepository,
    private readonly recurringEventToDomainConverter: RecurringEventToDomainConverter
  ) {}

  /**
   * Search the caller's calendars for events matching the query.
   *
   * @param command - The search command with the query string
   * @param calendarIds - Calendar ids the caller can access
   * @returns Search results, series first then one-time events
   */
  async apply(
    command: SearchCalendarEventsCommand,
    calendarIds: number[]
  ): Promise<CalendarEventSearchResult[]> {
    const query = command.query.trim();
    if (query.length < 2) {
      throw new Error('Query must be at least 2 characters');
    }

    const [oneTimeEvents, seriesEntities] = await Promise.all([
      this.calendarEventRepository.searchOneTimeEvents(calendarIds, query),
      this.recurringEventRepository.searchSeries(calendarIds, query),
    ]);

    const seriesResults = await Promise.all(
      seriesEntities
        .slice(0, SEARCH_RESULT_LIMIT)
        .map(entity => this.buildSeriesResult(entity))
    );
    const oneTimeResults = oneTimeEvents
      .slice(0, SEARCH_RESULT_LIMIT)
      .map((event): OneTimeEventSearchResult => ({
        kind: 'one-time',
        eventId: event.id,
        calendarId: event.calendarId,
        title: event.title,
        color: event.color,
        startDate: event.startDate,
        endDate: event.endDate,
      }));

    const orderedSeries = seriesResults.sort((a, b) =>
      compareNextOccurrenceDate(a.nextOccurrenceDate, b.nextOccurrenceDate)
    );
    const orderedOneTime = oneTimeResults.sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );

    return [...orderedSeries, ...orderedOneTime];
  }

  /**
   * Build a search result for a recurring series, computing its next
   * upcoming occurrence within the next year.
   */
  private async buildSeriesResult(
    entity: RecurringEventEntity
  ): Promise<RecurringSeriesSearchResult> {
    const recurringEvent = this.recurringEventToDomainConverter.apply(entity);
    const exceptions =
      await this.recurrenceExceptionRepository.findByRecurringEventId(
        recurringEvent.id
      );
    const nextOccurrenceDate = this.findNextOccurrenceDate(
      recurringEvent,
      exceptions.map(ex => ex.exceptionDate)
    );
    return {
      kind: 'recurring-series',
      recurringEventId: recurringEvent.id,
      calendarId: recurringEvent.calendarId,
      title: recurringEvent.title,
      color: recurringEvent.color,
      nextOccurrenceDate,
      recurrence: recurringEvent,
    };
  }

  /**
   * Compute the first occurrence date on or after today (within the next
   * year), excluding exception (deleted instance) dates.
   */
  private findNextOccurrenceDate(
    recurringEvent: RecurringEvent,
    exceptionDates: Date[]
  ): Date | undefined {
    const rangeStart = startOfDayUTC(new Date());
    const rangeEnd = addYears(rangeStart, NEXT_OCCURRENCE_LOOKAHEAD_YEARS);
    const occurrenceDates = generateInstanceDates(
      recurringEvent.recurrencePattern,
      recurringEvent.startDate,
      recurringEvent.endDate,
      recurringEvent.recurrenceEndDate,
      recurringEvent.noEndDate,
      exceptionDates,
      rangeStart,
      rangeEnd
    );
    return occurrenceDates.length > 0 ? occurrenceDates[0] : undefined;
  }
}
