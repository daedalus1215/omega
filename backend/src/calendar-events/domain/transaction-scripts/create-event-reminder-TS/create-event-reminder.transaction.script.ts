import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  MAX_REMINDERS_PER_EVENT,
  MAX_REMINDER_MINUTES,
} from '../../reminder.constants';
import { EntityManager } from 'typeorm';
import { EventReminderRepository } from '../../../infra/repositories/event-reminder.repository';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { CreateEventReminderCommand } from './create-event-reminder.command';
import { EventReminder } from '../../entities/event-reminder.entity';

/**
 * Transaction script for creating event reminders.
 * Encapsulates all business logic for creating event reminders.
 */
@Injectable()
export class CreateEventReminderTransactionScript {
  constructor(
    private readonly eventReminderRepository: EventReminderRepository,
    private readonly calendarEventRepository: CalendarEventRepository
  ) {}

  /**
   * Create a new event reminder.
   * Validates business rules and creates the reminder.
   * @param command - Command containing reminder data
   * @param manager - Optional EntityManager for transaction support
   */
  async apply(
    command: CreateEventReminderCommand,
    calendarIds: number[],
    manager?: EntityManager
  ): Promise<EventReminder> {
    // Verify the calendar event exists and is visible to the user.
    // Pass the transaction manager so a just-created event (uncommitted on the
    // default connection) is visible.
    const event = await this.calendarEventRepository.findById(
      command.calendarEventId,
      calendarIds,
      manager
    );
    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }

    // Validate reminder minutes is positive
    if (command.reminderMinutes < 0) {
      throw new Error('Reminder minutes must be non-negative');
    }
    if (command.reminderMinutes > MAX_REMINDER_MINUTES) {
      throw new BadRequestException(
        `Reminder minutes cannot exceed ${MAX_REMINDER_MINUTES}`
      );
    }

    // Check if reminder already exists for this event with same minutes.
    // Use the transaction manager so rows created earlier in this same
    // transaction are visible.
    const existingReminders = await this.eventReminderRepository.findByEventId(
      command.calendarEventId,
      manager
    );
    const duplicateReminder = existingReminders.find(
      r => r.reminderMinutes === command.reminderMinutes
    );
    if (duplicateReminder) {
      throw new Error(
        'Reminder with this timing already exists for this event'
      );
    }
    if (existingReminders.length >= MAX_REMINDERS_PER_EVENT) {
      throw new BadRequestException(
        `An event cannot have more than ${MAX_REMINDERS_PER_EVENT} reminders`
      );
    }

    const reminder = await this.eventReminderRepository.create(
      {
        calendarEventId: command.calendarEventId,
        reminderMinutes: command.reminderMinutes,
      },
      manager
    );
    return reminder;
  }
}
