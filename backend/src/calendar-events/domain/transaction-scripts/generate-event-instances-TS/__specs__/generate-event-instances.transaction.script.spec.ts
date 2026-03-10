import { Test, TestingModule } from '@nestjs/testing';
import { GenerateEventInstancesTransactionScript } from '../generate-event-instances.transaction.script';
import { CalendarEventRepository } from '../../../../infra/repositories/calendar-event.repository';
import { RecurrenceExceptionRepository } from '../../../../infra/repositories/recurrence-exception.repository';
import { generateInstanceDates } from '../../../../domain/utils/rrule-pattern.utils';
import { RecurringEvent } from '../../../../domain/entities/recurring-event.entity';
import { CalendarEvent } from '../../../../domain/entities/calendar-event.entity';
import {
  createLoggerMock,
  createMock,
  generateRandomNumbers,
} from 'src/shared-kernel/test-utils';
import { startOfDay, addDays, addYears } from 'date-fns';
import { Logger } from 'nestjs-pino';

jest.mock('../../../../domain/utils/rrule-pattern.utils');

describe('GenerateEventInstancesTransactionScript', () => {
  let target: GenerateEventInstancesTransactionScript;
  let mockCalendarEventRepository: jest.Mocked<CalendarEventRepository>;
  let mockRecurrenceExceptionRepository: jest.Mocked<RecurrenceExceptionRepository>;

  const mockRecurringEvent: RecurringEvent = {
    id: generateRandomNumbers(),
    userId: generateRandomNumbers(),
    title: 'Test Recurring Event',
    description: 'Test Description',
    startDate: new Date('2024-01-15T10:00:00Z'),
    endDate: new Date('2024-01-15T11:00:00Z'),
    recurrencePattern: {
      type: 'WEEKLY',
      interval: 1,
      daysOfWeek: [1, 3, 5],
    },
    recurrenceEndDate: new Date('2024-12-31T23:59:59Z'),
    noEndDate: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockCalendarEventRepository = createMock<CalendarEventRepository>({
      create: jest.fn(),
      createInstance: jest.fn(),
      findByRecurringEventId: jest.fn(),
      findByDateRange: jest.fn(),
      findByRecurringEventIdAndDateRange: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    });

    mockRecurrenceExceptionRepository =
      createMock<RecurrenceExceptionRepository>({
        create: jest.fn(),
        findByRecurringEventId: jest.fn(),
        delete: jest.fn(),
      });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerateEventInstancesTransactionScript,
        {
          provide: Logger,
          useValue: createLoggerMock(),
        },
        {
          provide: CalendarEventRepository,
          useValue: mockCalendarEventRepository,
        },
        {
          provide: RecurrenceExceptionRepository,
          useValue: mockRecurrenceExceptionRepository,
        },
      ],
    }).compile();

    target = module.get<GenerateEventInstancesTransactionScript>(
      GenerateEventInstancesTransactionScript
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('apply', () => {
    it('should generate daily recurrence instances correctly', async () => {
      const recurringEvent: RecurringEvent = {
        ...mockRecurringEvent,
        recurrencePattern: {
          type: 'DAILY',
          interval: 1,
        },
      };

      const rangeStart = new Date('2024-01-15T00:00:00Z');
      const rangeEnd = new Date('2024-01-22T23:59:59Z');
      const instanceDates = [
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-16T10:00:00Z'),
        new Date('2024-01-17T10:00:00Z'),
        new Date('2024-01-18T10:00:00Z'),
        new Date('2024-01-19T10:00:00Z'),
        new Date('2024-01-20T10:00:00Z'),
        new Date('2024-01-21T10:00:00Z'),
      ];

      (generateInstanceDates as jest.Mock).mockReturnValue(instanceDates);
      mockRecurrenceExceptionRepository.findByRecurringEventId.mockResolvedValue(
        []
      );
      mockCalendarEventRepository.findByRecurringEventId.mockResolvedValue([]);
      mockCalendarEventRepository.createInstance.mockImplementation(
        async (instance: Partial<CalendarEvent>) => {
          return {
            id: generateRandomNumbers(),
            ...instance,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as CalendarEvent;
        }
      );

      const result = await target.apply(recurringEvent, rangeStart, rangeEnd);

      expect(result).toHaveLength(7);
      expect(generateInstanceDates).toHaveBeenCalledWith(
        recurringEvent.recurrencePattern,
        recurringEvent.startDate,
        recurringEvent.endDate,
        recurringEvent.recurrenceEndDate,
        recurringEvent.noEndDate,
        [],
        rangeStart,
        rangeEnd
      );
      expect(mockCalendarEventRepository.createInstance).toHaveBeenCalledTimes(
        7
      );
    });

    it('should generate weekly recurrence with specific days correctly', async () => {
      const recurringEvent: RecurringEvent = {
        ...mockRecurringEvent,
        recurrencePattern: {
          type: 'WEEKLY',
          interval: 1,
          daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
        },
      };

      const rangeStart = new Date('2024-01-15T00:00:00Z');
      const rangeEnd = new Date('2024-01-26T23:59:59Z');
      const instanceDates = [
        new Date('2024-01-15T10:00:00Z'), // Monday
        new Date('2024-01-17T10:00:00Z'), // Wednesday
        new Date('2024-01-19T10:00:00Z'), // Friday
        new Date('2024-01-22T10:00:00Z'), // Monday
        new Date('2024-01-24T10:00:00Z'), // Wednesday
        new Date('2024-01-26T10:00:00Z'), // Friday
      ];

      (generateInstanceDates as jest.Mock).mockReturnValue(instanceDates);
      mockRecurrenceExceptionRepository.findByRecurringEventId.mockResolvedValue(
        []
      );
      mockCalendarEventRepository.findByRecurringEventId.mockResolvedValue([]);
      mockCalendarEventRepository.createInstance.mockImplementation(
        async (instance: Partial<CalendarEvent>) => {
          return {
            id: generateRandomNumbers(),
            ...instance,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as CalendarEvent;
        }
      );

      const result = await target.apply(recurringEvent, rangeStart, rangeEnd);

      expect(result).toHaveLength(6);
      expect(mockCalendarEventRepository.createInstance).toHaveBeenCalledTimes(
        6
      );
    });

    it('should generate monthly recurrence instances correctly', async () => {
      const recurringEvent: RecurringEvent = {
        ...mockRecurringEvent,
        recurrencePattern: {
          type: 'MONTHLY',
          interval: 1,
          dayOfMonth: 15,
        },
      };

      const rangeStart = new Date('2024-01-15T00:00:00Z');
      const rangeEnd = new Date('2024-04-15T23:59:59Z');
      const instanceDates = [
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-02-15T10:00:00Z'),
        new Date('2024-03-15T10:00:00Z'),
        new Date('2024-04-15T10:00:00Z'),
      ];

      (generateInstanceDates as jest.Mock).mockReturnValue(instanceDates);
      mockRecurrenceExceptionRepository.findByRecurringEventId.mockResolvedValue(
        []
      );
      mockCalendarEventRepository.findByRecurringEventId.mockResolvedValue([]);
      mockCalendarEventRepository.createInstance.mockImplementation(
        async (instance: Partial<CalendarEvent>) => {
          return {
            id: generateRandomNumbers(),
            ...instance,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as CalendarEvent;
        }
      );

      const result = await target.apply(recurringEvent, rangeStart, rangeEnd);

      expect(result).toHaveLength(4);
      expect(mockCalendarEventRepository.createInstance).toHaveBeenCalledTimes(
        4
      );
    });

    it('should generate yearly recurrence instances correctly', async () => {
      const recurringEvent: RecurringEvent = {
        ...mockRecurringEvent,
        recurrencePattern: {
          type: 'YEARLY',
          interval: 1,
          monthOfYear: 1,
          dayOfMonth: 15,
        },
      };

      const rangeStart = new Date('2024-01-15T00:00:00Z');
      const rangeEnd = new Date('2027-01-15T23:59:59Z');
      const instanceDates = [
        new Date('2024-01-15T10:00:00Z'),
        new Date('2025-01-15T10:00:00Z'),
        new Date('2026-01-15T10:00:00Z'),
        new Date('2027-01-15T10:00:00Z'),
      ];

      (generateInstanceDates as jest.Mock).mockReturnValue(instanceDates);
      mockRecurrenceExceptionRepository.findByRecurringEventId.mockResolvedValue(
        []
      );
      mockCalendarEventRepository.findByRecurringEventId.mockResolvedValue([]);
      mockCalendarEventRepository.createInstance.mockImplementation(
        async (instance: Partial<CalendarEvent>) => {
          return {
            id: generateRandomNumbers(),
            ...instance,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as CalendarEvent;
        }
      );

      const result = await target.apply(recurringEvent, rangeStart, rangeEnd);

      expect(result).toHaveLength(4);
      expect(mockCalendarEventRepository.createInstance).toHaveBeenCalledTimes(
        4
      );
    });

    it('should generate instances up to 2 years ahead for "no end date" series', async () => {
      const recurringEvent: RecurringEvent = {
        ...mockRecurringEvent,
        recurrencePattern: {
          type: 'DAILY',
          interval: 1,
        },
        recurrenceEndDate: undefined,
        noEndDate: true,
      };

      const rangeStart = new Date('2024-01-15T00:00:00Z');
      const rangeEnd = addYears(rangeStart, 2);

      const instanceDates = Array.from({ length: 730 }, (_, i) =>
        addDays(rangeStart, i)
      );

      (generateInstanceDates as jest.Mock).mockReturnValue(instanceDates);
      mockRecurrenceExceptionRepository.findByRecurringEventId.mockResolvedValue(
        []
      );
      mockCalendarEventRepository.findByRecurringEventId.mockResolvedValue([]);
      mockCalendarEventRepository.createInstance.mockImplementation(
        async (instance: Partial<CalendarEvent>) => {
          return {
            id: generateRandomNumbers(),
            ...instance,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as CalendarEvent;
        }
      );

      const result = await target.apply(recurringEvent, rangeStart, rangeEnd);

      expect(result.length).toBeGreaterThan(0);
      expect(generateInstanceDates).toHaveBeenCalledWith(
        recurringEvent.recurrencePattern,
        recurringEvent.startDate,
        recurringEvent.endDate,
        undefined,
        true,
        [],
        rangeStart,
        rangeEnd
      );
    });

    it('should exclude exception dates from generated instances', async () => {
      const recurringEvent: RecurringEvent = {
        ...mockRecurringEvent,
        recurrencePattern: {
          type: 'DAILY',
          interval: 1,
        },
      };

      const rangeStart = new Date('2024-01-15T00:00:00Z');
      const rangeEnd = new Date('2024-01-22T23:59:59Z');
      const exceptionDate = startOfDay(new Date('2024-01-17T00:00:00Z'));

      mockRecurrenceExceptionRepository.findByRecurringEventId.mockResolvedValue(
        [
          {
            id: generateRandomNumbers(),
            recurringEventId: recurringEvent.id,
            exceptionDate,
            createdAt: new Date(),
          },
        ]
      );

      // generateInstanceDates should exclude the exception date (2024-01-17)
      // So the mock should return dates WITHOUT the exception date
      const instanceDates = [
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-16T10:00:00Z'),
        // 2024-01-17 is excluded by generateInstanceDates when given exception dates
        new Date('2024-01-18T10:00:00Z'),
      ];

      (generateInstanceDates as jest.Mock).mockReturnValue(instanceDates);
      mockCalendarEventRepository.findByRecurringEventId.mockResolvedValue([]);
      mockCalendarEventRepository.createInstance.mockImplementation(
        async (instance: Partial<CalendarEvent>) => {
          return {
            id: generateRandomNumbers(),
            ...instance,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as CalendarEvent;
        }
      );

      const result = await target.apply(recurringEvent, rangeStart, rangeEnd);

      // Verify that generateInstanceDates was called with the exception dates
      expect(generateInstanceDates).toHaveBeenCalledWith(
        recurringEvent.recurrencePattern,
        recurringEvent.startDate,
        recurringEvent.endDate,
        recurringEvent.recurrenceEndDate,
        recurringEvent.noEndDate,
        [exceptionDate], // Exception dates should be passed to generateInstanceDates
        rangeStart,
        rangeEnd
      );
      // Result should have 3 instances (exception date excluded)
      expect(result).toHaveLength(3);
      expect(mockCalendarEventRepository.createInstance).toHaveBeenCalledTimes(
        3
      );
    });
  });
});
