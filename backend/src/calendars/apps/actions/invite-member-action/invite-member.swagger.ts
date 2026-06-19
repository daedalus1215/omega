import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { CalendarInvitationResponseDto } from '../../dtos/responses/calendar-invitation.response.dto';

export const InviteMemberSwagger: ProtectedActionOptions = {
  tag: 'Calendar Sharing',
  summary: 'Invite a user to co-manage a calendar',
  additionalResponses: [
    {
      status: 201,
      description: 'Invitation created.',
      type: CalendarInvitationResponseDto,
    },
    { status: 404, description: 'Calendar or user not found.' },
    { status: 409, description: 'Already a member or already invited.' },
  ],
};
