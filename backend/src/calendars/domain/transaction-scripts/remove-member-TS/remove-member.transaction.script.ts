import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CalendarRepository } from '../../../infra/repositories/calendar.repository';
import { CalendarMemberRepository } from '../../../infra/repositories/calendar-member.repository';
import { RemoveMemberCommand } from './remove-member.command';

/**
 * Transaction script for removing a member from a calendar.
 * A member may remove themselves (leave); the owner may remove others. The
 * owner cannot be removed (they delete the calendar instead). Per the
 * revoke-semantics decision, events created by the removed member stay on the
 * calendar.
 */
@Injectable()
export class RemoveMemberTransactionScript {
  constructor(
    private readonly calendarRepository: CalendarRepository,
    private readonly calendarMemberRepository: CalendarMemberRepository
  ) {}

  async apply(command: RemoveMemberCommand): Promise<void> {
    const calendar = await this.calendarRepository.findById(command.calendarId);
    if (!calendar) {
      throw new NotFoundException('Calendar not found');
    }
    const isSelf = command.requesterUserId === command.targetUserId;
    const isOwner = calendar.ownerId === command.requesterUserId;
    if (!isSelf && !isOwner) {
      throw new ForbiddenException(
        'Only the owner can remove other members'
      );
    }
    if (command.targetUserId === calendar.ownerId) {
      throw new ForbiddenException(
        'The owner cannot be removed; delete the calendar instead'
      );
    }
    const targetMembership = await this.calendarMemberRepository.findOne(
      command.calendarId,
      command.targetUserId
    );
    if (!targetMembership) {
      throw new NotFoundException('Member not found');
    }
    await this.calendarMemberRepository.delete(
      command.calendarId,
      command.targetUserId
    );
  }
}
