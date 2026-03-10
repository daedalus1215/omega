import { Injectable, NotFoundException } from '@nestjs/common';
import { EventReminder } from '../../entities/event-reminder.entity';
import { CalendarEvent } from '../../entities/calendar-event.entity';

/**
 * Validator for update event reminder operations.
 * Encapsulates validation logic for updating event reminders.
 */
@Injectable()
export class UpdateEventReminderValidator {
  /**
   * Validates that a reminder exists.
   * @param reminder - The reminder to validate, or null/undefined if not found
   * @throws NotFoundException if the reminder does not exist
   */
  validateReminderExists(reminder: EventReminder | null): void {
    if (!reminder) {
      throw new NotFoundException('Event reminder not found');
    }
  }

  /**
   * Validates that a calendar event exists.
   * @param event - The calendar event to validate, or null/undefined if not found
   * @throws NotFoundException if the calendar event does not exist
   */
  validateCalendarEventExists(event: CalendarEvent | null): void {
    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }
  }

  /**
   * Validates that reminder minutes is non-negative.
   * @param reminderMinutes - The reminder minutes value to validate
   * @throws Error if reminder minutes is negative
   */
  validateReminderMinutesArePositive(reminderMinutes: number): void {
    if (reminderMinutes < 0) {
      throw new Error('Reminder minutes must be non-negative');
    }
  }

  /**
   * Validates that no duplicate reminder exists with the same timing for the event.
   * @param existingReminders - All reminders for the event
   * @param reminderId - The ID of the reminder being updated (to exclude from duplicate check)
   * @param reminderMinutes - The reminder minutes value to check for duplicates
   * @throws Error if a duplicate reminder with the same timing exists
   */
  validateNoDuplicateReminder(
    existingReminders: EventReminder[],
    reminderId: number,
    reminderMinutes: number
  ): void {
    const duplicateReminder = existingReminders.find(
      r => r.id !== reminderId && r.reminderMinutes === reminderMinutes
    );
    if (duplicateReminder) {
      throw new Error(
        'Reminder with this timing already exists for this event'
      );
    }
  }
}
