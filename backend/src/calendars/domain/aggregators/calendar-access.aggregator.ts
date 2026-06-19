import { Injectable } from '@nestjs/common';
import { CalendarMemberRepository } from '../../infra/repositories/calendar-member.repository';
import { ProvisionPersonalCalendarTransactionScript } from '../transaction-scripts/provision-personal-calendar-TS/provision-personal-calendar.transaction.script';

/**
 * Cross-domain port for the calendars module.
 * This is the ONLY surface other domains (calendar-events, users) may use to
 * resolve calendar access. It never exposes calendar entities or repositories
 * directly, keeping the calendars module decoupled.
 */
@Injectable()
export class CalendarAccessAggregator {
  constructor(
    private readonly calendarMemberRepository: CalendarMemberRepository,
    private readonly provisionPersonalCalendarTransactionScript: ProvisionPersonalCalendarTransactionScript
  ) {}

  /**
   * Calendar ids the user may read and write (full co-ownership in v1).
   */
  async getMemberCalendarIds(userId: number): Promise<number[]> {
    return await this.calendarMemberRepository.findCalendarIdsByUserId(userId);
  }

  /**
   * Whether the user is a member of the given calendar.
   */
  async isMember(userId: number, calendarId: number): Promise<boolean> {
    const member = await this.calendarMemberRepository.findOne(
      calendarId,
      userId
    );
    return member !== null;
  }

  /**
   * Get-or-create the user's personal calendar id.
   * Used as the default target for writes and as a self-healing safety net.
   */
  async getOrCreatePersonalCalendarId(userId: number): Promise<number> {
    return await this.provisionPersonalCalendarTransactionScript.apply({
      userId,
    });
  }
}
