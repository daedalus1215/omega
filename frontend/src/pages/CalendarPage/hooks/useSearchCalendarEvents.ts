import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { searchCalendarEvents } from '../../../api/requests/calendar-events.requests';
import { SearchCalendarEventsResultDto } from '../../../api/dtos/calendar-events.dtos';
import { useDebounce } from '../../../hooks/useDebounce';
import { calendarEventKeys } from './useCalendarEvents';

/** Debounce delay before a search request is fired (ms). */
const SEARCH_DEBOUNCE_MS = 300;

/** The backend rejects queries shorter than this after trimming. */
const MIN_SEARCH_QUERY_LENGTH = 2;

/**
 * Hook to search one-time events and recurring series by event name.
 * Debounces the raw query, trims it, and only fetches when it is long enough
 * for the backend (2+ characters).
 *
 * @param rawQuery - The user's raw search input
 * @returns Object containing results, loading state, and whether a search has been performed
 */
export const useSearchCalendarEvents = (
  rawQuery: string
): {
  results: SearchCalendarEventsResultDto[];
  isLoading: boolean;
  hasSearched: boolean;
} => {
  const debouncedQuery = useDebounce(rawQuery, SEARCH_DEBOUNCE_MS);
  const trimmed = debouncedQuery.trim();

  const { data, isLoading } = useQuery({
    queryKey: [...calendarEventKeys.all, 'search', trimmed],
    enabled: trimmed.length >= MIN_SEARCH_QUERY_LENGTH,
    queryFn: () => searchCalendarEvents(trimmed),
    staleTime: 0,
    // Keep the previous results visible while a new query is in flight.
    placeholderData: keepPreviousData,
  });

  return {
    results: data || [],
    isLoading,
    hasSearched: trimmed.length >= MIN_SEARCH_QUERY_LENGTH && !isLoading,
  };
};
