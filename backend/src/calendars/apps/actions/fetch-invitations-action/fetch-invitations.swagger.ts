import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { PendingInvitationResponseDto } from '../../dtos/responses/pending-invitation.response.dto';

export const FetchInvitationsSwagger: ProtectedActionOptions = {
  tag: 'Calendar Sharing',
  summary: 'List my pending calendar invitations',
  additionalResponses: [
    {
      status: 200,
      description: 'Pending invitations retrieved.',
      type: [PendingInvitationResponseDto],
    },
  ],
};
