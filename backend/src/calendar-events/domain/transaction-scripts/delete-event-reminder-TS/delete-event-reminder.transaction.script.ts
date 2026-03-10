import { Injectable, NotFoundException } from '@nestjs/common';
import { EventReminderRepository } from '../../../infra/repositories/event-reminder.repository';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { DeleteEventReminderCommand } from './delete-event-reminder.command';

/**
 * Transaction script for deleting event reminders.
 * Encapsulates all business logic for deleting event reminders.
 */
@Injectable()
export class DeleteEventReminderTransactionScript {
  constructor(
    private readonly eventReminderRepository: EventReminderRepository,
    private readonly calendarEventRepository: CalendarEventRepository
  ) {}

  /**
   * Delete an event reminder.
   * Validates business rules and deletes the reminder.
   */
  async apply(command: DeleteEventReminderCommand): Promise<void> {
    // Verify the reminder exists
    const existingReminder = await this.eventReminderRepository.findById(
      command.reminderId
    );
    if (!existingReminder) {
      throw new NotFoundException('Event reminder not found');
    }

    // Verify the calendar event belongs to the user
    const event = await this.calendarEventRepository.findById(
      existingReminder.calendarEventId,
      command.user.userId
    );
    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }

    await this.eventReminderRepository.delete(command.reminderId);
  }
}
