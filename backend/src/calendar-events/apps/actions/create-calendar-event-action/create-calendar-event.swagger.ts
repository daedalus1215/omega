import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { CalendarEventResponseDto } from '../../dtos/responses/calendar-event.response.dto';

export const CreateCalendarEventSwagger: ProtectedActionOptions = {
  tag: 'Calendar Events',
  summary: 'Create a new calendar event',
  additionalResponses: [
    {
      status: 201,
      description: 'Calendar event created successfully.',
      type: CalendarEventResponseDto,
    },
    {
      status: 400,
      description: 'Invalid request data or validation failed.',
    },
  ],
};
