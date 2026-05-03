import { Test, TestingModule } from '@nestjs/testing';
import { GenerateEventInstancesTransactionScript } from '../generate-event-instances.transaction.script';
import { CalendarEventRepository } from '../../../../infra/repositories/calendar-event.repository';
import { RecurrenceExceptionRepository } from '../../../../infra/repositories/recurrence-exception.repository';
import { EventReminderRepository } from '../../../../infra/repositories/event-reminder.repository';
import { generateInstanceDates } from '../../../../domain/utils/rrule-pattern.utils';
import { RecurringEvent } from '../../../../domain/entities/recurring-event.entity';
import { CalendarEvent } from '../../../../domain/entities/calendar-event.entity';
import {
  createLoggerMock,
  createMock,
  generateRandomNumbers,
} from 'src/shared-kernel/test-utils';
import { addDays, addYears } from 'date-fns';
import { startOfDayUTC } from '../../../../domain/utils/date-utc.utils';
import { Logger } from 'nestjs-pino';

jest.mock('../../../../domain/utils/rrule-pattern.utils');

describe('GenerateEventInstancesTransactionScript', () => {
  let target: GenerateEventInstancesTransactionScript;
  let mockCalendarEventRepository: jest.Mocked<CalendarEventRepository>;
  let mockRecurrenceExceptionRepository: jest.Mocked<RecurrenceExceptionRepository>;
  let mockEventReminderRepository: jest.Mocked<EventReminderRepository>;

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

    mockEventReminderRepository = createMock<EventReminderRepository>({
      create: jest.fn(),
      findByEventId: jest.fn(),
      findByEventIds: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteByEventId: jest.fn(),
      findPendingReminders: jest.fn(),
      markAsSent: jest.fn(),
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
        {
          provide: EventReminderRepository,
          useValue: mockEventReminderRepository,
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
      const exceptionDate = startOfDayUTC(new Date('2024-01-17T00:00:00Z'));

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

    it('should create reminders for new instances when recurring event has reminderMinutes', async () => {
      const recurringEvent: RecurringEvent = {
        ...mockRecurringEvent,
        reminderMinutes: 30,
        recurrencePattern: {
          type: 'DAILY',
          interval: 1,
        },
      };

      const rangeStart = new Date('2024-01-15T00:00:00Z');
      const rangeEnd = new Date('2024-01-17T23:59:59Z');
      const instanceDates = [
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-16T10:00:00Z'),
        new Date('2024-01-17T10:00:00Z'),
      ];

      (generateInstanceDates as jest.Mock).mockReturnValue(instanceDates);
      mockRecurrenceExceptionRepository.findByRecurringEventId.mockResolvedValue([]);
      mockCalendarEventRepository.findByRecurringEventId.mockResolvedValue([]);
      // No existing reminders for the newly created instances
      mockEventReminderRepository.findByEventIds.mockResolvedValue([]);

      let instanceIdCounter = 100;
      mockCalendarEventRepository.createInstance.mockImplementation(
        async (instance: Partial<CalendarEvent>) => {
          return {
            id: instanceIdCounter++,
            ...instance,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as CalendarEvent;
        }
      );
      mockEventReminderRepository.create.mockImplementation(async (reminder) => ({
        id: generateRandomNumbers(),
        calendarEventId: reminder.calendarEventId!,
        reminderMinutes: reminder.reminderMinutes!,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await target.apply(recurringEvent, rangeStart, rangeEnd);

      expect(result).toHaveLength(3);
      expect(mockEventReminderRepository.create).toHaveBeenCalledTimes(3);
      expect(mockEventReminderRepository.create).toHaveBeenCalledWith({
        calendarEventId: 100,
        reminderMinutes: 30,
      });
      expect(mockEventReminderRepository.create).toHaveBeenCalledWith({
        calendarEventId: 101,
        reminderMinutes: 30,
      });
      expect(mockEventReminderRepository.create).toHaveBeenCalledWith({
        calendarEventId: 102,
        reminderMinutes: 30,
      });
    });

    it('should backfill reminders for existing instances missing them', async () => {
      const recurringEvent: RecurringEvent = {
        ...mockRecurringEvent,
        reminderMinutes: 60,
        recurrencePattern: {
          type: 'DAILY',
          interval: 1,
        },
      };

      const rangeStart = new Date('2024-01-15T00:00:00Z');
      const rangeEnd = new Date('2024-01-17T23:59:59Z');

      const instanceDate1 = startOfDayUTC(new Date('2024-01-15T14:00:00Z'));
      const instanceDate2 = startOfDayUTC(new Date('2024-01-16T14:00:00Z'));

      const existingInstances: CalendarEvent[] = [
        {
          id: 200,
          userId: recurringEvent.userId,
          recurringEventId: recurringEvent.id,
          instanceDate: instanceDate1,
          title: recurringEvent.title,
          startDate: new Date('2024-01-15T14:00:00Z'),
          endDate: new Date('2024-01-15T15:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 201,
          userId: recurringEvent.userId,
          recurringEventId: recurringEvent.id,
          instanceDate: instanceDate2,
          title: recurringEvent.title,
          startDate: new Date('2024-01-16T14:00:00Z'),
          endDate: new Date('2024-01-16T15:00:00Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Return dates that, after startOfDay, match existing instances
      (generateInstanceDates as jest.Mock).mockReturnValue([
        new Date('2024-01-15T14:00:00Z'),
        new Date('2024-01-16T14:00:00Z'),
      ]);
      mockRecurrenceExceptionRepository.findByRecurringEventId.mockResolvedValue([]);
      mockCalendarEventRepository.findByRecurringEventId.mockResolvedValue(existingInstances);
      // Instance 200 already has a reminder, 201 does not
      mockEventReminderRepository.findByEventIds.mockResolvedValue([
        {
          id: 50,
          calendarEventId: 200,
          reminderMinutes: 60,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockEventReminderRepository.create.mockImplementation(async (reminder) => ({
        id: generateRandomNumbers(),
        calendarEventId: reminder.calendarEventId!,
        reminderMinutes: reminder.reminderMinutes!,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await target.apply(recurringEvent, rangeStart, rangeEnd);

      // Should NOT create a new instance (both already exist)
      expect(mockCalendarEventRepository.createInstance).not.toHaveBeenCalled();
      // Should backfill reminder only for instance 201 (200 already has one)
      expect(mockEventReminderRepository.create).toHaveBeenCalledTimes(1);
      expect(mockEventReminderRepository.create).toHaveBeenCalledWith({
        calendarEventId: 201,
        reminderMinutes: 60,
      });
    });

    it('should not create reminders when recurring event has no reminderMinutes', async () => {
      const recurringEvent: RecurringEvent = {
        ...mockRecurringEvent,
        reminderMinutes: undefined,
        recurrencePattern: {
          type: 'DAILY',
          interval: 1,
        },
      };

      const rangeStart = new Date('2024-01-15T00:00:00Z');
      const rangeEnd = new Date('2024-01-17T23:59:59Z');
      const instanceDates = [
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-16T10:00:00Z'),
      ];

      (generateInstanceDates as jest.Mock).mockReturnValue(instanceDates);
      mockRecurrenceExceptionRepository.findByRecurringEventId.mockResolvedValue([]);
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

      await target.apply(recurringEvent, rangeStart, rangeEnd);

      expect(mockEventReminderRepository.create).not.toHaveBeenCalled();
    });
  });
});
