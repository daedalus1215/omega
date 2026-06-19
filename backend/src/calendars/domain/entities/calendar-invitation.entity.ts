import { InvitationStatus } from './invitation-status.type';

/**
 * Domain entity for CalendarInvitation.
 * Pure TypeScript type with no TypeORM dependencies.
 * Represents an invitation for a user to co-manage a calendar.
 */
export type CalendarInvitation = {
  id: number;
  calendarId: number;
  inviterId: number;
  inviteeId: number;
  status: InvitationStatus;
  createdAt: Date;
  respondedAt?: Date;
};
