import { Injectable, NotFoundException } from '@nestjs/common';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { RecurrenceExceptionRepository } from '../../../infra/repositories/recurrence-exception.repository';
import { RecurringEventRepository } from '../../../infra/repositories/recurring-event.repository';
import { DeleteCalendarEventCommand } from './delete-calendar-event.command';
import { startOfDay } from 'date-fns';
import { Logger } from 'nestjs-pino';

/**
 * Transaction script for deleting calendar events.
 * Encapsulates all business logic for deleting calendar events.
 * Handles both one-time events and recurring event instances (now in single table).
 */
@Injectable()
export class DeleteCalendarEventTransactionScript {
  constructor(
    private readonly logger: Logger,
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly recurrenceExceptionRepository: RecurrenceExceptionRepository,
    private readonly recurringEventRepository: RecurringEventRepository
  ) {}

  /**
   * Delete a calendar event (one-time or instance).
   * Validates that the event exists and belongs to the user.
   * If deleting a recurring event instance, creates a recurrence exception
   * to prevent it from being regenerated on the next fetch.
   */
  async apply(command: DeleteCalendarEventCommand): Promise<void> {
    const calendarEvent = await this.calendarEventRepository.findById(
      command.eventId,
      command.user.userId
    );
    if (!calendarEvent) {
      throw new NotFoundException('Calendar event not found');
    }

    // If this is a recurring event instance, create an exception
    // to prevent it from being regenerated on the next fetch
    // Only create exception if the parent recurring event still exists
    if (
      calendarEvent.recurringEventId !== undefined &&
      calendarEvent.instanceDate
    ) {
      // Check if the parent recurring event exists
      // If it doesn't exist, we don't need to create an exception
      // (the instance can't be regenerated if the parent is gone)
      const parentRecurringEvent = await this.recurringEventRepository.findById(
        calendarEvent.recurringEventId,
        command.user.userId
      );

      if (parentRecurringEvent) {
        const exceptionDate = startOfDay(calendarEvent.instanceDate);

        // Check if exception already exists (idempotent)
        const existingExceptions =
          await this.recurrenceExceptionRepository.findByRecurringEventId(
            calendarEvent.recurringEventId
          );
        const exceptionExists = existingExceptions.some(
          ex =>
            startOfDay(ex.exceptionDate).getTime() === exceptionDate.getTime()
        );

        if (!exceptionExists) {
          try {
            const createdException =
              await this.recurrenceExceptionRepository.create({
                recurringEventId: calendarEvent.recurringEventId,
                exceptionDate,
              });
            this.logger.debug('Created recurrence exception:', {
              id: createdException.id,
              recurringEventId: createdException.recurringEventId,
              exceptionDate: createdException.exceptionDate,
            });
          } catch (error) {
            // Ignore duplicate exception errors (race condition)
            // Also ignore foreign key constraint errors (parent might have been deleted)
            if (
              error instanceof Error &&
              (error.message.includes('UNIQUE constraint') ||
                error.message.includes('FOREIGN KEY constraint'))
            ) {
              this.logger.debug('Exception creation skipped:', error.message);
            } else {
              throw error;
            }
          }
        } else {
          this.logger.debug('Exception already exists, skipping creation');
        }
      } else {
        this.logger.debug(
          'Parent recurring event does not exist, skipping exception creation'
        );
      }
    }

    // Delete the calendar event instance
    await this.calendarEventRepository.delete(
      command.eventId,
      command.user.userId
    );
    this.logger.debug('Deleted calendar event:', {
      eventId: command.eventId,
      userId: command.user.userId,
      wasRecurringInstance: calendarEvent.recurringEventId !== undefined,
    });
  }
}
