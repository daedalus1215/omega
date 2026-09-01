import { SearchCalendarEventsResponder } from '../search-calendar-events.responder';
import {
  CalendarEventSearchResult,
  OneTimeEventSearchResult,
  RecurringSeriesSearchResult,
} from '../../../../domain/transaction-scripts/search-calendar-events-TS/search-calendar-events.result';
import { RecurringEvent } from '../../../../domain/entities/recurring-event.entity';

describe('SearchCalendarEventsResponder', () => {
  let target: SearchCalendarEventsResponder;
  let mockRecurrence: RecurringEvent;

  const makeOneTimeResult = (
    overrides: Partial<OneTimeEventSearchResult> = {}
  ): OneTimeEventSearchResult => ({
    kind: 'one-time',
    eventId: 42,
    calendarId: 10,
    title: 'Q3 Offsite Planning',
    color: '#ff0000',
    startDate: new Date('2026-09-07T10:00:00Z'),
    endDate: new Date('2026-09-07T11:00:00Z'),
    ...overrides,
  });

  const makeSeriesResult = (
    overrides: Partial<RecurringSeriesSearchResult> = {}
  ): RecurringSeriesSearchResult => ({
    kind: 'recurring-series',
    recurringEventId: 7,
    calendarId: 10,
    title: 'Zebra Standing Meeting',
    color: undefined,
    nextOccurrenceDate: new Date('2026-09-02T09:00:00Z'),
    recurrence: mockRecurrence,
    nextInstanceId: 420,
    nextInstanceStartDate: new Date('2026-09-02T09:00:00Z'),
    nextInstanceEndDate: new Date('2026-09-02T09:30:00Z'),
    ...overrides,
  });

  beforeEach(() => {
    target = new SearchCalendarEventsResponder();
    mockRecurrence = { id: 7 } as RecurringEvent;
  });

  it('maps a one-time result to a one-time DTO with all fields', () => {
    const inputResult = makeOneTimeResult();

    const [actualDto] = target.apply([inputResult]);

    const expectedDto = {
      kind: 'one-time',
      eventId: 42,
      calendarId: 10,
      title: 'Q3 Offsite Planning',
      color: '#ff0000',
      startDate: inputResult.startDate,
      endDate: inputResult.endDate,
    };
    expect(actualDto).toEqual(expectedDto);
  });

  it('maps a recurring series result with its next instance', () => {
    const inputResult = makeSeriesResult();

    const [actualDto] = target.apply([inputResult]);

    const expectedDto = {
      kind: 'recurring-series',
      recurringEventId: 7,
      calendarId: 10,
      title: 'Zebra Standing Meeting',
      color: undefined,
      nextInstanceId: 420,
      nextInstanceStartDate: inputResult.nextInstanceStartDate,
      nextInstanceEndDate: inputResult.nextInstanceEndDate,
    };
    expect(actualDto).toEqual(expectedDto);
  });

  it('omits next instance fields for a series with no upcoming occurrence', () => {
    const inputResult = makeSeriesResult({
      nextOccurrenceDate: undefined,
      nextInstanceId: undefined,
      nextInstanceStartDate: undefined,
      nextInstanceEndDate: undefined,
    });

    const [actualDto] = target.apply([inputResult]);

    expect(actualDto).toEqual({
      kind: 'recurring-series',
      recurringEventId: 7,
      calendarId: 10,
      title: 'Zebra Standing Meeting',
      color: undefined,
      nextInstanceId: undefined,
      nextInstanceStartDate: undefined,
      nextInstanceEndDate: undefined,
    });
    expect(actualDto).not.toHaveProperty('recurrence');
  });

  it('preserves result order for a mixed list', () => {
    const inputResults: CalendarEventSearchResult[] = [
      makeSeriesResult({ recurringEventId: 1 }),
      makeSeriesResult({ recurringEventId: 2 }),
      makeOneTimeResult({ eventId: 3 }),
    ];

    const actualDtos = target.apply(inputResults);

    expect(actualDtos.map(dto => (dto as { eventId?: number }).eventId ?? (dto as { recurringEventId?: number }).recurringEventId)).toEqual([1, 2, 3]);
    expect(actualDtos[0].kind).toBe('recurring-series');
    expect(actualDtos[2].kind).toBe('one-time');
  });

  it('maps an empty list to an empty list', () => {
    expect(target.apply([])).toEqual([]);
  });
});
