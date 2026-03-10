import { Injectable } from '@nestjs/common';
import { CreateRecurringEventTransactionScript } from '../transaction-scripts/create-recurring-event-TS/create-recurring-event.transaction.script';
import { CreateRecurringEventCommand } from '../transaction-scripts/create-recurring-event-TS/create-recurring-event.command';
import { DeleteRecurringEventTransactionScript } from '../transaction-scripts/delete-recurring-event-TS/delete-recurring-event.transaction.script';
import { DeleteRecurringEventCommand } from '../transaction-scripts/delete-recurring-event-TS/delete-recurring-event.command';
import { RecurringEvent } from '../entities/recurring-event.entity';

/**
 * Service for recurring events.
 * Orchestrates transaction scripts and provides high-level business operations.
 */
@Injectable()
export class RecurringEventService {
  constructor(
    private readonly createRecurringEventTransactionScript: CreateRecurringEventTransactionScript,
    private readonly deleteRecurringEventTransactionScript: DeleteRecurringEventTransactionScript
  ) {}

  /**
   * Create a new recurring event.
   */
  async createRecurringEvent(
    command: CreateRecurringEventCommand
  ): Promise<RecurringEvent> {
    return await this.createRecurringEventTransactionScript.apply(command);
  }

  /**
   * Delete a recurring event.
   * Event instances are automatically deleted via CASCADE foreign key constraint.
   */
  async deleteRecurringEvent(
    command: DeleteRecurringEventCommand
  ): Promise<void> {
    return await this.deleteRecurringEventTransactionScript.apply(command);
  }
}
