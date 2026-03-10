import { useQuery } from '@tanstack/react-query';
import { fetchCalendarEvent } from '../../../api/requests/calendar-events.requests';
import { calendarEventKeys } from './useCalendarEvents';

/**
 * Hook to fetch a single calendar event by ID.
 * Only fetches when a valid ID is provided.
 *
 * @param id - The calendar event ID, or null to disable fetching
 * @returns Query object with event data, loading state, and error
 */
export const useCalendarEvent = (id: number | null) => {
  return useQuery({
    queryKey: [...calendarEventKeys.all, 'detail', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Event ID is required');
      }
      return await fetchCalendarEvent(id);
    },
    enabled: !!id,
    staleTime: 30000,
  });
};
