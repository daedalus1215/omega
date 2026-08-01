import { Injectable, NotFoundException } from '@nestjs/common';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { EventReminderRepository } from '../../../infra/repositories/event-reminder.repository';
import { UpdateCalendarEventCommand } from './update-calendar-event.command';
import { CalendarEvent } from '../../entities/calendar-event.entity';

/**
 * Transaction script for updating calendar events.
 * Encapsulates all business logic for updating calendar events.
 */
@Injectable()
export class UpdateCalendarEventTransactionScript {
  constructor(
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly eventReminderRepository: EventReminderRepository
  ) {}

  /**
   * Update a calendar event.
   * Validates business rules and updates the event.
   */
  async apply(
    command: UpdateCalendarEventCommand,
    calendarIds: number[]
  ): Promise<CalendarEvent> {
    const existingEvent = await this.calendarEventRepository.findById(
      command.eventId,
      calendarIds
    );
    if (!existingEvent) {
      throw new NotFoundException('Calendar event not found');
    }
    if (!command.title || command.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (command.title.length > 255) {
      throw new Error('Title cannot exceed 255 characters');
    }
    if (command.startDate >= command.endDate) {
      throw new Error('End date must be after start date');
    }
    const startDateChanged =
      existingEvent.startDate.getTime() !== command.startDate.getTime();

    const updatedEvent = await this.calendarEventRepository.update(
      command.eventId,
      calendarIds,
      {
        title: command.title.trim(),
        description: command.description?.trim(),
        color: command.color,
        startDate: command.startDate,
        endDate: command.endDate,
      }
    );

    // Reminders fire relative to the start time, so moving the event makes
    // every reminder due again. Without this, a reminder already marked sent
    // for the old time would never fire for the new one.
    if (startDateChanged) {
      await this.eventReminderRepository.resetSentAtByEventId(command.eventId);
    }

    return updatedEvent;
  }
}
