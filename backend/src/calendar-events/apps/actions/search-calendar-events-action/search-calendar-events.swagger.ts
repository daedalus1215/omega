import { ProtectedActionOptions } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import {
  OneTimeEventSearchResultDto,
  RecurringSeriesSearchResultDto,
} from '../../dtos/responses/search-calendar-events.response.dto';

export const SearchCalendarEventsSwagger: ProtectedActionOptions = {
  tag: 'Calendar Events',
  summary: 'Search calendar events by name',
  additionalResponses: [
    {
      status: 200,
      description:
        'List of matching recurring series (by next occurrence) and one-time events (by start date).',
      type: [OneTimeEventSearchResultDto, RecurringSeriesSearchResultDto],
    },
    {
      status: 400,
      description: 'Query is missing or shorter than 2 characters.',
    },
  ],
};
