import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { CalendarMemberResponseDto } from '../../dtos/responses/calendar-member.response.dto';

export const FetchMembersSwagger: ProtectedActionOptions = {
  tag: 'Calendar Sharing',
  summary: 'List the members of a calendar',
  additionalResponses: [
    {
      status: 200,
      description: 'Members retrieved.',
      type: [CalendarMemberResponseDto],
    },
    { status: 403, description: 'Not a member of this calendar.' },
  ],
};
