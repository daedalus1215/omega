import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';

export const DeleteCalendarSwagger: ProtectedActionOptions = {
  tag: 'Calendars',
  summary: 'Delete a calendar (owner only, must be empty)',
  additionalResponses: [
    {
      status: 204,
      description: 'Calendar deleted successfully.',
    },
    {
      status: 404,
      description: 'Calendar not found.',
    },
    {
      status: 409,
      description: 'Calendar is not empty.',
    },
  ],
};
