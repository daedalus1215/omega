import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createRecurringEvent } from '../../../api/requests/calendar-events.requests';
import {
  CreateRecurringEventRequest,
  RecurringEventResponseDto,
} from '../../../api/dtos/calendar-events.dtos';
import { calendarEventKeys } from './useCalendarEvents';

/**
 * Hook to create a new recurring calendar event.
 * Automatically invalidates calendar event queries after successful creation.
 *
 * @returns Mutation object with create function, loading state, and error handling
 */
export const useCreateRecurringEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      event: CreateRecurringEventRequest
    ): Promise<RecurringEventResponseDto> => {
      return await createRecurringEvent(event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarEventKeys.all });
    },
  });
};
