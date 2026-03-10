import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { CalendarEventResponseDto } from '../../dtos/responses/calendar-event.response.dto';

export const FetchCalendarEventsSwagger: ProtectedActionOptions = {
  tag: 'Calendar Events',
  summary: 'Get all calendar events within a date range',
  additionalResponses: [
    {
      status: 200,
      description: 'List of calendar events within the specified date range.',
      type: [CalendarEventResponseDto],
    },
    {
      status: 400,
      description: 'Invalid date range or date range exceeds 1 year.',
    },
  ],
};
