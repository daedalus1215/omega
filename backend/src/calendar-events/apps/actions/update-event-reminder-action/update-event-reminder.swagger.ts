import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { EventReminderResponseDto } from './dtos/responses/event-reminder.response.dto';

export const UpdateEventReminderSwagger: ProtectedActionOptions = {
  tag: 'Calendar Events',
  summary: 'Update an event reminder',
  additionalResponses: [
    {
      status: 200,
      description: 'Event reminder updated successfully.',
      type: EventReminderResponseDto,
    },
    {
      status: 400,
      description: 'Invalid request data or validation failed.',
    },
    {
      status: 404,
      description: 'Event reminder or calendar event not found.',
    },
  ],
};
