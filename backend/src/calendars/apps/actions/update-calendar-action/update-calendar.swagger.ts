import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { CalendarResponseDto } from '../../dtos/responses/calendar.response.dto';

export const UpdateCalendarSwagger: ProtectedActionOptions = {
  tag: 'Calendars',
  summary: 'Update a calendar (owner only)',
  additionalResponses: [
    {
      status: 200,
      description: 'Calendar updated successfully.',
      type: CalendarResponseDto,
    },
    {
      status: 404,
      description: 'Calendar not found.',
    },
  ],
};
