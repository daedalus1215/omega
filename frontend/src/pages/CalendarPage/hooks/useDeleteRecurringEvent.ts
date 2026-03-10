import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteRecurringEvent } from '../../../api/requests/calendar-events.requests';
import { calendarEventKeys } from './useCalendarEvents';

/**
 * Hook to delete an entire recurring event series.
 * Automatically invalidates calendar event queries after successful deletion.
 *
 * @returns Mutation object with delete function, loading state, and error handling
 */
export const useDeleteRecurringEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<{ success: boolean }> => {
      return await deleteRecurringEvent(id);
    },
    onSuccess: () => {
      // Invalidate and refetch all calendar event queries
      queryClient.invalidateQueries({
        queryKey: calendarEventKeys.all,
        refetchType: 'active',
      });
    },
  });
};
