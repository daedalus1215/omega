import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { CalendarEventResponseDto } from '../../dtos/responses/calendar-event.response.dto';

export const UpdateCalendarEventSwagger: ProtectedActionOptions = {
  tag: 'Calendar Events',
  summary: 'Update an existing calendar event',
  additionalResponses: [
    {
      status: 200,
      description: 'Calendar event updated successfully.',
      type: CalendarEventResponseDto,
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
