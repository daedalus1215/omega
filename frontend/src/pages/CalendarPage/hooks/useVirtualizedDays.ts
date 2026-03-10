import { useVirtualizer } from '@tanstack/react-virtual';
import { CALENDAR_CONSTANTS } from '../constants/calendar.constants';

type UseVirtualizedDaysOptions = {
  containerRef: React.RefObject<HTMLDivElement>;
  dayCount: number;
  isMobile: boolean;
  getDayWidth?: (index: number) => number; // Optional function to calculate width per day
};

/**
 * Hook to virtualize day columns for optimal performance
 * Only renders visible columns plus overscan buffer
 * Uses consistent fixed widths for uniform grid layout
 */
export const useVirtualizedDays = ({
  containerRef,
  dayCount,
  isMobile,
}: UseVirtualizedDaysOptions) => {
  // Fixed width for all columns - consistent grid layout
  const fixedDayWidth = isMobile
    ? CALENDAR_CONSTANTS.MOBILE_DAY_WIDTH
    : CALENDAR_CONSTANTS.DAY_WIDTH;

  const virtualizer = useVirtualizer({
    horizontal: true,
    count: dayCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => fixedDayWidth,
    overscan: CALENDAR_CONSTANTS.VIRTUALIZATION_OVERSCAN,
    // Use fixed width measurement - all columns same size
    measureElement: () => fixedDayWidth,
  });

  return virtualizer;
};
