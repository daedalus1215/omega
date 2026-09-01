import { Test, TestingModule } from '@nestjs/testing';
import { SearchCalendarEventsTransactionScript } from '../search-calendar-events.transaction.script';
import { CalendarEventRepository } from '../../../../infra/repositories/calendar-event.repository';
import { RecurringEventRepository } from '../../../../infra/repositories/recurring-event.repository';
import { RecurrenceExceptionRepository } from '../../../../infra/repositories/recurrence-exception.repository';
import { RecurringEventToDomainConverter } from '../../create-recurring-event-TS/recurring-event-to-domain.converter';
import { generateInstanceDates } from '../../../utils/rrule-pattern.utils';
import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { RecurringEventEntity } from '../../../../infra/entities/recurring-event.entity';
import { CalendarEvent } from '../../../entities/calendar-event.entity';

jest.mock('../../../utils/rrule-pattern.utils', () => ({
  ...jest.requireActual('../../../utils/rrule-pattern.utils'),
  generateInstanceDates: jest.fn(),
}));

describe('SearchCalendarEventsTransactionScript', () => {
  let target: SearchCalendarEventsTransactionScript;
  let mockCalendarEventRepository: jest.Mocked<CalendarEventRepository>;
  let mockRecurringEventRepository: jest.Mocked<RecurringEventRepository>;
  let mockRecurrenceExceptionRepository: jest.Mocked<RecurrenceExceptionRepository>;
  let mockConverter: jest.Mocked<RecurringEventToDomainConverter>;
  let mockUser: AuthUser;

  const mockSeriesEntity: RecurringEventEntity = {
    id: 1,
    calendarId: 10,
    userId: 100,
    title: 'Weekly Standup',
    startDate: new Date('2024-01-15T10:00:00Z'),
    endDate: new Date('2024-01-15T11:00:00Z'),
    recurrenceType: 'WEEKLY',
    recurrenceInterval: 1,
    daysOfWeek: '1,3,5',
    noEndDate: true,
    rruleString: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const makeOneTimeEvent = (
    id: number,
    title: string,
    startDate: Date
  ): CalendarEvent => ({
    id,
    calendarId: 10,
    userId: 100,
    title,
    description: '',
    color: '#ff0000',
    startDate,
    endDate: new Date(startDate.getTime() + 3600000),
    isModified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const makeCommand = (query: string) => ({ query, user: mockUser });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser = { userId: 100, username: 'testuser' };

    mockCalendarEventRepository = {
      searchOneTimeEvents: jest.fn(),
    } as unknown as jest.Mocked<CalendarEventRepository>;

    mockRecurringEventRepository = {
      searchSeries: jest.fn(),
    } as unknown as jest.Mocked<RecurringEventRepository>;

    mockRecurrenceExceptionRepository = {
      findByRecurringEventId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<RecurrenceExceptionRepository>;

    mockConverter = {
      apply: jest.fn().mockImplementation((infra: RecurringEventEntity) => ({
        id: infra.id,
        calendarId: infra.calendarId,
        userId: infra.userId,
        title: infra.title,
        color: infra.color,
        startDate: infra.startDate,
        endDate: infra.endDate,
        recurrencePattern: { type: 'WEEKLY', interval: 1, daysOfWeek: [1, 3, 5] },
        noEndDate: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    } as unknown as jest.Mocked<RecurringEventToDomainConverter>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchCalendarEventsTransactionScript,
        {
          provide: CalendarEventRepository,
          useValue: mockCalendarEventRepository,
        },
        {
          provide: RecurringEventRepository,
          useValue: mockRecurringEventRepository,
        },
        {
          provide: RecurrenceExceptionRepository,
          useValue: mockRecurrenceExceptionRepository,
        },
        {
          provide: RecurringEventToDomainConverter,
          useValue: mockConverter,
        },
      ],
    }).compile();

    target = module.get<SearchCalendarEventsTransactionScript>(
      SearchCalendarEventsTransactionScript
    );
  });

  it('should be defined', () => {
    expect(target).toBeDefined();
  });

  it('should throw when the query is shorter than 2 characters after trim', async () => {
    await expect(target.apply(makeCommand(' a '), [10])).rejects.toThrow(
      'Query must be at least 2 characters'
    );
    expect(mockCalendarEventRepository.searchOneTimeEvents).not.toHaveBeenCalled();
    expect(mockRecurringEventRepository.searchSeries).not.toHaveBeenCalled();
  });

  it('should return an empty array when nothing matches', async () => {
    mockCalendarEventRepository.searchOneTimeEvents.mockResolvedValue([]);
    mockRecurringEventRepository.searchSeries.mockResolvedValue([]);

    const actual = await target.apply(makeCommand('meet'), [10]);

    expect(actual).toEqual([]);
  });

  it('should search one-time events and series with the trimmed query', async () => {
    mockCalendarEventRepository.searchOneTimeEvents.mockResolvedValue([]);
    mockRecurringEventRepository.searchSeries.mockResolvedValue([]);

    await target.apply(makeCommand('  meeting  '), [10, 11]);

    expect(mockCalendarEventRepository.searchOneTimeEvents).toHaveBeenCalledWith(
      [10, 11],
      'meeting'
    );
    expect(mockRecurringEventRepository.searchSeries).toHaveBeenCalledWith(
      [10, 11],
      'meeting'
    );
  });

  it('should order recurring series before one-time events', async () => {
    const oneTime = makeOneTimeEvent(
      5,
      'Standup Notes',
      new Date('2024-01-10T09:00:00Z')
    );
    mockCalendarEventRepository.searchOneTimeEvents.mockResolvedValue([oneTime]);
    mockRecurringEventRepository.searchSeries.mockResolvedValue([mockSeriesEntity]);
    (generateInstanceDates as jest.Mock).mockReturnValue([
      new Date('2024-01-15T10:00:00Z'),
    ]);

    const actual = await target.apply(makeCommand('standup'), [10]);

    expect(actual.map(result => result.kind)).toEqual([
      'recurring-series',
      'one-time',
    ]);
  });

  it('should order series by next occurrence ascending and put series without a next occurrence last', async () => {
    const seriesA = { ...mockSeriesEntity, id: 2, title: 'Series A' };
    const seriesB = { ...mockSeriesEntity, id: 3, title: 'Series B' };
    const seriesC = { ...mockSeriesEntity, id: 4, title: 'Series C' };
    mockCalendarEventRepository.searchOneTimeEvents.mockResolvedValue([]);
    mockRecurringEventRepository.searchSeries.mockResolvedValue([
      seriesA,
      seriesB,
      seriesC,
    ]);
    (generateInstanceDates as jest.Mock)
      .mockReturnValueOnce([new Date('2024-02-15T10:00:00Z')])
      .mockReturnValueOnce([new Date('2024-01-25T10:00:00Z')])
      .mockReturnValueOnce([]);

    const actual = await target.apply(makeCommand('series'), [10]);

    expect(
      actual.map(result =>
        result.kind === 'recurring-series' ? result.recurringEventId : -1
      )
    ).toEqual([3, 2, 4]);
    const noOccurrence = actual[2];
    if (noOccurrence.kind !== 'recurring-series') {
      throw new Error('Expected last result to be a recurring series');
    }
    expect(noOccurrence.nextOccurrenceDate).toBeUndefined();
    expect(noOccurrence.nextInstanceId).toBeUndefined();
  });

  it('should order one-time events by start date ascending', async () => {
    const earlier = makeOneTimeEvent(
      1,
      'Early',
      new Date('2024-01-10T09:00:00Z')
    );
    const later = makeOneTimeEvent(
      2,
      'Late',
      new Date('2024-01-20T09:00:00Z')
    );
    mockCalendarEventRepository.searchOneTimeEvents.mockResolvedValue([
      later,
      earlier,
    ]);
    mockRecurringEventRepository.searchSeries.mockResolvedValue([]);

    const actual = await target.apply(makeCommand('test'), [10]);

    expect(
      actual.map(result => (result.kind === 'one-time' ? result.eventId : -1))
    ).toEqual([1, 2]);
  });

  it('should limit results to 20 per category', async () => {
    const oneTimeEvents = Array.from({ length: 25 }, (_, i) =>
      makeOneTimeEvent(i, `Event ${i}`, new Date(`2024-02-${(i % 28) + 1}T09:00:00Z`))
    );
    const seriesEntities = Array.from({ length: 25 }, (_, i) => ({
      ...mockSeriesEntity,
      id: i + 1,
      title: `Series ${i}`,
    }));
    mockCalendarEventRepository.searchOneTimeEvents.mockResolvedValue(oneTimeEvents);
    mockRecurringEventRepository.searchSeries.mockResolvedValue(seriesEntities);
    (generateInstanceDates as jest.Mock).mockReturnValue([]);

    const actual = await target.apply(makeCommand('test'), [10]);

    expect(
      actual.filter(result => result.kind === 'recurring-series').length
    ).toBe(20);
    expect(actual.filter(result => result.kind === 'one-time').length).toBe(20);
  });

  it('should set the next occurrence date from the first generated instance', async () => {
    mockCalendarEventRepository.searchOneTimeEvents.mockResolvedValue([]);
    mockRecurringEventRepository.searchSeries.mockResolvedValue([mockSeriesEntity]);
    (generateInstanceDates as jest.Mock).mockReturnValue([
      new Date('2024-03-01T10:00:00Z'),
      new Date('2024-03-08T10:00:00Z'),
    ]);

    const actual = await target.apply(makeCommand('standup'), [10]);
    const series = actual[0];
    if (series.kind !== 'recurring-series') {
      throw new Error('Expected first result to be a recurring series');
    }

    expect(series.nextOccurrenceDate).toEqual(new Date('2024-03-01T10:00:00Z'));
  });

  it('should leave next occurrence undefined when the generator returns no dates', async () => {
    mockCalendarEventRepository.searchOneTimeEvents.mockResolvedValue([]);
    mockRecurringEventRepository.searchSeries.mockResolvedValue([mockSeriesEntity]);
    (generateInstanceDates as jest.Mock).mockReturnValue([]);

    const actual = await target.apply(makeCommand('standup'), [10]);
    const series = actual[0];
    if (series.kind !== 'recurring-series') {
      throw new Error('Expected first result to be a recurring series');
    }

    expect(series.nextOccurrenceDate).toBeUndefined();
  });

  it('should pass exception dates to the instance generator', async () => {
    mockCalendarEventRepository.searchOneTimeEvents.mockResolvedValue([]);
    mockRecurringEventRepository.searchSeries.mockResolvedValue([mockSeriesEntity]);
    const exceptionDate = new Date('2024-01-22T10:00:00Z');
    mockRecurrenceExceptionRepository.findByRecurringEventId.mockResolvedValue([
      { id: 1, recurringEventId: 1, exceptionDate, createdAt: new Date() },
    ]);
    (generateInstanceDates as jest.Mock).mockReturnValue([
      new Date('2024-01-29T10:00:00Z'),
    ]);

    await target.apply(makeCommand('standup'), [10]);

    expect(mockRecurrenceExceptionRepository.findByRecurringEventId).toHaveBeenCalledWith(1);
    expect(generateInstanceDates).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'WEEKLY' }),
      expect.any(Date),
      expect.any(Date),
      undefined,
      true,
      expect.arrayContaining([exceptionDate]),
      expect.any(Date),
      expect.any(Date)
    );
  });

  it('should map one-time event fields to the result', async () => {
    const oneTime = makeOneTimeEvent(
      7,
      'One-off Meeting',
      new Date('2024-05-05T14:00:00Z')
    );
    mockCalendarEventRepository.searchOneTimeEvents.mockResolvedValue([oneTime]);
    mockRecurringEventRepository.searchSeries.mockResolvedValue([]);

    const actual = await target.apply(makeCommand('one-off'), [10]);
    const result = actual[0];
    if (result.kind !== 'one-time') {
      throw new Error('Expected first result to be a one-time event');
    }

    expect(result.eventId).toBe(7);
    expect(result.calendarId).toBe(10);
    expect(result.title).toBe('One-off Meeting');
    expect(result.color).toBe('#ff0000');
    expect(result.startDate).toEqual(new Date('2024-05-05T14:00:00Z'));
    expect(result.endDate).toEqual(oneTime.endDate);
  });

  it('should map recurring series fields to the result', async () => {
    mockCalendarEventRepository.searchOneTimeEvents.mockResolvedValue([]);
    mockRecurringEventRepository.searchSeries.mockResolvedValue([mockSeriesEntity]);
    (generateInstanceDates as jest.Mock).mockReturnValue([
      new Date('2024-03-01T10:00:00Z'),
    ]);

    const actual = await target.apply(makeCommand('standup'), [10]);
    const series = actual[0];
    if (series.kind !== 'recurring-series') {
      throw new Error('Expected first result to be a recurring series');
    }

    expect(series.recurringEventId).toBe(1);
    expect(series.calendarId).toBe(10);
    expect(series.title).toBe('Weekly Standup');
    expect(series.recurrence.id).toBe(1);
  });
});
