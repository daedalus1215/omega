import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { CalendarResponseDto } from '../../dtos/responses/calendar.response.dto';

export const CreateCalendarSwagger: ProtectedActionOptions = {
  tag: 'Calendars',
  summary: 'Create a new calendar',
  additionalResponses: [
    {
      status: 201,
      description: 'Calendar created successfully.',
      type: CalendarResponseDto,
    },
    {
      status: 400,
      description: 'Invalid request data or validation failed.',
    },
  ],
};
