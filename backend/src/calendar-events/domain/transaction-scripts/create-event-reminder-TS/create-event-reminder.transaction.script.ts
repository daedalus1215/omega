import { Injectable, NotFoundException } from '@nestjs/common';
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
    manager?: EntityManager
  ): Promise<EventReminder> {
    // Verify the calendar event exists and belongs to the user
    const event = await this.calendarEventRepository.findById(
      command.calendarEventId,
      command.user.userId
    );
    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }

    // Validate reminder minutes is positive
    if (command.reminderMinutes < 0) {
      throw new Error('Reminder minutes must be non-negative');
    }

    // Check if reminder already exists for this event with same minutes
    const existingReminders = await this.eventReminderRepository.findByEventId(
      command.calendarEventId
    );
    const duplicateReminder = existingReminders.find(
      r => r.reminderMinutes === command.reminderMinutes
    );
    if (duplicateReminder) {
      throw new Error(
        'Reminder with this timing already exists for this event'
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
