/**
 * Command for inviting a user (by username) to co-manage a calendar.
 */
export type InviteMemberCommand = {
  calendarId: number;
  inviterUserId: number;
  inviteeUsername: string;
};
