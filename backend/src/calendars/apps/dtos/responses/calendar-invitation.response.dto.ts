import { CalendarInvitation } from '../../../domain/entities/calendar-invitation.entity';
import { InvitationStatus } from '../../../domain/entities/invitation-status.type';

/**
 * Response shape for an invitation as returned to the inviter on creation.
 */
export class CalendarInvitationResponseDto {
  id: number;
  calendarId: number;
  inviteeId: number;
  status: InvitationStatus;
  createdAt: Date;

  constructor(invitation: CalendarInvitation) {
    this.id = invitation.id;
    this.calendarId = invitation.calendarId;
    this.inviteeId = invitation.inviteeId;
    this.status = invitation.status;
    this.createdAt = invitation.createdAt;
  }
}
