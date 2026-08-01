import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { EventReminderResponseDto } from './dtos/responses/event-reminder.response.dto';

export const SyncEventRemindersSwagger: ProtectedActionOptions = {
  tag: 'Calendar Events',
  summary: "Replace a calendar event's reminders",
  additionalResponses: [
    {
      status: 200,
      description: 'Reminders synced successfully.',
      type: [EventReminderResponseDto],
    },
    {
      status: 400,
      description: 'Invalid offsets, or more reminders than the limit allows.',
    },
    {
      status: 404,
      description: 'Calendar event not found.',
    },
  ],
};
