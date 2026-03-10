import { Injectable, NotFoundException } from '@nestjs/common';
import { EventReminderRepository } from '../../../infra/repositories/event-reminder.repository';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { FetchEventRemindersCommand } from './fetch-event-reminders.command';
import { EventReminder } from '../../entities/event-reminder.entity';

/**
 * Transaction script for fetching event reminders.
 * Encapsulates all business logic for fetching event reminders.
 */
@Injectable()
export class FetchEventRemindersTransactionScript {
  constructor(
    private readonly eventReminderRepository: EventReminderRepository,
    private readonly calendarEventRepository: CalendarEventRepository
  ) {}

  /**
   * Fetch reminders for a calendar event.
   * Validates that the event exists and belongs to the user.
   */
  async apply(command: FetchEventRemindersCommand): Promise<EventReminder[]> {
    // Verify the calendar event exists and belongs to the user
    const event = await this.calendarEventRepository.findById(
      command.calendarEventId,
      command.user.userId
    );
    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }

    const reminders = await this.eventReminderRepository.findByEventId(
      command.calendarEventId
    );
    return reminders;
  }
}
