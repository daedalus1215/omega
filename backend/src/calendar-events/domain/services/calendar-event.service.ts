import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CalendarAccessAggregator } from '../../../calendars/domain/aggregators/calendar-access.aggregator';
import { FetchCalendarEventsTransactionScript } from '../transaction-scripts/fetch-calendar-events-TS/fetch-calendar-events.transaction.script';
import { FetchCalendarEventsCommand } from '../transaction-scripts/fetch-calendar-events-TS/fetch-calendar-events.command';
import { CreateCalendarEventTransactionScript } from '../transaction-scripts/create-calendar-event-TS/create-calendar-event.transaction.script';
import { CreateCalendarEventCommand } from '../transaction-scripts/create-calendar-event-TS/create-calendar-event.command';
import { FetchCalendarEventTransactionScript } from '../transaction-scripts/fetch-calendar-event-TS/fetch-calendar-event.transaction.script';
import { FetchCalendarEventCommand } from '../transaction-scripts/fetch-calendar-event-TS/fetch-calendar-event.command';
import { UpdateCalendarEventTransactionScript } from '../transaction-scripts/update-calendar-event-TS/update-calendar-event.transaction.script';
import { UpdateCalendarEventCommand } from '../transaction-scripts/update-calendar-event-TS/update-calendar-event.command';
import { DeleteCalendarEventTransactionScript } from '../transaction-scripts/delete-calendar-event-TS/delete-calendar-event.transaction.script';
import { DeleteCalendarEventCommand } from '../transaction-scripts/delete-calendar-event-TS/delete-calendar-event.command';
import { GenerateEventInstancesTransactionScript } from '../transaction-scripts/generate-event-instances-TS/generate-event-instances.transaction.script';
import { FetchRecurringEventsTransactionScript } from '../transaction-scripts/fetch-recurring-events-TS/fetch-recurring-events.transaction.script';
import { CreateEventReminderTransactionScript } from '../transaction-scripts/create-event-reminder-TS/create-event-reminder.transaction.script';
import { CreateEventReminderCommand } from '../transaction-scripts/create-event-reminder-TS/create-event-reminder.command';
import { SyncEventRemindersCommand } from '../transaction-scripts/sync-event-reminders-TS/sync-event-reminders.command';
import { SyncEventRemindersTransactionScript } from '../transaction-scripts/sync-event-reminders-TS/sync-event-reminders.transaction.script';
import { UpdateEventReminderTransactionScript } from '../transaction-scripts/update-event-reminder-TS/update-event-reminder.transaction.script';
import { UpdateEventReminderCommand } from '../transaction-scripts/update-event-reminder-TS/update-event-reminder.command';
import { DeleteEventReminderTransactionScript } from '../transaction-scripts/delete-event-reminder-TS/delete-event-reminder.transaction.script';
import { DeleteEventReminderCommand } from '../transaction-scripts/delete-event-reminder-TS/delete-event-reminder.command';
import { FetchEventRemindersTransactionScript } from '../transaction-scripts/fetch-event-reminders-TS/fetch-event-reminders.transaction.script';
import { FetchEventRemindersCommand } from '../transaction-scripts/fetch-event-reminders-TS/fetch-event-reminders.command';
import { SearchCalendarEventsTransactionScript } from '../transaction-scripts/search-calendar-events-TS/search-calendar-events.transaction.script';
import { SearchCalendarEventsCommand } from '../transaction-scripts/search-calendar-events-TS/search-calendar-events.command';
import { CalendarEventSearchResult } from '../transaction-scripts/search-calendar-events-TS/search-calendar-events.result';
import { CalendarEvent } from '../entities/calendar-event.entity';
import { EventReminder } from '../entities/event-reminder.entity';
import { CalendarEventRepository } from '../../infra/repositories/calendar-event.repository';
import { RecurringEventRepository } from '../../infra/repositories/recurring-event.repository';
import { EventReminderRepository } from '../../infra/repositories/event-reminder.repository';

/**
 * Calendar Event Service.
 * Orchestrates transaction scripts and provides high-level business operations.
 */
@Injectable()
export class CalendarEventService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly fetchCalendarEventsTransactionScript: FetchCalendarEventsTransactionScript,
    private readonly createCalendarEventTransactionScript: CreateCalendarEventTransactionScript,
    private readonly fetchCalendarEventTransactionScript: FetchCalendarEventTransactionScript,
    private readonly updateCalendarEventTransactionScript: UpdateCalendarEventTransactionScript,
    private readonly deleteCalendarEventTransactionScript: DeleteCalendarEventTransactionScript,
    private readonly generateEventInstancesTransactionScript: GenerateEventInstancesTransactionScript,
    private readonly fetchRecurringEventsTransactionScript: FetchRecurringEventsTransactionScript,
    private readonly searchCalendarEventsTransactionScript: SearchCalendarEventsTransactionScript,
    private readonly createEventReminderTransactionScript: CreateEventReminderTransactionScript,
    private readonly syncEventRemindersTransactionScript: SyncEventRemindersTransactionScript,
    private readonly updateEventReminderTransactionScript: UpdateEventReminderTransactionScript,
    private readonly deleteEventReminderTransactionScript: DeleteEventReminderTransactionScript,
    private readonly fetchEventRemindersTransactionScript: FetchEventRemindersTransactionScript,
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly recurringEventRepository: RecurringEventRepository,
    private readonly eventReminderRepository: EventReminderRepository,
    private readonly calendarAccessAggregator: CalendarAccessAggregator
  ) {}

  /**
   * Resolve the calendars the user can read/write. Falls back to provisioning
   * the personal calendar if the user somehow has no memberships yet.
   */
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

  /**
   * Resolve the target calendar for a write, defaulting to the user's personal
   * calendar and verifying membership when an explicit calendar is requested.
   */
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
   * Fetch calendar events for a user within a date range.
   * Orchestrates instance generation for recurring events before fetching.
   */
  async fetchCalendarEvents(
    command: FetchCalendarEventsCommand
  ): Promise<CalendarEvent[]> {
    const calendarIds = await this.resolveCalendarIds(command.user.userId);
    // Fetch recurring events across the caller's calendars (as domain entities)
    const recurringEvents =
      await this.fetchRecurringEventsTransactionScript.apply(calendarIds);

    // Generate instances for each recurring event in the date range
    // Instances are generated lazily - the generator will skip any that already exist
    for (const recurringEvent of recurringEvents) {
      await this.generateEventInstancesTransactionScript.apply(
        recurringEvent,
        command.startDate,
        command.endDate
      );
    }

    // Now fetch all calendar events (one-time and instances) in date range
    return await this.fetchCalendarEventsTransactionScript.apply(
      command,
      calendarIds
    );
  }

  /**
   * Search calendar events by name across the caller's calendars.
   * Returns recurring series (ordered by next occurrence) followed by
   * one-time events (ordered by start date).
   * Materializes the next upcoming instance for each matching series so
   * callers can link to a concrete calendar event.
   */
  async searchCalendarEvents(
    command: SearchCalendarEventsCommand
  ): Promise<CalendarEventSearchResult[]> {
    const calendarIds = await this.resolveCalendarIds(command.user.userId);
    const results = await this.searchCalendarEventsTransactionScript.apply(
      command,
      calendarIds
    );
    await this.materializeNextInstances(results);
    return results;
  }

  /**
   * Materialize the next upcoming instance for each recurring series search
   * result so callers can link to a concrete calendar event.
   */
  private async materializeNextInstances(
    results: CalendarEventSearchResult[]
  ): Promise<void> {
    for (const result of results) {
      if (
        result.kind !== 'recurring-series' ||
        result.nextOccurrenceDate === undefined
      ) {
        continue;
      }
      const instances =
        await this.generateEventInstancesTransactionScript.apply(
          result.recurrence,
          result.nextOccurrenceDate,
          result.nextOccurrenceDate
        );
      const nextInstance = instances
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
      if (!nextInstance) {
        continue;
      }
      result.nextInstanceId = nextInstance.id;
      result.nextInstanceStartDate = nextInstance.startDate;
      result.nextInstanceEndDate = nextInstance.endDate;
    }
  }

  /**
   * Create a new calendar event.
   * If reminderMinutes is provided, also creates a reminder for the event.
   * Both operations are performed atomically within a single database transaction.
   */
  async createCalendarEvent(
    command: CreateCalendarEventCommand
  ): Promise<CalendarEvent> {
    const calendarId = await this.resolveTargetCalendarId(
      command.user.userId,
      command.calendarId
    );
    return await this.dataSource.transaction(async manager => {
      const event = await this.createCalendarEventTransactionScript.apply(
        { ...command, calendarId },
        manager
      );

      // Deduplicated so a repeated offset does not trip the uniqueness rule.
      const reminderOffsets = [...new Set(command.reminderMinutes ?? [])];
      for (const reminderMinutes of reminderOffsets) {
        const reminderCommand: CreateEventReminderCommand = {
          calendarEventId: event.id,
          reminderMinutes,
          user: command.user,
        };
        await this.createEventReminderTransactionScript.apply(
          reminderCommand,
          [calendarId],
          manager
        );
      }

      return event;
    });
  }

  /**
   * Fetch a calendar event by ID.
   */
  async fetchCalendarEventById(
    command: FetchCalendarEventCommand
  ): Promise<CalendarEvent> {
    const calendarIds = await this.resolveCalendarIds(command.user.userId);
    return await this.fetchCalendarEventTransactionScript.apply(
      command,
      calendarIds
    );
  }

  /**
   * Update a calendar event.
   */
  async updateCalendarEvent(
    command: UpdateCalendarEventCommand
  ): Promise<CalendarEvent> {
    const calendarIds = await this.resolveCalendarIds(command.user.userId);
    return await this.updateCalendarEventTransactionScript.apply(
      command,
      calendarIds
    );
  }

  /**
   * Delete a calendar event.
   */
  async deleteCalendarEvent(
    command: DeleteCalendarEventCommand
  ): Promise<void> {
    const calendarIds = await this.resolveCalendarIds(command.user.userId);
    return await this.deleteCalendarEventTransactionScript.apply(
      command,
      calendarIds
    );
  }

  /**
   * Create an event reminder.
   * If the event is a recurring instance, also updates the template's reminderMinutes
   * so future instances inherit the same reminder.
   */
  async createReminder(
    command: CreateEventReminderCommand
  ): Promise<EventReminder> {
    const calendarIds = await this.resolveCalendarIds(command.user.userId);
    const reminder = await this.createEventReminderTransactionScript.apply(
      command,
      calendarIds
    );
    await this.syncReminderToRecurringTemplate(
      command.calendarEventId,
      command.user.userId,
      command.reminderMinutes
    );
    return reminder;
  }

  /**
   * Update an event reminder.
   * If the event is a recurring instance, also updates the template's reminderMinutes.
   */
  async updateReminder(
    command: UpdateEventReminderCommand
  ): Promise<EventReminder> {
    const calendarIds = await this.resolveCalendarIds(command.user.userId);
    const reminder = await this.updateEventReminderTransactionScript.apply(
      command,
      calendarIds
    );
    await this.syncReminderToRecurringTemplate(
      reminder.calendarEventId,
      command.user.userId,
      command.reminderMinutes
    );
    return reminder;
  }

  /**
   * Delete an event reminder.
   * If the event is a recurring instance, clears the template's reminderMinutes.
   */
  async deleteReminder(command: DeleteEventReminderCommand): Promise<void> {
    const calendarIds = await this.resolveCalendarIds(command.user.userId);
    const reminder = await this.eventReminderRepository.findById(
      command.reminderId
    );
    await this.deleteEventReminderTransactionScript.apply(command, calendarIds);
    if (reminder) {
      await this.syncReminderToRecurringTemplate(
        reminder.calendarEventId,
        command.user.userId,
        null
      );
    }
  }

  /**
   * Replace an event's full set of reminders.
   *
   * Unlike the single-reminder endpoints, this does not propagate to the
   * recurring template. Setting several reminders on one instance is an
   * override of that instance, and the template only has room for one offset
   * anyway, so there would be no correct value to write back.
   */
  async syncReminders(
    command: SyncEventRemindersCommand
  ): Promise<EventReminder[]> {
    const calendarIds = await this.resolveCalendarIds(command.user.userId);
    return await this.dataSource.transaction(async manager => {
      return await this.syncEventRemindersTransactionScript.apply(
        command,
        calendarIds,
        manager
      );
    });
  }

  /**
   * When a reminder is created/updated/deleted on a recurring instance,
   * propagate the change to the recurring event template so future
   * instances inherit the same setting.
   */
  private async syncReminderToRecurringTemplate(
    calendarEventId: number,
    userId: number,
    reminderMinutes: number | null
  ): Promise<void> {
    const calendarIds = await this.resolveCalendarIds(userId);
    const event = await this.calendarEventRepository.findById(
      calendarEventId,
      calendarIds
    );
    if (!event?.recurringEventId) return;

    await this.recurringEventRepository.updateReminderMinutes(
      event.recurringEventId,
      userId,
      reminderMinutes
    );
  }

  /**
   * Get reminders for an event.
   */
  async getRemindersForEvent(
    command: FetchEventRemindersCommand
  ): Promise<EventReminder[]> {
    const calendarIds = await this.resolveCalendarIds(command.user.userId);
    return await this.fetchEventRemindersTransactionScript.apply(
      command,
      calendarIds
    );
  }
}
