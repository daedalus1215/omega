import { PendingInvitationProjection } from '../../../domain/transaction-scripts/fetch-invitations-TS/pending-invitation.projection';

/**
 * Response shape for a pending invitation shown to the invitee.
 */
export class PendingInvitationResponseDto {
  id: number;
  calendarId: number;
  calendarName: string;
  inviterUsername: string;
  createdAt: Date;

  constructor(projection: PendingInvitationProjection) {
    this.id = projection.id;
    this.calendarId = projection.calendarId;
    this.calendarName = projection.calendarName;
    this.inviterUsername = projection.inviterUsername;
    this.createdAt = projection.createdAt;
  }
}
