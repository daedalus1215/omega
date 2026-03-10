import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { CalendarEventResponseDto } from '../../dtos/responses/calendar-event.response.dto';

export const FetchCalendarEventSwagger: ProtectedActionOptions = {
  tag: 'Calendar Events',
  summary: 'Fetch a specific calendar event by ID',
  additionalResponses: [
    {
      status: 200,
      description: 'Calendar event details.',
      type: CalendarEventResponseDto,
    },
    {
      status: 404,
      description: 'Calendar event not found.',
    },
  ],
};
