import { Injectable } from '@nestjs/common';
import { CalendarEventRepository } from '../../infra/repositories/calendar-event.repository';
import { RecurringEventRepository } from '../../infra/repositories/recurring-event.repository';

/**
 * Cross-domain port for the calendar-events module.
 * Lets the calendars module ask about event occupancy without reaching into
 * calendar-events repositories or entities directly.
 */
@Injectable()
export class CalendarEventsAggregator {
  constructor(
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly recurringEventRepository: RecurringEventRepository
  ) {}

  /**
   * Whether a calendar holds any one-time or recurring events.
   */
  async hasEventsInCalendar(calendarId: number): Promise<boolean> {
    const eventCount =
      await this.calendarEventRepository.countByCalendarId(calendarId);
    if (eventCount > 0) {
      return true;
    }
    const recurringCount =
      await this.recurringEventRepository.countByCalendarId(calendarId);
    return recurringCount > 0;
  }
}
