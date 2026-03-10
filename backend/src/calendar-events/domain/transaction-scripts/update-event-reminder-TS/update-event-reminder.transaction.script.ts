import { Injectable, NotFoundException } from '@nestjs/common';
import { EventReminderRepository } from '../../../infra/repositories/event-reminder.repository';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { UpdateEventReminderCommand } from './update-event-reminder.command';
import { EventReminder } from '../../entities/event-reminder.entity';
import { UpdateEventReminderValidator } from './update-event-reminder.validator';

/**
 * Transaction script for updating event reminders.
 * Encapsulates all business logic for updating event reminders.
 */
@Injectable()
export class UpdateEventReminderTransactionScript {
  constructor(
    private readonly eventReminderRepository: EventReminderRepository,
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly validator: UpdateEventReminderValidator
  ) {}

  /**
   * Update an event reminder.
   * Validates business rules and updates the reminder.
   */
  async apply(command: UpdateEventReminderCommand): Promise<EventReminder> {
    // Verify the reminder exists
    const existingReminder = await this.eventReminderRepository.findById(
      command.reminderId
    );
    this.validator.validateReminderExists(existingReminder);

    // Verify the calendar event belongs to the user
    const event = await this.calendarEventRepository.findById(
      existingReminder.calendarEventId,
      command.user.userId
    );
    this.validator.validateCalendarEventExists(event);

    this.validator.validateReminderMinutesArePositive(command.reminderMinutes);

    // Check if another reminder with same minutes already exists for this event
    const existingReminders = await this.eventReminderRepository.findByEventId(
      existingReminder.calendarEventId
    );
    this.validator.validateNoDuplicateReminder(
      existingReminders,
      command.reminderId,
      command.reminderMinutes
    );

    const updatedReminder = await this.eventReminderRepository.update(
      command.reminderId,
      {
        reminderMinutes: command.reminderMinutes,
      }
    );
    return updatedReminder;
  }
}
