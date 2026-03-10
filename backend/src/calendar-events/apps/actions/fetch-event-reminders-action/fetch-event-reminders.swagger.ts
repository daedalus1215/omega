import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { EventReminderResponseDto } from './dtos/responses/event-reminder.response.dto';

export const FetchEventRemindersSwagger: ProtectedActionOptions = {
  tag: 'Calendar Events',
  summary: 'Fetch reminders for a calendar event',
  additionalResponses: [
    {
      status: 200,
      description: 'Reminders fetched successfully.',
      type: [EventReminderResponseDto],
    },
    {
      status: 404,
      description: 'Calendar event not found.',
    },
  ],
};
