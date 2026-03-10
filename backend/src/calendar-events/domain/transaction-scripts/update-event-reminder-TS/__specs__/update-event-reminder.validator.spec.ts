import { NotFoundException } from '@nestjs/common';
import { UpdateEventReminderValidator } from '../update-event-reminder.validator';
import { EventReminder } from '../../../../domain/entities/event-reminder.entity';
import { CalendarEvent } from '../../../../domain/entities/calendar-event.entity';
import { generateRandomNumbers } from 'src/shared-kernel/test-utils';

describe('UpdateEventReminderValidator', () => {
  let target: UpdateEventReminderValidator;

  beforeEach(() => {
    target = new UpdateEventReminderValidator();
  });

  describe('validateReminderExists', () => {
    it('should not throw when reminder exists', () => {
      const reminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId: generateRandomNumbers(),
        reminderMinutes: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => target.validateReminderExists(reminder)).not.toThrow();
    });

    it('should throw NotFoundException when reminder is null', () => {
      expect(() => target.validateReminderExists(null)).toThrow(
        NotFoundException
      );
      expect(() => target.validateReminderExists(null)).toThrow(
        'Event reminder not found'
      );
    });

    it('should throw NotFoundException when reminder is undefined', () => {
      expect(() => target.validateReminderExists(undefined as any)).toThrow(
        NotFoundException
      );
      expect(() => target.validateReminderExists(undefined as any)).toThrow(
        'Event reminder not found'
      );
    });
  });

  describe('validateCalendarEventExists', () => {
    it('should not throw when calendar event exists', () => {
      const event: CalendarEvent = {
        id: generateRandomNumbers(),
        userId: generateRandomNumbers(),
        title: 'Test Event',
        startDate: new Date(),
        endDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => target.validateCalendarEventExists(event)).not.toThrow();
    });

    it('should throw NotFoundException when calendar event is null', () => {
      expect(() => target.validateCalendarEventExists(null)).toThrow(
        NotFoundException
      );
      expect(() => target.validateCalendarEventExists(null)).toThrow(
        'Calendar event not found'
      );
    });

    it('should throw NotFoundException when calendar event is undefined', () => {
      expect(() =>
        target.validateCalendarEventExists(undefined as any)
      ).toThrow(NotFoundException);
      expect(() =>
        target.validateCalendarEventExists(undefined as any)
      ).toThrow('Calendar event not found');
    });
  });

  describe('validateReminderMinutesArePositive', () => {
    it('should not throw when reminder minutes is zero', () => {
      expect(() => target.validateReminderMinutesArePositive(0)).not.toThrow();
    });

    it('should not throw when reminder minutes is positive', () => {
      expect(() => target.validateReminderMinutesArePositive(1)).not.toThrow();
      expect(() => target.validateReminderMinutesArePositive(60)).not.toThrow();
      expect(() =>
        target.validateReminderMinutesArePositive(1440)
      ).not.toThrow();
    });

    it('should throw Error when reminder minutes is negative', () => {
      expect(() => target.validateReminderMinutesArePositive(-1)).toThrow(
        Error
      );
      expect(() => target.validateReminderMinutesArePositive(-1)).toThrow(
        'Reminder minutes must be non-negative'
      );
      expect(() => target.validateReminderMinutesArePositive(-60)).toThrow(
        'Reminder minutes must be non-negative'
      );
    });
  });

  describe('validateNoDuplicateReminder', () => {
    const reminderId = generateRandomNumbers();
    const calendarEventId = generateRandomNumbers();
    const reminderMinutes = 60;

    it('should not throw when no reminders exist', () => {
      expect(() =>
        target.validateNoDuplicateReminder([], reminderId, reminderMinutes)
      ).not.toThrow();
    });

    it('should not throw when only the current reminder exists', () => {
      const existingReminder: EventReminder = {
        id: reminderId,
        calendarEventId,
        reminderMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() =>
        target.validateNoDuplicateReminder(
          [existingReminder],
          reminderId,
          reminderMinutes
        )
      ).not.toThrow();
    });

    it('should not throw when other reminders exist with different minutes', () => {
      const otherReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId,
        reminderMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() =>
        target.validateNoDuplicateReminder(
          [otherReminder],
          reminderId,
          reminderMinutes
        )
      ).not.toThrow();
    });

    it('should not throw when multiple reminders exist with different minutes', () => {
      const reminder1: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId,
        reminderMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const reminder2: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId,
        reminderMinutes: 120,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() =>
        target.validateNoDuplicateReminder(
          [reminder1, reminder2],
          reminderId,
          reminderMinutes
        )
      ).not.toThrow();
    });

    it('should throw Error when duplicate reminder exists with same minutes', () => {
      const duplicateReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId,
        reminderMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() =>
        target.validateNoDuplicateReminder(
          [duplicateReminder],
          reminderId,
          reminderMinutes
        )
      ).toThrow(Error);
      expect(() =>
        target.validateNoDuplicateReminder(
          [duplicateReminder],
          reminderId,
          reminderMinutes
        )
      ).toThrow('Reminder with this timing already exists for this event');
    });

    it('should throw Error when multiple reminders exist and one is duplicate', () => {
      const reminder1: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId,
        reminderMinutes: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const duplicateReminder: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId,
        reminderMinutes,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const reminder2: EventReminder = {
        id: generateRandomNumbers(),
        calendarEventId,
        reminderMinutes: 120,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() =>
        target.validateNoDuplicateReminder(
          [reminder1, duplicateReminder, reminder2],
          reminderId,
          reminderMinutes
        )
      ).toThrow('Reminder with this timing already exists for this event');
    });
  });
});
