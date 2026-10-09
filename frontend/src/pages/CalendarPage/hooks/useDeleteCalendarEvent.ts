import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCalendarEvent } from '../../../api/requests/calendar-events.requests';
import { calendarEventKeys } from './useCalendarEvents';

/**
 * Hook to delete a calendar event.
 * Automatically invalidates calendar event queries after successful deletion.
 *
 * @returns Mutation object with delete function, loading state, and error handling
 */
export const useDeleteCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<{ success: boolean }> => {
      return await deleteCalendarEvent(id);
    },
    onSuccess: () => {
      // Only the list queries, not `.all` - invalidating the deleted event's
      // own detail query would refetch it while its modal is still mounted
      // and closing, and the backend correctly 404s an id that's now gone.
      queryClient.invalidateQueries({
        queryKey: calendarEventKeys.lists(),
        refetchType: 'active',
      });
    },
  });
};
