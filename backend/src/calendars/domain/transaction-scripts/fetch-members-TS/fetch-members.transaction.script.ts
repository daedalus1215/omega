import { ForbiddenException, Injectable } from '@nestjs/common';
import { CalendarMemberRepository } from '../../../infra/repositories/calendar-member.repository';
import { UserAggregator } from '../../../../users/domain/aggregators/user.aggregator';
import { FetchMembersCommand } from './fetch-members.command';
import { CalendarMemberProjection } from './calendar-member.projection';

/**
 * Transaction script for listing a calendar's members, enriched with usernames.
 * Only a member of the calendar may view its membership.
 */
@Injectable()
export class FetchMembersTransactionScript {
  constructor(
    private readonly calendarMemberRepository: CalendarMemberRepository,
    private readonly userAggregator: UserAggregator
  ) {}

  async apply(
    command: FetchMembersCommand
  ): Promise<CalendarMemberProjection[]> {
    const requesterMembership = await this.calendarMemberRepository.findOne(
      command.calendarId,
      command.userId
    );
    if (!requesterMembership) {
      throw new ForbiddenException('You are not a member of this calendar');
    }
    const members = await this.calendarMemberRepository.findByCalendarId(
      command.calendarId
    );
    return await Promise.all(
      members.map(async member => {
        const username = await this.userAggregator.findUsernameById(
          member.userId
        );
        return {
          userId: member.userId,
          username: username ?? 'Unknown user',
          role: member.role,
        };
      })
    );
  }
}
