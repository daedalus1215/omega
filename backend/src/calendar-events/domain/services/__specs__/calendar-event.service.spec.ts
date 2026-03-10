import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { CalendarEventService } from '../calendar-event.service';
import { FetchCalendarEventsTransactionScript } from '../../transaction-scripts/fetch-calendar-events-TS/fetch-calendar-events.transaction.script';
import { CreateCalendarEventTransactionScript } from '../../transaction-scripts/create-calendar-event-TS/create-calendar-event.transaction.script';
import { FetchCalendarEventTransactionScript } from '../../transaction-scripts/fetch-calendar-event-TS/fetch-calendar-event.transaction.script';
import { UpdateCalendarEventTransactionScript } from '../../transaction-scripts/update-calendar-event-TS/update-calendar-event.transaction.script';
import { DeleteCalendarEventTransactionScript } from '../../transaction-scripts/delete-calendar-event-TS/delete-calendar-event.transaction.script';
import { GenerateEventInstancesTransactionScript } from '../../transaction-scripts/generate-event-instances-TS/generate-event-instances.transaction.script';
import { FetchRecurringEventsTransactionScript } from '../../transaction-scripts/fetch-recurring-events-TS/fetch-recurring-events.transaction.script';
import { CreateEventReminderTransactionScript } from '../../transaction-scripts/create-event-reminder-TS/create-event-reminder.transaction.script';
import { UpdateEventReminderTransactionScript } from '../../transaction-scripts/update-event-reminder-TS/update-event-reminder.transaction.script';
import { DeleteEventReminderTransactionScript } from '../../transaction-scripts/delete-event-reminder-TS/delete-event-reminder.transaction.script';
import { FetchEventRemindersTransactionScript } from '../../transaction-scripts/fetch-event-reminders-TS/fetch-event-reminders.transaction.script';
import { CreateCalendarEventCommand } from '../../transaction-scripts/create-calendar-event-TS/create-calendar-event.command';
import { CalendarEvent } from '../../entities/calendar-event.entity';
import { EventReminder } from '../../entities/event-reminder.entity';
import {
  generateRandomNumbers,
  createMock,
  createMockWithApply,
  setupTransactionMock,
} from 'src/shared-kernel/test-utils';

describe('CalendarEventService', () => {
  let target: CalendarEventService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockFetchCalendarEventsTransactionScript: jest.Mocked<FetchCalendarEventsTransactionScript>;
  let mockCreateCalendarEventTransactionScript: jest.Mocked<CreateCalendarEventTransactionScript>;
  let mockFetchCalendarEventTransactionScript: jest.Mocked<FetchCalendarEventTransactionScript>;
  let mockUpdateCalendarEventTransactionScript: jest.Mocked<UpdateCalendarEventTransactionScript>;
  let mockDeleteCalendarEventTransactionScript: jest.Mocked<DeleteCalendarEventTransactionScript>;
  let mockGenerateEventInstancesTransactionScript: jest.Mocked<GenerateEventInstancesTransactionScript>;
  let mockFetchRecurringEventsTransactionScript: jest.Mocked<FetchRecurringEventsTransactionScript>;
  let mockCreateEventReminderTransactionScript: jest.Mocked<CreateEventReminderTransactionScript>;
  let mockUpdateEventReminderTransactionScript: jest.Mocked<UpdateEventReminderTransactionScript>;
  let mockDeleteEventReminderTransactionScript: jest.Mocked<DeleteEventReminderTransactionScript>;
  let mockFetchEventRemindersTransactionScript: jest.Mocked<FetchEventRemindersTransactionScript>;

  const mockUser = {
    userId: generateRandomNumbers(),
    username: 'testuser',
  };

  const mockEvent: CalendarEvent = {
    id: generateRandomNumbers(),
    userId: mockUser.userId,
    title: 'Team Meeting',
    description: 'Weekly standup',
    startDate: new Date('2024-01-15T10:00:00Z'),
    endDate: new Date('2024-01-15T11:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockFetchCalendarEventsTransactionScript =
      createMockWithApply<FetchCalendarEventsTransactionScript>();

    mockCreateCalendarEventTransactionScript =
      createMockWithApply<CreateCalendarEventTransactionScript>();

    mockFetchCalendarEventTransactionScript =
      createMockWithApply<FetchCalendarEventTransactionScript>();

    mockUpdateCalendarEventTransactionScript =
      createMockWithApply<UpdateCalendarEventTransactionScript>();

    mockDeleteCalendarEventTransactionScript =
      createMockWithApply<DeleteCalendarEventTransactionScript>();

    mockGenerateEventInstancesTransactionScript =
      createMockWithApply<GenerateEventInstancesTransactionScript>();

    mockFetchRecurringEventsTransactionScript =
      createMockWithApply<FetchRecurringEventsTransactionScript>();

    mockCreateEventReminderTransactionScript =
      createMockWithApply<CreateEventReminderTransactionScript>();

    mockUpdateEventReminderTransactionScript =
      createMockWithApply<UpdateEventReminderTransactionScript>();

    mockDeleteEventReminderTransactionScript =
      createMockWithApply<DeleteEventReminderTransactionScript>();

    mockFetchEventRemindersTransactionScript =
      createMockWithApply<FetchEventRemindersTransactionScript>();

    mockDataSource = createMock<DataSource>({
      transaction: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarEventService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: FetchCalendarEventsTransactionScript,
          useValue: mockFetchCalendarEventsTransactionScript,
        },
        {
          provide: CreateCalendarEventTransactionScript,
          useValue: mockCreateCalendarEventTransactionScript,
        },
        {
          provide: FetchCalendarEventTransactionScript,
          useValue: mockFetchCalendarEventTransactionScript,
        },
        {
          provide: UpdateCalendarEventTransactionScript,
          useValue: mockUpdateCalendarEventTransactionScript,
        },
        {
          provide: DeleteCalendarEventTransactionScript,
          useValue: mockDeleteCalendarEventTransactionScript,
        },
        {
          provide: GenerateEventInstancesTransactionScript,
          useValue: mockGenerateEventInstancesTransactionScript,
        },
        {
          provide: FetchRecurringEventsTransactionScript,
          useValue: mockFetchRecurringEventsTransactionScript,
        },
        {
          provide: CreateEventReminderTransactionScript,
          useValue: mockCreateEventReminderTransactionScript,
        },
        {
          provide: UpdateEventReminderTransactionScript,
          useValue: mockUpdateEventReminderTransactionScript,
        },
        {
          provide: DeleteEventReminderTransactionScript,
          useValue: mockDeleteEventReminderTransactionScript,
        },
        {
          provide: FetchEventRemindersTransactionScript,
          useValue: mockFetchEventRemindersTransactionScript,
        },
      ],
    }).compile();

    target = module.get<CalendarEventService>(CalendarEventService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCalendarEvent', () => {
    const validCommand: CreateCalendarEventCommand = {
      title: 'Team Meeting',
      description: 'Weekly standup',
      startDate: new Date('2024-01-15T10:00:00Z'),
      endDate: new Date('2024-01-15T11:00:00Z'),
      user: mockUser,
    };

    it('should create event without reminder when reminderMinutes is not provided', async () => {
      const mockManager = setupTransactionMock(mockDataSource, [
        { script: mockCreateCalendarEventTransactionScript, return: mockEvent },
      ]);

      const result = await target.createCalendarEvent(validCommand);

      expect(result).toEqual(mockEvent);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(
        mockCreateCalendarEventTransactionScript.apply
      ).toHaveBeenCalledWith(validCommand, mockManager);
      expect(
        mockCreateEventReminderTransactionScript.apply
      ).not.toHaveBeenCalled();
    });

    it('should create event with reminder when reminderMinutes is provided', async () => {
      const commandWithReminder: CreateCalendarEventCommand = {
        ...validCommand,
        reminderMinutes: 60,
      };

      const mockReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId: mockEvent.id,
        reminderMinutes: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockManager = setupTransactionMock(mockDataSource, [
        { script: mockCreateCalendarEventTransactionScript, return: mockEvent },
        {
          script: mockCreateEventReminderTransactionScript,
          return: mockReminder,
        },
      ]);

      const result = await target.createCalendarEvent(commandWithReminder);

      expect(result).toEqual(mockEvent);
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(
        mockCreateCalendarEventTransactionScript.apply
      ).toHaveBeenCalledWith(commandWithReminder, mockManager);
      expect(
        mockCreateEventReminderTransactionScript.apply
      ).toHaveBeenCalledWith(
        {
          calendarEventId: mockEvent.id,
          reminderMinutes: 60,
          user: mockUser,
        },
        mockManager
      );
    });

    it('should create event with reminder when reminderMinutes is 0', async () => {
      const commandWithZeroReminder: CreateCalendarEventCommand = {
        ...validCommand,
        reminderMinutes: 0,
      };

      const mockReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId: mockEvent.id,
        reminderMinutes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockManager = setupTransactionMock(mockDataSource, [
        { script: mockCreateCalendarEventTransactionScript, return: mockEvent },
        {
          script: mockCreateEventReminderTransactionScript,
          return: mockReminder,
        },
      ]);

      await target.createCalendarEvent(commandWithZeroReminder);

      expect(
        mockCreateEventReminderTransactionScript.apply
      ).toHaveBeenCalledWith(
        {
          calendarEventId: mockEvent.id,
          reminderMinutes: 0,
          user: mockUser,
        },
        mockManager
      );
    });

    it('should rollback transaction if reminder creation fails', async () => {
      const commandWithReminder: CreateCalendarEventCommand = {
        ...validCommand,
        reminderMinutes: 60,
      };

      setupTransactionMock(mockDataSource, [
        { script: mockCreateCalendarEventTransactionScript, return: mockEvent },
        {
          script: mockCreateEventReminderTransactionScript,
          error: new Error('Reminder creation failed'),
        },
      ]);

      await expect(
        target.createCalendarEvent(commandWithReminder)
      ).rejects.toThrow('Reminder creation failed');

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction if event creation fails', async () => {
      const commandWithReminder: CreateCalendarEventCommand = {
        ...validCommand,
        reminderMinutes: 60,
      };

      setupTransactionMock(mockDataSource, [
        {
          script: mockCreateCalendarEventTransactionScript,
          error: new Error('Event creation failed'),
        },
      ]);

      await expect(
        target.createCalendarEvent(commandWithReminder)
      ).rejects.toThrow('Event creation failed');

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
      expect(
        mockCreateEventReminderTransactionScript.apply
      ).not.toHaveBeenCalled();
    });

    it('should not create reminder when reminderMinutes is undefined', async () => {
      const commandWithoutReminder: CreateCalendarEventCommand = {
        ...validCommand,
        reminderMinutes: undefined,
      };

      setupTransactionMock(mockDataSource, [
        { script: mockCreateCalendarEventTransactionScript, return: mockEvent },
      ]);

      await target.createCalendarEvent(commandWithoutReminder);

      expect(
        mockCreateEventReminderTransactionScript.apply
      ).not.toHaveBeenCalled();
    });

    it('should not create reminder when reminderMinutes is null', async () => {
      const commandWithoutReminder: CreateCalendarEventCommand = {
        ...validCommand,
        reminderMinutes: null as any,
      };

      setupTransactionMock(mockDataSource, [
        { script: mockCreateCalendarEventTransactionScript, return: mockEvent },
      ]);

      await target.createCalendarEvent(commandWithoutReminder);

      expect(
        mockCreateEventReminderTransactionScript.apply
      ).not.toHaveBeenCalled();
    });
  });
});
