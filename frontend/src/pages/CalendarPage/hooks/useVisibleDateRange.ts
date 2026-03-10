import { useState, useEffect, useRef } from 'react';
import { isToday } from 'date-fns';
import { CALENDAR_CONSTANTS } from '../constants/calendar.constants';

type UseVisibleDateRangeOptions = {
  containerRef: React.RefObject<HTMLDivElement>;
  days: Date[];
  isMobile: boolean;
};

type VisibleDateRangeReturn = {
  visibleStartDate: Date;
  visibleEndDate: Date;
  visibleDate: Date; // The centered visible day
};

/**
 * Find today in the days array, or return the middle day as fallback
 */
const findInitialVisibleDate = (days: Date[]): Date => {
  const todayDay = days.find(day => isToday(day));
  if (todayDay) {
    return todayDay;
  }
  return days[Math.floor(days.length / 2)] || new Date();
};

/**
 * Hook to calculate the visible date range based on scroll position
 */
export const useVisibleDateRange = ({
  containerRef,
  days,
  isMobile,
}: UseVisibleDateRangeOptions): VisibleDateRangeReturn => {
  // Initialize to today (or middle of range) instead of first day
  const [visibleStartDate, setVisibleStartDate] = useState<Date>(
    () => findInitialVisibleDate(days)
  );
  const [visibleEndDate, setVisibleEndDate] = useState<Date>(
    () => findInitialVisibleDate(days)
  );
  const [visibleDate, setVisibleDate] = useState<Date>(
    () => findInitialVisibleDate(days)
  );
  
  // Keep a ref to the latest days array so the scroll handler always has current data
  const daysRef = useRef(days);
  daysRef.current = days;
  
  // Track if initial scroll has happened to avoid updating from scrollLeft=0
  const hasUserScrolledRef = useRef(false);
  const initialScrollTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const container = containerRef.current;
    if (!container || days.length === 0) {
      return;
    }
    
    // Reset initial scroll time when effect runs
    initialScrollTimeRef.current = Date.now();

    const updateVisibleRange = (isUserScroll: boolean = false) => {
      // Use ref to get latest days array (in case it changed during scroll)
      const currentDays = daysRef.current;
      if (currentDays.length === 0) {
        return;
      }
      
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      
      // Skip updates if scroll position is 0 and we haven't had user interaction yet
      // This prevents showing incorrect date before scroll-to-today completes
      const timeSinceMount = Date.now() - initialScrollTimeRef.current;
      if (scrollLeft === 0 && !hasUserScrolledRef.current && timeSinceMount < 1000) {
        return;
      }
      
      // Mark that we've processed a scroll event
      if (isUserScroll && scrollLeft > 0) {
        hasUserScrolledRef.current = true;
      }
      
      const viewportCenter = scrollLeft + containerWidth / 2;
      
      // Find the day element closest to the viewport center by querying DOM
      // This is more reliable than calculating from indices, especially with variable widths
      const dayElements = container.querySelectorAll('[data-day-id]');
      let closestDay: Date | null = null;
      let closestDistance = Infinity;
      
      dayElements.forEach((element) => {
        const dayElement = element as HTMLElement;
        const rect = dayElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Calculate the center of this day column relative to the scroll container
        const dayCenter = rect.left - containerRect.left + rect.width / 2 + scrollLeft;
        const distance = Math.abs(viewportCenter - dayCenter);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          const dayId = dayElement.getAttribute('data-day-id');
          if (dayId) {
            closestDay = new Date(dayId);
          }
        }
      });
      
      // Fallback to index-based calculation if DOM query fails
      if (!closestDay) {
        const dayWidth = isMobile
          ? CALENDAR_CONSTANTS.MOBILE_DAY_WIDTH
          : CALENDAR_CONSTANTS.DAY_WIDTH;
        
        const centerIndex = Math.max(
          0,
          Math.min(
            currentDays.length - 1,
            Math.round(viewportCenter / dayWidth)
          )
        );
        
        if (currentDays[centerIndex]) {
          closestDay = currentDays[centerIndex];
        }
      }
      
      // Update visible date if we found a day
      if (closestDay) {
        setVisibleDate(closestDay);
      }
      
      // Also update the range for compatibility
      const dayWidth = isMobile
        ? CALENDAR_CONSTANTS.MOBILE_DAY_WIDTH
        : CALENDAR_CONSTANTS.DAY_WIDTH;
      
      const firstVisibleDayIndex = Math.max(
        0,
        Math.floor(scrollLeft / dayWidth)
      );
      const lastVisibleDayIndex = Math.min(
        currentDays.length - 1,
        Math.ceil((scrollLeft + containerWidth) / dayWidth)
      );

      if (currentDays[firstVisibleDayIndex] && currentDays[lastVisibleDayIndex]) {
        setVisibleStartDate(currentDays[firstVisibleDayIndex]);
        setVisibleEndDate(currentDays[lastVisibleDayIndex]);
      }
    };

    const handleScroll = () => {
      requestAnimationFrame(() => updateVisibleRange(true));
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Don't update immediately on mount - wait for scroll-to-today to complete
    // Only update after a delay when scrollLeft > 0
    let rafId: number;
    let timeoutId: NodeJS.Timeout;
    
    // Check after scroll-to-today should have completed
    timeoutId = setTimeout(() => {
      rafId = requestAnimationFrame(() => {
        updateVisibleRange(false);
      });
    }, 500);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [containerRef, days, isMobile]);

  return {
    visibleStartDate,
    visibleEndDate,
    visibleDate,
  };
};
