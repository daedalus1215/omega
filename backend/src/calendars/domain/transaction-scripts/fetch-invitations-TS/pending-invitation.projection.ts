/**
 * A pending invitation enriched for display to the invitee.
 */
export type PendingInvitationProjection = {
  id: number;
  calendarId: number;
  calendarName: string;
  inviterUsername: string;
  createdAt: Date;
};
