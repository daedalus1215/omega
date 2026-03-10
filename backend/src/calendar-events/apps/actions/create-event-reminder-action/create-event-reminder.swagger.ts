import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { EventReminderResponseDto } from './dtos/responses/event-reminder.response.dto';

export const CreateEventReminderSwagger: ProtectedActionOptions = {
  tag: 'Calendar Events',
  summary: 'Create a new event reminder',
  additionalResponses: [
    {
      status: 201,
      description: 'Event reminder created successfully.',
      type: EventReminderResponseDto,
    },
    {
      status: 400,
      description: 'Invalid request data or validation failed.',
    },
    {
      status: 404,
      description: 'Calendar event not found.',
    },
  ],
};
