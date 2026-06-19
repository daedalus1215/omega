/**
 * Command for responding to a calendar invitation.
 */
export type RespondToInvitationCommand = {
  invitationId: number;
  userId: number;
  accept: boolean;
};
