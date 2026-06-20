import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';

export const RespondToInvitationSwagger: ProtectedActionOptions = {
  tag: 'Calendar Sharing',
  summary: 'Accept or decline a calendar invitation',
  additionalResponses: [
    { status: 204, description: 'Response recorded.' },
    { status: 404, description: 'Invitation not found.' },
    { status: 409, description: 'Invitation already answered.' },
  ],
};
