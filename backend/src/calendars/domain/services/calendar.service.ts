import { Injectable } from '@nestjs/common';
import { CreateCalendarTransactionScript } from '../transaction-scripts/create-calendar-TS/create-calendar.transaction.script';
import { CreateCalendarCommand } from '../transaction-scripts/create-calendar-TS/create-calendar.command';
import { FetchCalendarsTransactionScript } from '../transaction-scripts/fetch-calendars-TS/fetch-calendars.transaction.script';
import { CalendarWithRole } from '../transaction-scripts/fetch-calendars-TS/calendar-with-role.type';
import { UpdateCalendarTransactionScript } from '../transaction-scripts/update-calendar-TS/update-calendar.transaction.script';
import { UpdateCalendarCommand } from '../transaction-scripts/update-calendar-TS/update-calendar.command';
import { DeleteCalendarTransactionScript } from '../transaction-scripts/delete-calendar-TS/delete-calendar.transaction.script';
import { DeleteCalendarCommand } from '../transaction-scripts/delete-calendar-TS/delete-calendar.command';
import { Calendar } from '../entities/calendar.entity';

/**
 * Calendar Service.
 * Orchestrates calendar CRUD transaction scripts.
 */
@Injectable()
export class CalendarService {
  constructor(
    private readonly createCalendarTransactionScript: CreateCalendarTransactionScript,
    private readonly fetchCalendarsTransactionScript: FetchCalendarsTransactionScript,
    private readonly updateCalendarTransactionScript: UpdateCalendarTransactionScript,
    private readonly deleteCalendarTransactionScript: DeleteCalendarTransactionScript
  ) {}

  /**
   * Create a calendar owned by the user.
   */
  async createCalendar(command: CreateCalendarCommand): Promise<Calendar> {
    return await this.createCalendarTransactionScript.apply(command);
  }

  /**
   * List the calendars the user can access, each with the user's role.
   */
  async fetchCalendars(userId: number): Promise<CalendarWithRole[]> {
    return await this.fetchCalendarsTransactionScript.apply(userId);
  }

  /**
   * Update a calendar's name and/or color.
   */
  async updateCalendar(command: UpdateCalendarCommand): Promise<Calendar> {
    return await this.updateCalendarTransactionScript.apply(command);
  }

  /**
   * Delete a calendar.
   */
  async deleteCalendar(command: DeleteCalendarCommand): Promise<void> {
    return await this.deleteCalendarTransactionScript.apply(command);
  }
}
