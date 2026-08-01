import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SyncEventRemindersTransactionScript } from '../sync-event-reminders.transaction.script';
import { EventReminderRepository } from '../../../../infra/repositories/event-reminder.repository';
import { CalendarEventRepository } from '../../../../infra/repositories/calendar-event.repository';
import { SyncEventRemindersCommand } from '../sync-event-reminders.command';
import { EventReminder } from '../../../../domain/entities/event-reminder.entity';
import { CalendarEvent } from '../../../../domain/entities/calendar-event.entity';
import {
  MAX_REMINDERS_PER_EVENT,
  MAX_REMINDER_MINUTES,
} from '../../../reminder.constants';
import {
  generateRandomNumbers,
  createMock,
} from 'src/shared-kernel/test-utils';

describe('SyncEventRemindersTransactionScript', () => {
  let target: SyncEventRemindersTransactionScript;
  let mockEventReminderRepository: jest.Mocked<EventReminderRepository>;
  let mockCalendarEventRepository: jest.Mocked<CalendarEventRepository>;

  const mockUser = {
    userId: generateRandomNumbers(),
    username: 'testuser',
  };

  const mockCalendarEvent: CalendarEvent = {
    id: generateRandomNumbers(),
    calendarId: 10,
    userId: mockUser.userId,
    title: 'Team Meeting',
    startDate: new Date('2024-01-15T10:00:00Z'),
    endDate: new Date('2024-01-15T11:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const calendarIds = [mockCalendarEvent.calendarId];

  const buildReminder = (
    reminderMinutes: number,
    overrides: Partial<EventReminder> = {}
  ): EventReminder => ({
    id: generateRandomNumbers(100, 999),
    calendarEventId: mockCalendarEvent.id,
    reminderMinutes,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const buildCommand = (
    reminderMinutes: number[]
  ): SyncEventRemindersCommand => ({
    calendarEventId: mockCalendarEvent.id,
    reminderMinutes,
    user: mockUser,
  });

  beforeEach(async () => {
    mockEventReminderRepository = createMock<EventReminderRepository>({
      create: jest.fn(),
      delete: jest.fn(),
      findByEventId: jest.fn(),
    });

    mockCalendarEventRepository = createMock<CalendarEventRepository>({
      findById: jest.fn(),
      markRemindersCustomized: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncEventRemindersTransactionScript,
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

    target = module.get<SyncEventRemindersTransactionScript>(
      SyncEventRemindersTransactionScript
    );

    mockCalendarEventRepository.findById.mockResolvedValue(mockCalendarEvent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('diffing', () => {
    it('should leave unchanged reminders untouched so sentAt is preserved', async () => {
      const alreadySent = buildReminder(60, { sentAt: new Date() });
      mockEventReminderRepository.findByEventId.mockResolvedValue([
        alreadySent,
      ]);

      await target.apply(buildCommand([60]), calendarIds);

      expect(mockEventReminderRepository.delete).not.toHaveBeenCalled();
      expect(mockEventReminderRepository.create).not.toHaveBeenCalled();
    });

    it('should create only the offsets that are new', async () => {
      const existing = buildReminder(60);
      mockEventReminderRepository.findByEventId.mockResolvedValue([existing]);

      await target.apply(buildCommand([60, 15]), calendarIds);

      expect(mockEventReminderRepository.create).toHaveBeenCalledTimes(1);
      expect(mockEventReminderRepository.create).toHaveBeenCalledWith(
        { calendarEventId: mockCalendarEvent.id, reminderMinutes: 15 },
        undefined
      );
      expect(mockEventReminderRepository.delete).not.toHaveBeenCalled();
    });

    it('should delete offsets that are no longer wanted', async () => {
      const kept = buildReminder(60);
      const dropped = buildReminder(1440);
      mockEventReminderRepository.findByEventId.mockResolvedValue([
        kept,
        dropped,
      ]);

      await target.apply(buildCommand([60]), calendarIds);

      expect(mockEventReminderRepository.delete).toHaveBeenCalledTimes(1);
      expect(mockEventReminderRepository.delete).toHaveBeenCalledWith(
        dropped.id,
        undefined
      );
    });

    it('should remove every reminder when given an empty array', async () => {
      const first = buildReminder(15);
      const second = buildReminder(60);
      mockEventReminderRepository.findByEventId.mockResolvedValue([
        first,
        second,
      ]);

      await target.apply(buildCommand([]), calendarIds);

      expect(mockEventReminderRepository.delete).toHaveBeenCalledTimes(2);
      expect(mockEventReminderRepository.create).not.toHaveBeenCalled();
    });

    it('should collapse duplicate offsets instead of creating both', async () => {
      mockEventReminderRepository.findByEventId.mockResolvedValue([]);

      await target.apply(buildCommand([15, 15, 60]), calendarIds);

      expect(mockEventReminderRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should mark the event as customized so the series generator leaves it alone', async () => {
      mockEventReminderRepository.findByEventId.mockResolvedValue([]);

      await target.apply(buildCommand([15]), calendarIds);

      expect(
        mockCalendarEventRepository.markRemindersCustomized
      ).toHaveBeenCalledWith(mockCalendarEvent.id, undefined);
    });

    it('should return the reminders as they stand after syncing', async () => {
      const finalState = [buildReminder(15), buildReminder(60)];
      mockEventReminderRepository.findByEventId
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(finalState);

      const result = await target.apply(buildCommand([15, 60]), calendarIds);

      expect(result).toEqual(finalState);
    });
  });

  describe('validation', () => {
    it('should throw NotFoundException when the event is not visible to the caller', async () => {
      mockCalendarEventRepository.findById.mockResolvedValue(null);

      await expect(target.apply(buildCommand([15]), [999])).rejects.toThrow(
        NotFoundException
      );
    });

    it('should reject more distinct offsets than the limit allows', async () => {
      const tooMany = Array.from(
        { length: MAX_REMINDERS_PER_EVENT + 1 },
        (_, i) => (i + 1) * 5
      );

      await expect(
        target.apply(buildCommand(tooMany), calendarIds)
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow exactly the maximum number of reminders', async () => {
      const atLimit = Array.from(
        { length: MAX_REMINDERS_PER_EVENT },
        (_, i) => (i + 1) * 5
      );
      mockEventReminderRepository.findByEventId.mockResolvedValue([]);

      await expect(
        target.apply(buildCommand(atLimit), calendarIds)
      ).resolves.toBeDefined();
    });

    it('should count duplicates once when applying the limit', async () => {
      const withDuplicates = Array(MAX_REMINDERS_PER_EVENT + 2).fill(15);
      mockEventReminderRepository.findByEventId.mockResolvedValue([]);

      await expect(
        target.apply(buildCommand(withDuplicates), calendarIds)
      ).resolves.toBeDefined();
    });

    it('should reject negative offsets', async () => {
      await expect(
        target.apply(buildCommand([-1]), calendarIds)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject offsets beyond the maximum lead time', async () => {
      await expect(
        target.apply(buildCommand([MAX_REMINDER_MINUTES + 1]), calendarIds)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-integer offsets', async () => {
      await expect(
        target.apply(buildCommand([15.5]), calendarIds)
      ).rejects.toThrow(BadRequestException);
    });

    it('should not write anything when validation fails', async () => {
      await expect(
        target.apply(buildCommand([-1]), calendarIds)
      ).rejects.toThrow(BadRequestException);

      expect(mockEventReminderRepository.create).not.toHaveBeenCalled();
      expect(mockEventReminderRepository.delete).not.toHaveBeenCalled();
    });
  });
});
