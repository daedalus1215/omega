import { Injectable } from '@nestjs/common';
import { InviteMemberTransactionScript } from '../transaction-scripts/invite-member-TS/invite-member.transaction.script';
import { InviteMemberCommand } from '../transaction-scripts/invite-member-TS/invite-member.command';
import { RespondToInvitationTransactionScript } from '../transaction-scripts/respond-to-invitation-TS/respond-to-invitation.transaction.script';
import { RespondToInvitationCommand } from '../transaction-scripts/respond-to-invitation-TS/respond-to-invitation.command';
import { FetchInvitationsTransactionScript } from '../transaction-scripts/fetch-invitations-TS/fetch-invitations.transaction.script';
import { PendingInvitationProjection } from '../transaction-scripts/fetch-invitations-TS/pending-invitation.projection';
import { FetchMembersTransactionScript } from '../transaction-scripts/fetch-members-TS/fetch-members.transaction.script';
import { FetchMembersCommand } from '../transaction-scripts/fetch-members-TS/fetch-members.command';
import { CalendarMemberProjection } from '../transaction-scripts/fetch-members-TS/calendar-member.projection';
import { RemoveMemberTransactionScript } from '../transaction-scripts/remove-member-TS/remove-member.transaction.script';
import { RemoveMemberCommand } from '../transaction-scripts/remove-member-TS/remove-member.command';
import { CalendarInvitation } from '../entities/calendar-invitation.entity';

/**
 * Calendar Sharing Service.
 * Orchestrates invitation and membership transaction scripts.
 */
@Injectable()
export class CalendarSharingService {
  constructor(
    private readonly inviteMemberTransactionScript: InviteMemberTransactionScript,
    private readonly respondToInvitationTransactionScript: RespondToInvitationTransactionScript,
    private readonly fetchInvitationsTransactionScript: FetchInvitationsTransactionScript,
    private readonly fetchMembersTransactionScript: FetchMembersTransactionScript,
    private readonly removeMemberTransactionScript: RemoveMemberTransactionScript
  ) {}

  async inviteMember(command: InviteMemberCommand): Promise<CalendarInvitation> {
    return await this.inviteMemberTransactionScript.apply(command);
  }

  async respondToInvitation(
    command: RespondToInvitationCommand
  ): Promise<void> {
    return await this.respondToInvitationTransactionScript.apply(command);
  }

  async fetchInvitations(
    userId: number
  ): Promise<PendingInvitationProjection[]> {
    return await this.fetchInvitationsTransactionScript.apply(userId);
  }

  async fetchMembers(
    command: FetchMembersCommand
  ): Promise<CalendarMemberProjection[]> {
    return await this.fetchMembersTransactionScript.apply(command);
  }

  async removeMember(command: RemoveMemberCommand): Promise<void> {
    return await this.removeMemberTransactionScript.apply(command);
  }
}
