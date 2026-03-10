import { Injectable, NotFoundException } from '@nestjs/common';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { UpdateCalendarEventCommand } from './update-calendar-event.command';
import { CalendarEvent } from '../../entities/calendar-event.entity';

/**
 * Transaction script for updating calendar events.
 * Encapsulates all business logic for updating calendar events.
 */
@Injectable()
export class UpdateCalendarEventTransactionScript {
  constructor(
    private readonly calendarEventRepository: CalendarEventRepository
  ) {}

  /**
   * Update a calendar event.
   * Validates business rules and updates the event.
   */
  async apply(command: UpdateCalendarEventCommand): Promise<CalendarEvent> {
    const existingEvent = await this.calendarEventRepository.findById(
      command.eventId,
      command.user.userId
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
    const updatedEvent = await this.calendarEventRepository.update(
      command.eventId,
      command.user.userId,
      {
        title: command.title.trim(),
        description: command.description?.trim(),
        color: command.color,
        startDate: command.startDate,
        endDate: command.endDate,
      }
    );
    return updatedEvent;
  }
}
