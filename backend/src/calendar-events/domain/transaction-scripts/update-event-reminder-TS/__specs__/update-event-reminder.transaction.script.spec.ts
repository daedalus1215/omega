import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdateEventReminderTransactionScript } from '../update-event-reminder.transaction.script';
import { EventReminderRepository } from '../../../../infra/repositories/event-reminder.repository';
import { CalendarEventRepository } from '../../../../infra/repositories/calendar-event.repository';
import { UpdateEventReminderValidator } from '../update-event-reminder.validator';
import { UpdateEventReminderCommand } from '../update-event-reminder.command';
import { EventReminder } from '../../../../domain/entities/event-reminder.entity';
import { CalendarEvent } from '../../../../domain/entities/calendar-event.entity';
import {
  generateRandomNumbers,
  createMock,
} from 'src/shared-kernel/test-utils';

describe('UpdateEventReminderTransactionScript', () => {
  let target: UpdateEventReminderTransactionScript;
  let mockEventReminderRepository: jest.Mocked<EventReminderRepository>;
  let mockCalendarEventRepository: jest.Mocked<CalendarEventRepository>;
  let mockValidator: jest.Mocked<UpdateEventReminderValidator>;

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

  const mockExistingReminder: EventReminder = {
    id: generateRandomNumbers(),
    calendarEventId: mockCalendarEvent.id,
    reminderMinutes: 30,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validCommand: UpdateEventReminderCommand = {
    reminderId: mockExistingReminder.id,
    reminderMinutes: 60,
    user: mockUser,
  };

  beforeEach(async () => {
    mockEventReminderRepository = createMock<EventReminderRepository>({
      findById: jest.fn(),
      findByEventId: jest.fn(),
      update: jest.fn(),
    });

    mockCalendarEventRepository = createMock<CalendarEventRepository>({
      findById: jest.fn(),
    });

    mockValidator = createMock<UpdateEventReminderValidator>({
      validateReminderExists: jest.fn(),
      validateCalendarEventExists: jest.fn(),
      validateReminderMinutesArePositive: jest.fn(),
      validateNoDuplicateReminder: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateEventReminderTransactionScript,
        {
          provide: EventReminderRepository,
          useValue: mockEventReminderRepository,
        },
        {
          provide: CalendarEventRepository,
          useValue: mockCalendarEventRepository,
        },
        {
          provide: UpdateEventReminderValidator,
          useValue: mockValidator,
        },
      ],
    }).compile();

    target = module.get<UpdateEventReminderTransactionScript>(
      UpdateEventReminderTransactionScript
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('apply', () => {
    it('should update a reminder with valid command', async () => {
      const updatedReminder: EventReminder = {
        ...mockExistingReminder,
        reminderMinutes: validCommand.reminderMinutes,
        updatedAt: new Date(),
      };

      mockEventReminderRepository.findById.mockResolvedValue(
        mockExistingReminder
      );
      mockCalendarEventRepository.findById.mockResolvedValue(mockCalendarEvent);
      mockEventReminderRepository.findByEventId.mockResolvedValue([
        mockExistingReminder,
      ]);
      mockEventReminderRepository.update.mockResolvedValue(updatedReminder);

      const result = await target.apply(validCommand);

      expect(result).toEqual(updatedReminder);
      expect(mockEventReminderRepository.findById).toHaveBeenCalledWith(
        validCommand.reminderId
      );
      expect(mockValidator.validateReminderExists).toHaveBeenCalledWith(
        mockExistingReminder
      );
      expect(mockCalendarEventRepository.findById).toHaveBeenCalledWith(
        mockExistingReminder.calendarEventId,
        mockUser.userId
      );
      expect(mockValidator.validateCalendarEventExists).toHaveBeenCalledWith(
        mockCalendarEvent
      );
      expect(
        mockValidator.validateReminderMinutesArePositive
      ).toHaveBeenCalledWith(validCommand.reminderMinutes);
      expect(mockEventReminderRepository.findByEventId).toHaveBeenCalledWith(
        mockExistingReminder.calendarEventId
      );
      expect(mockValidator.validateNoDuplicateReminder).toHaveBeenCalledWith(
        [mockExistingReminder],
        validCommand.reminderId,
        validCommand.reminderMinutes
      );
      expect(mockEventReminderRepository.update).toHaveBeenCalledWith(
        validCommand.reminderId,
        {
          reminderMinutes: validCommand.reminderMinutes,
        }
      );
    });

    it('should throw NotFoundException when reminder does not exist', async () => {
      mockEventReminderRepository.findById.mockResolvedValue(null);
      mockValidator.validateReminderExists.mockImplementation(() => {
        throw new NotFoundException('Event reminder not found');
      });

      await expect(target.apply(validCommand)).rejects.toThrow(
        NotFoundException
      );
      await expect(target.apply(validCommand)).rejects.toThrow(
        'Event reminder not found'
      );
      expect(mockEventReminderRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when calendar event does not exist', async () => {
      mockEventReminderRepository.findById.mockResolvedValue(
        mockExistingReminder
      );
      mockCalendarEventRepository.findById.mockResolvedValue(null);
      mockValidator.validateCalendarEventExists.mockImplementation(() => {
        throw new NotFoundException('Calendar event not found');
      });

      await expect(target.apply(validCommand)).rejects.toThrow(
        NotFoundException
      );
      await expect(target.apply(validCommand)).rejects.toThrow(
        'Calendar event not found'
      );
      expect(mockEventReminderRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when reminder minutes is negative', async () => {
      const invalidCommand: UpdateEventReminderCommand = {
        ...validCommand,
        reminderMinutes: -1,
      };

      mockEventReminderRepository.findById.mockResolvedValue(
        mockExistingReminder
      );
      mockCalendarEventRepository.findById.mockResolvedValue(mockCalendarEvent);
      mockValidator.validateReminderMinutesArePositive.mockImplementation(
        () => {
          throw new Error('Reminder minutes must be non-negative');
        }
      );

      await expect(target.apply(invalidCommand)).rejects.toThrow(
        'Reminder minutes must be non-negative'
      );
      expect(mockEventReminderRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when duplicate reminder exists', async () => {
      const duplicateReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId: mockExistingReminder.calendarEventId,
        reminderMinutes: validCommand.reminderMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventReminderRepository.findById.mockResolvedValue(
        mockExistingReminder
      );
      mockCalendarEventRepository.findById.mockResolvedValue(mockCalendarEvent);
      mockEventReminderRepository.findByEventId.mockResolvedValue([
        mockExistingReminder,
        duplicateReminder,
      ]);
      mockValidator.validateNoDuplicateReminder.mockImplementation(() => {
        throw new Error(
          'Reminder with this timing already exists for this event'
        );
      });

      await expect(target.apply(validCommand)).rejects.toThrow(
        'Reminder with this timing already exists for this event'
      );
      expect(mockEventReminderRepository.update).not.toHaveBeenCalled();
    });

    it('should allow update when no duplicate reminder exists', async () => {
      const otherReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId: mockExistingReminder.calendarEventId,
        reminderMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedReminder: EventReminder = {
        ...mockExistingReminder,
        reminderMinutes: validCommand.reminderMinutes,
        updatedAt: new Date(),
      };

      mockEventReminderRepository.findById.mockResolvedValue(
        mockExistingReminder
      );
      mockCalendarEventRepository.findById.mockResolvedValue(mockCalendarEvent);
      mockEventReminderRepository.findByEventId.mockResolvedValue([
        mockExistingReminder,
        otherReminder,
      ]);
      mockEventReminderRepository.update.mockResolvedValue(updatedReminder);

      const result = await target.apply(validCommand);

      expect(result).toEqual(updatedReminder);
      expect(mockEventReminderRepository.update).toHaveBeenCalled();
    });

    it('should allow update with zero minutes', async () => {
      const commandWithZero: UpdateEventReminderCommand = {
        ...validCommand,
        reminderMinutes: 0,
      };

      const updatedReminder: EventReminder = {
        ...mockExistingReminder,
        reminderMinutes: 0,
        updatedAt: new Date(),
      };

      mockEventReminderRepository.findById.mockResolvedValue(
        mockExistingReminder
      );
      mockCalendarEventRepository.findById.mockResolvedValue(mockCalendarEvent);
      mockEventReminderRepository.findByEventId.mockResolvedValue([
        mockExistingReminder,
      ]);
      mockEventReminderRepository.update.mockResolvedValue(updatedReminder);

      const result = await target.apply(commandWithZero);

      expect(result).toEqual(updatedReminder);
      expect(mockEventReminderRepository.update).toHaveBeenCalledWith(
        commandWithZero.reminderId,
        {
          reminderMinutes: 0,
        }
      );
    });
  });
});
