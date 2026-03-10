import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';

export const DeleteEventReminderSwagger: ProtectedActionOptions = {
  tag: 'Calendar Events',
  summary: 'Delete an event reminder',
  additionalResponses: [
    {
      status: 200,
      description: 'Event reminder deleted successfully.',
    },
    {
      status: 404,
      description: 'Event reminder or calendar event not found.',
    },
  ],
};
