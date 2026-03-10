import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CreateEventReminderTransactionScript } from '../create-event-reminder.transaction.script';
import { EventReminderRepository } from '../../../../infra/repositories/event-reminder.repository';
import { CalendarEventRepository } from '../../../../infra/repositories/calendar-event.repository';
import { CreateEventReminderCommand } from '../create-event-reminder.command';
import { EventReminder } from '../../../../domain/entities/event-reminder.entity';
import { CalendarEvent } from '../../../../domain/entities/calendar-event.entity';
import {
  generateRandomNumbers,
  createMock,
} from 'src/shared-kernel/test-utils';
import { EntityManager } from 'typeorm';

describe('CreateEventReminderTransactionScript', () => {
  let target: CreateEventReminderTransactionScript;
  let mockEventReminderRepository: jest.Mocked<EventReminderRepository>;
  let mockCalendarEventRepository: jest.Mocked<CalendarEventRepository>;

  const mockUser = {
    userId: generateRandomNumbers(),
    username: 'testuser',
  };

  const mockCalendarEvent: CalendarEvent = {
    id: generateRandomNumbers(),
    userId: mockUser.userId,
    title: 'Team Meeting',
    description: 'Weekly standup',
    startDate: new Date('2024-01-15T10:00:00Z'),
    endDate: new Date('2024-01-15T11:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validCommand: CreateEventReminderCommand = {
    calendarEventId: mockCalendarEvent.id,
    reminderMinutes: 60,
    user: mockUser,
  };

  beforeEach(async () => {
    mockEventReminderRepository = createMock<EventReminderRepository>({
      create: jest.fn(),
      findByEventId: jest.fn(),
    });

    mockCalendarEventRepository = createMock<CalendarEventRepository>({
      findById: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateEventReminderTransactionScript,
        {
          provide: EventReminderRepository,
          useValue: mockEventReminderRepository,
        },
        {
          provide: CalendarEventRepository,
          useValue: mockCalendarEventRepository,
        },
      ],
    }).compile();

    target = module.get<CreateEventReminderTransactionScript>(
      CreateEventReminderTransactionScript
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('apply', () => {
    it('should create a reminder with valid command', async () => {
      const mockReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId: mockCalendarEvent.id,
        reminderMinutes: validCommand.reminderMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCalendarEventRepository.findById.mockResolvedValue(mockCalendarEvent);
      mockEventReminderRepository.findByEventId.mockResolvedValue([]);
      mockEventReminderRepository.create.mockResolvedValue(mockReminder);

      const result = await target.apply(validCommand);

      expect(result).toEqual(mockReminder);
      expect(mockCalendarEventRepository.findById).toHaveBeenCalledWith(
        mockCalendarEvent.id,
        mockUser.userId
      );
      expect(mockEventReminderRepository.findByEventId).toHaveBeenCalledWith(
        mockCalendarEvent.id
      );
      expect(mockEventReminderRepository.create).toHaveBeenCalledWith(
        {
          calendarEventId: mockCalendarEvent.id,
          reminderMinutes: validCommand.reminderMinutes,
        },
        undefined
      );
    });

    it('should pass EntityManager when provided', async () => {
      const mockManager = createMock<EntityManager>();
      const mockReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId: mockCalendarEvent.id,
        reminderMinutes: validCommand.reminderMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCalendarEventRepository.findById.mockResolvedValue(mockCalendarEvent);
      mockEventReminderRepository.findByEventId.mockResolvedValue([]);
      mockEventReminderRepository.create.mockResolvedValue(mockReminder);

      await target.apply(validCommand, mockManager);

      expect(mockEventReminderRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          calendarEventId: mockCalendarEvent.id,
          reminderMinutes: validCommand.reminderMinutes,
        }),
        mockManager
      );
    });

    it('should throw NotFoundException when calendar event does not exist', async () => {
      mockCalendarEventRepository.findById.mockResolvedValue(null);

      await expect(target.apply(validCommand)).rejects.toThrow(
        NotFoundException
      );
      await expect(target.apply(validCommand)).rejects.toThrow(
        'Calendar event not found'
      );
      expect(mockEventReminderRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when calendar event belongs to different user', async () => {
      mockCalendarEventRepository.findById.mockResolvedValue(null);

      await expect(target.apply(validCommand)).rejects.toThrow(
        NotFoundException
      );
      expect(mockEventReminderRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when reminder minutes is negative', async () => {
      const invalidCommand: CreateEventReminderCommand = {
        ...validCommand,
        reminderMinutes: -1,
      };

      mockCalendarEventRepository.findById.mockResolvedValue(mockCalendarEvent);

      await expect(target.apply(invalidCommand)).rejects.toThrow(
        'Reminder minutes must be non-negative'
      );
      expect(mockEventReminderRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when duplicate reminder exists', async () => {
      const existingReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId: mockCalendarEvent.id,
        reminderMinutes: validCommand.reminderMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCalendarEventRepository.findById.mockResolvedValue(mockCalendarEvent);
      mockEventReminderRepository.findByEventId.mockResolvedValue([
        existingReminder,
      ]);

      await expect(target.apply(validCommand)).rejects.toThrow(
        'Reminder with this timing already exists for this event'
      );
      expect(mockEventReminderRepository.create).not.toHaveBeenCalled();
    });

    it('should allow reminder with different minutes even if other reminders exist', async () => {
      const existingReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId: mockCalendarEvent.id,
        reminderMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId: mockCalendarEvent.id,
        reminderMinutes: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCalendarEventRepository.findById.mockResolvedValue(mockCalendarEvent);
      mockEventReminderRepository.findByEventId.mockResolvedValue([
        existingReminder,
      ]);
      mockEventReminderRepository.create.mockResolvedValue(newReminder);

      const result = await target.apply(validCommand);

      expect(result).toEqual(newReminder);
      expect(mockEventReminderRepository.create).toHaveBeenCalled();
    });

    it('should allow reminder with zero minutes', async () => {
      const commandWithZero: CreateEventReminderCommand = {
        ...validCommand,
        reminderMinutes: 0,
      };

      const mockReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId: mockCalendarEvent.id,
        reminderMinutes: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCalendarEventRepository.findById.mockResolvedValue(mockCalendarEvent);
      mockEventReminderRepository.findByEventId.mockResolvedValue([]);
      mockEventReminderRepository.create.mockResolvedValue(mockReminder);

      const result = await target.apply(commandWithZero);

      expect(result).toEqual(mockReminder);
      expect(mockEventReminderRepository.create).toHaveBeenCalled();
    });
  });
});
