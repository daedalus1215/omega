import { Injectable } from '@nestjs/common';
import { CalendarInvitationRepository } from '../../../infra/repositories/calendar-invitation.repository';
import { CalendarRepository } from '../../../infra/repositories/calendar.repository';
import { UserAggregator } from '../../../../users/domain/aggregators/user.aggregator';
import { PendingInvitationProjection } from './pending-invitation.projection';

/**
 * Transaction script for listing a user's pending invitations, enriched with
 * the calendar name and inviter username for display.
 */
@Injectable()
export class FetchInvitationsTransactionScript {
  constructor(
    private readonly calendarInvitationRepository: CalendarInvitationRepository,
    private readonly calendarRepository: CalendarRepository,
    private readonly userAggregator: UserAggregator
  ) {}

  async apply(userId: number): Promise<PendingInvitationProjection[]> {
    const invitations =
      await this.calendarInvitationRepository.findPendingByInviteeId(userId);
    return await Promise.all(
      invitations.map(async invitation => {
        const calendar = await this.calendarRepository.findById(
          invitation.calendarId
        );
        const inviterUsername = await this.userAggregator.findUsernameById(
          invitation.inviterId
        );
        return {
          id: invitation.id,
          calendarId: invitation.calendarId,
          calendarName: calendar?.name ?? 'Unknown calendar',
          inviterUsername: inviterUsername ?? 'Unknown user',
          createdAt: invitation.createdAt,
        };
      })
    );
  }
}
