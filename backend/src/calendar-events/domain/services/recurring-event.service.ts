import { ForbiddenException, Injectable } from '@nestjs/common';
import { CreateRecurringEventTransactionScript } from '../transaction-scripts/create-recurring-event-TS/create-recurring-event.transaction.script';
import { CreateRecurringEventCommand } from '../transaction-scripts/create-recurring-event-TS/create-recurring-event.command';
import { DeleteRecurringEventTransactionScript } from '../transaction-scripts/delete-recurring-event-TS/delete-recurring-event.transaction.script';
import { DeleteRecurringEventCommand } from '../transaction-scripts/delete-recurring-event-TS/delete-recurring-event.command';
import { RecurringEvent } from '../entities/recurring-event.entity';
import { CalendarAccessAggregator } from '../../../calendars/domain/aggregators/calendar-access.aggregator';

/**
 * Service for recurring events.
 * Orchestrates transaction scripts and provides high-level business operations.
 */
@Injectable()
export class RecurringEventService {
  constructor(
    private readonly createRecurringEventTransactionScript: CreateRecurringEventTransactionScript,
    private readonly deleteRecurringEventTransactionScript: DeleteRecurringEventTransactionScript,
    private readonly calendarAccessAggregator: CalendarAccessAggregator
  ) {}

  /**
   * Create a new recurring event.
   * Defaults the target calendar to the user's personal calendar, verifying
   * membership when an explicit calendar is requested.
   */
  async createRecurringEvent(
    command: CreateRecurringEventCommand
  ): Promise<RecurringEvent> {
    const calendarId = await this.resolveTargetCalendarId(
      command.user.userId,
      command.calendarId
    );
    return await this.createRecurringEventTransactionScript.apply({
      ...command,
      calendarId,
    });
  }

  private async resolveTargetCalendarId(
    userId: number,
    requestedCalendarId?: number
  ): Promise<number> {
    if (requestedCalendarId === undefined) {
      return await this.calendarAccessAggregator.getOrCreatePersonalCalendarId(
        userId
      );
    }
    const isMember = await this.calendarAccessAggregator.isMember(
      userId,
      requestedCalendarId
    );
    if (!isMember) {
      throw new ForbiddenException('Not a member of the target calendar');
    }
    return requestedCalendarId;
  }

  /**
   * Delete a recurring event.
   * Event instances are automatically deleted via CASCADE foreign key constraint.
   */
  async deleteRecurringEvent(
    command: DeleteRecurringEventCommand
  ): Promise<void> {
    const calendarIds = await this.resolveCalendarIds(command.user.userId);
    return await this.deleteRecurringEventTransactionScript.apply(
      command,
      calendarIds
    );
  }

  private async resolveCalendarIds(userId: number): Promise<number[]> {
    const calendarIds =
      await this.calendarAccessAggregator.getMemberCalendarIds(userId);
    if (calendarIds.length === 0) {
      const personalId =
        await this.calendarAccessAggregator.getOrCreatePersonalCalendarId(
          userId
        );
      return [personalId];
    }
    return calendarIds;
  }
}
