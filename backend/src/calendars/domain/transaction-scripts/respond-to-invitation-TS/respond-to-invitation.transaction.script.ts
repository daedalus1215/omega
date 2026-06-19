import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CalendarInvitationRepository } from '../../../infra/repositories/calendar-invitation.repository';
import { CalendarMemberRepository } from '../../../infra/repositories/calendar-member.repository';
import { RespondToInvitationCommand } from './respond-to-invitation.command';

/**
 * Transaction script for accepting or declining a calendar invitation.
 * On accept, the invitation is marked accepted and a member row is created
 * atomically. On decline, only the status changes.
 */
@Injectable()
export class RespondToInvitationTransactionScript {
  constructor(
    private readonly dataSource: DataSource,
    private readonly calendarInvitationRepository: CalendarInvitationRepository,
    private readonly calendarMemberRepository: CalendarMemberRepository
  ) {}

  async apply(command: RespondToInvitationCommand): Promise<void> {
    const invitation = await this.calendarInvitationRepository.findById(
      command.invitationId
    );
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.inviteeId !== command.userId) {
      throw new ForbiddenException('This invitation is not addressed to you');
    }
    if (invitation.status !== 'pending') {
      throw new ConflictException('This invitation has already been answered');
    }
    const respondedAt = new Date();
    if (!command.accept) {
      await this.calendarInvitationRepository.updateStatus(
        invitation.id,
        'declined',
        respondedAt
      );
      return;
    }
    await this.dataSource.transaction(async manager => {
      await this.calendarInvitationRepository.updateStatus(
        invitation.id,
        'accepted',
        respondedAt,
        manager
      );
      const existing = await this.calendarMemberRepository.findOne(
        invitation.calendarId,
        invitation.inviteeId
      );
      if (!existing) {
        await this.calendarMemberRepository.create(
          {
            calendarId: invitation.calendarId,
            userId: invitation.inviteeId,
            role: 'member',
          },
          manager
        );
      }
    });
  }
}
