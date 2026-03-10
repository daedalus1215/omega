import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCalendarEvent } from '../../../api/requests/calendar-events.requests';
import {
  UpdateCalendarEventRequest,
  CalendarEventResponseDto,
} from '../../../api/dtos/calendar-events.dtos';
import { calendarEventKeys } from './useCalendarEvents';

/**
 * Hook to update an existing calendar event.
 * Automatically invalidates calendar event queries after successful update.
 *
 * @returns Mutation object with update function, loading state, and error handling
 */
export const useUpdateCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      event,
    }: {
      id: number;
      event: UpdateCalendarEventRequest;
    }): Promise<CalendarEventResponseDto> => {
      return await updateCalendarEvent(id, event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarEventKeys.all });
    },
  });
};
