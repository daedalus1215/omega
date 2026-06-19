import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { CalendarResponseDto } from '../../dtos/responses/calendar.response.dto';

export const FetchCalendarsSwagger: ProtectedActionOptions = {
  tag: 'Calendars',
  summary: 'List calendars the user can access',
  additionalResponses: [
    {
      status: 200,
      description: 'Calendars retrieved successfully.',
      type: [CalendarResponseDto],
    },
  ],
};
