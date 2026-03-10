import { Injectable } from '@nestjs/common';
import { RecurringEventRepository } from '../../../infra/repositories/recurring-event.repository';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { DeleteRecurringEventCommand } from './delete-recurring-event.command';
import { Logger } from 'nestjs-pino';

/**
 * Transaction script for deleting recurring events.
 * Encapsulates all business logic for deleting recurring events.
 * Note: Event instances are automatically deleted via CASCADE foreign key constraint.
 */
@Injectable()
export class DeleteRecurringEventTransactionScript {
  constructor(
    private readonly logger: Logger,
    private readonly recurringEventRepository: RecurringEventRepository,
    private readonly calendarEventRepository: CalendarEventRepository
  ) {}

  /**
   * Delete a recurring event.
   * Validates that the recurring event exists and belongs to the user.
   * Event instances are automatically deleted via CASCADE foreign key constraint.
   * If the recurring event doesn't exist, still deletes any orphaned instances (idempotent delete).
   */
  async apply(command: DeleteRecurringEventCommand): Promise<void> {
    const existingEvent = await this.recurringEventRepository.findById(
      command.recurringEventId,
      command.user.userId
    );

    if (!existingEvent) {
      // Recurring event doesn't exist - but we should still clean up orphaned instances
      // This handles the case where the recurring event was deleted but instances remain
      const orphanedInstances =
        await this.calendarEventRepository.findByRecurringEventId(
          command.recurringEventId
        );

      // Delete all orphaned instances for this user
      for (const instance of orphanedInstances) {
        if (instance.userId === command.user.userId) {
          await this.calendarEventRepository.delete(
            instance.id,
            command.user.userId
          );
        }
      }

      this.logger.debug(
        'Recurring event not found, cleaned up orphaned instances:',
        {
          recurringEventId: command.recurringEventId,
          userId: command.user.userId,
          instancesDeleted: orphanedInstances.length,
        }
      );
      return;
    }

    // Recurring event exists - delete all instances first, then delete the recurring event
    // Note: calendar_events doesn't have a CASCADE foreign key, so we must delete instances manually
    const instances = await this.calendarEventRepository.findByRecurringEventId(
      command.recurringEventId
    );

    // Delete all instances for this user
    for (const instance of instances) {
      if (instance.userId === command.user.userId) {
        await this.calendarEventRepository.delete(
          instance.id,
          command.user.userId
        );
      }
    }

    // Now delete the recurring event (recurrence exceptions will be deleted via CASCADE)
    await this.recurringEventRepository.delete(
      command.recurringEventId,
      command.user.userId
    );

    this.logger.debug('Deleted recurring event and instances:', {
      recurringEventId: command.recurringEventId,
      userId: command.user.userId,
      instancesDeleted: instances.length,
    });
  }
}
