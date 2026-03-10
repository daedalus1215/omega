import { Injectable, NotFoundException } from '@nestjs/common';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { FetchCalendarEventCommand } from './fetch-calendar-event.command';
import { CalendarEvent } from '../../entities/calendar-event.entity';

/**
 * Transaction script for fetching a single calendar event by ID.
 * Encapsulates all business logic for fetching calendar events.
 * Now uses a single table for both one-time events and recurring event instances.
 */
@Injectable()
export class FetchCalendarEventTransactionScript {
  constructor(
    private readonly calendarEventRepository: CalendarEventRepository
  ) {}

  /**
   * Fetch a calendar event by ID for a specific user.
   * Handles both one-time events and recurring event instances (now in single table).
   * Throws NotFoundException if event doesn't exist or doesn't belong to user.
   */
  async apply(command: FetchCalendarEventCommand): Promise<CalendarEvent> {
    const calendarEvent = await this.calendarEventRepository.findById(
      command.eventId,
      command.user.userId
    );
    // @TODO: Can be moved to a validator
    if (!calendarEvent) {
      throw new NotFoundException('Calendar event not found');
    }

    // Add metadata for response DTO conversion if it's a recurring instance
    if (calendarEvent.recurringEventId !== undefined) {
      (
        calendarEvent as CalendarEvent & {
          __isRecurring: boolean;
          __recurringEventId: number;
        }
      ).__isRecurring = true;
      (
        calendarEvent as CalendarEvent & {
          __isRecurring: boolean;
          __recurringEventId: number;
        }
      ).__recurringEventId = calendarEvent.recurringEventId;
    }

    return calendarEvent;
  }
}
