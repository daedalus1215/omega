import { Injectable } from '@nestjs/common';
import { CalendarRepository } from '../../../infra/repositories/calendar.repository';
import { CalendarMemberRepository } from '../../../infra/repositories/calendar-member.repository';
import { CalendarWithRole } from './calendar-with-role.type';

/**
 * Transaction script for listing the calendars a user can access,
 * each paired with the user's role on it.
 */
@Injectable()
export class FetchCalendarsTransactionScript {
  constructor(
    private readonly calendarRepository: CalendarRepository,
    private readonly calendarMemberRepository: CalendarMemberRepository
  ) {}

  /**
   * Fetch all calendars the user is a member of.
   */
  async apply(userId: number): Promise<CalendarWithRole[]> {
    const memberships =
      await this.calendarMemberRepository.findByUserId(userId);
    const roleByCalendarId = new Map(
      memberships.map(member => [member.calendarId, member.role])
    );
    const calendars = await this.calendarRepository.findByIds(
      memberships.map(member => member.calendarId)
    );
    return calendars.map(calendar => ({
      ...calendar,
      role: roleByCalendarId.get(calendar.id) ?? 'member',
    }));
  }
}
