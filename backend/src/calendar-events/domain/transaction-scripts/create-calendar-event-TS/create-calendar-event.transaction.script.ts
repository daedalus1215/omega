import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { CreateCalendarEventCommand } from './create-calendar-event.command';
import { CalendarEvent } from '../../entities/calendar-event.entity';

/**
 * Transaction script for creating calendar events.
 * Encapsulates all business logic for creating calendar events.
 */
@Injectable()
export class CreateCalendarEventTransactionScript {
  constructor(
    private readonly calendarEventRepository: CalendarEventRepository
  ) {}

  /**
   * Create a new calendar event.
   * Validates business rules and creates the event.
   * @param command - Command containing event data
   * @param manager - Optional EntityManager for transaction support
   */
  async apply(
    command: CreateCalendarEventCommand,
    manager?: EntityManager
  ): Promise<CalendarEvent> {
    if (!command.title || command.title.trim().length === 0) {
      throw new Error('Title is required');
    }
    if (command.title.length > 255) {
      throw new Error('Title cannot exceed 255 characters');
    }
    if (command.startDate >= command.endDate) {
      throw new Error('End date must be after start date');
    }
    const event = await this.calendarEventRepository.create(
      {
        userId: command.user.userId,
        title: command.title.trim(),
        description: command.description?.trim(),
        color: command.color,
        startDate: command.startDate,
        endDate: command.endDate,
      },
      manager
    );
    return event;
  }
}
