import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CalendarRepository } from '../../../infra/repositories/calendar.repository';
import { CalendarMemberRepository } from '../../../infra/repositories/calendar-member.repository';
import { CalendarInvitationRepository } from '../../../infra/repositories/calendar-invitation.repository';
import { UserAggregator } from '../../../../users/domain/aggregators/user.aggregator';
import { CalendarInvitation } from '../../entities/calendar-invitation.entity';
import { InviteMemberCommand } from './invite-member.command';

/**
 * Transaction script for inviting a user to co-manage a calendar.
 * Any existing member may invite. Validates the calendar is shareable, the
 * invitee exists, is not the inviter, is not already a member, and has no
 * outstanding invitation.
 */
@Injectable()
export class InviteMemberTransactionScript {
  constructor(
    private readonly calendarRepository: CalendarRepository,
    private readonly calendarMemberRepository: CalendarMemberRepository,
    private readonly calendarInvitationRepository: CalendarInvitationRepository,
    private readonly userAggregator: UserAggregator
  ) {}

  async apply(command: InviteMemberCommand): Promise<CalendarInvitation> {
    const calendar = await this.calendarRepository.findById(command.calendarId);
    if (!calendar) {
      throw new NotFoundException('Calendar not found');
    }
    if (calendar.isPersonal) {
      throw new ForbiddenException('The personal calendar cannot be shared');
    }
    const inviterMembership = await this.calendarMemberRepository.findOne(
      command.calendarId,
      command.inviterUserId
    );
    if (!inviterMembership) {
      throw new ForbiddenException('Only a member can invite others');
    }
    const inviteeId = await this.userAggregator.findUserIdByUsername(
      command.inviteeUsername.trim()
    );
    if (inviteeId === null) {
      throw new NotFoundException('User not found');
    }
    if (inviteeId === command.inviterUserId) {
      throw new ConflictException('You cannot invite yourself');
    }
    const existingMembership = await this.calendarMemberRepository.findOne(
      command.calendarId,
      inviteeId
    );
    if (existingMembership) {
      throw new ConflictException('User is already a member of this calendar');
    }
    const pending = await this.calendarInvitationRepository.findPending(
      command.calendarId,
      inviteeId
    );
    if (pending) {
      throw new ConflictException(
        'There is already a pending invitation for this user'
      );
    }
    return await this.calendarInvitationRepository.create({
      calendarId: command.calendarId,
      inviterId: command.inviterUserId,
      inviteeId,
      status: 'pending',
    });
  }
}
