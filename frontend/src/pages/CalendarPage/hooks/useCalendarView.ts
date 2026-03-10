/**
 * Hook for managing calendar view state with URL query parameters
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export type CalendarViewMode = 'timeline' | 'day' | 'week' | 'month';

interface UseCalendarViewReturn {
  currentView: CalendarViewMode;
  setView: (view: CalendarViewMode) => void;
  isViewAvailable: (view: CalendarViewMode) => boolean;
}

/**
 * Hook to manage calendar view state with URL query parameters
 * View is persisted in the URL: /calendar?view=day|month (timeline is default/clean URL)
 * @returns Object containing current view, setter function, and availability checker
 */
export const useCalendarView = (): UseCalendarViewReturn => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read current view from URL, default to 'timeline'
  const currentView = useMemo<CalendarViewMode>(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && ['timeline', 'day', 'week', 'month'].includes(viewParam)) {
      return viewParam as CalendarViewMode;
    }
    return 'timeline';
  }, [searchParams]);

  // Update URL when view changes
  const setView = useCallback(
    (view: CalendarViewMode) => {
      if (view === 'timeline') {
        // Remove param for default view to keep URL clean
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ view }, { replace: true });
      }
    },
    [setSearchParams]
  );

  const isViewAvailable = useCallback((view: CalendarViewMode): boolean => {
    // Week view is not yet implemented
    if (view === 'week') {
      return false;
    }
    return true;
  }, []);

  return {
    currentView,
    setView,
    isViewAvailable,
  };
};
