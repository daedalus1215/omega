import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';

export const RemoveMemberSwagger: ProtectedActionOptions = {
  tag: 'Calendar Sharing',
  summary: 'Remove a member from a calendar (or leave it yourself)',
  additionalResponses: [
    { status: 204, description: 'Member removed.' },
    { status: 403, description: 'Not allowed to remove this member.' },
    { status: 404, description: 'Calendar or member not found.' },
  ],
};
