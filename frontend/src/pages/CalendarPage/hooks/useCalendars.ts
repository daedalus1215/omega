import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createCalendar,
  deleteCalendar,
  fetchCalendars,
  updateCalendar,
} from '../../../api/requests/calendars.requests';
import {
  CalendarResponseDto,
  CreateCalendarRequest,
  UpdateCalendarRequest,
} from '../../../api/dtos/calendars.dtos';

/**
 * React Query key factory for calendars.
 */
export const calendarKeys = {
  all: ['calendars'] as const,
  lists: () => [...calendarKeys.all, 'list'] as const,
};

/**
 * Hook to fetch the calendars the authenticated user can access.
 */
export const useCalendars = (): {
  calendars: CalendarResponseDto[];
  isLoading: boolean;
  error: Error | null;
} => {
  const { data, isLoading, error } = useQuery({
    queryKey: calendarKeys.lists(),
    queryFn: async () => await fetchCalendars(),
    staleTime: 30_000,
  });
  return {
    calendars: data || [],
    isLoading,
    error: error as Error | null,
  };
};

/**
 * Hook to create a calendar. Invalidates the calendar list on success.
 */
export const useCreateCalendar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (calendar: CreateCalendarRequest) =>
      await createCalendar(calendar),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
};

/**
 * Hook to update a calendar's name/color. Invalidates the calendar list on success.
 */
export const useUpdateCalendar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: number;
      updates: UpdateCalendarRequest;
    }) => await updateCalendar(params.id, params.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
};

/**
 * Hook to delete a calendar. Invalidates the calendar list on success.
 */
export const useDeleteCalendar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => await deleteCalendar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
};
