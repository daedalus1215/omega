/**
 * Command for removing a member from a calendar (owner removes someone, or a
 * member removes themselves to leave).
 */
export type RemoveMemberCommand = {
  calendarId: number;
  requesterUserId: number;
  targetUserId: number;
};
