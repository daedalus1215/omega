import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCalendarEvent } from '../../../api/requests/calendar-events.requests';
import {
  CreateCalendarEventRequest,
  CalendarEventResponseDto,
} from '../../../api/dtos/calendar-events.dtos';
import { calendarEventKeys } from './useCalendarEvents';

/**
 * Hook to create a new calendar event.
 * Automatically invalidates calendar event queries after successful creation.
 *
 * @returns Mutation object with create function, loading state, and error handling
 */
export const useCreateCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      event: CreateCalendarEventRequest
    ): Promise<CalendarEventResponseDto> => {
      return await createCalendarEvent(event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarEventKeys.all });
    },
  });
};
