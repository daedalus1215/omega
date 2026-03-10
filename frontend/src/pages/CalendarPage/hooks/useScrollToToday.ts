import { useEffect, useState, useCallback, useRef } from 'react';
import { isToday, isWeekend } from 'date-fns';
import { scrollToElementHorizontally, findElementWithRetry, scrollToHour } from '../utils/scroll.utils';
import { CALENDAR_CONSTANTS } from '../constants/calendar.constants';

type UseScrollToTodayOptions = {
  containerRef: React.RefObject<HTMLDivElement>;
  days: Date[];
  isMobile: boolean;
  autoScrollOnMount?: boolean;
  scrollToCurrentTime?: boolean;
};

/**
 * Hook to handle scrolling to today's date and current time
 */
export const useScrollToToday = ({
  containerRef,
  days,
  isMobile,
  autoScrollOnMount = true,
  scrollToCurrentTime = true,
}: UseScrollToTodayOptions) => {
  const [hasScrolledToToday, setHasScrolledToToday] = useState(false);
  const scrollAttemptedRef = useRef(false);
  const isScrollingRef = useRef(false);

  // Store latest values in refs to avoid stale closures
  const daysRef = useRef(days);
  const isMobileRef = useRef(isMobile);
  const scrollToCurrentTimeRef = useRef(scrollToCurrentTime);
  daysRef.current = days;
  isMobileRef.current = isMobile;
  scrollToCurrentTimeRef.current = scrollToCurrentTime;

  const scrollToToday = useCallback(async () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Prevent concurrent scroll attempts
    if (isScrollingRef.current) {
      return;
    }
    isScrollingRef.current = true;

    // Use refs to get latest values
    const currentDays = daysRef.current;
    const currentIsMobile = isMobileRef.current;
    const shouldScrollToCurrentTime = scrollToCurrentTimeRef.current;

    const todayDay = currentDays.find(day => isToday(day));
    if (!todayDay) {
      isScrollingRef.current = false;
      return;
    }

    const delay = currentIsMobile
      ? CALENDAR_CONSTANTS.SCROLL_DELAY_MOBILE
      : CALENDAR_CONSTANTS.SCROLL_DELAY_DESKTOP;

    // Wait for layout to be ready
    await new Promise(resolve => setTimeout(resolve, delay));

    // Calculate today's index and scroll position FIRST (as primary method)
    // This is more reliable than waiting for DOM elements with virtualization
    const todayIndex = currentDays.findIndex(day => isToday(day));
    
    if (todayIndex >= 0) {
      // Calculate scroll position based on index and day widths
      const baseWidth = currentIsMobile
        ? CALENDAR_CONSTANTS.MOBILE_DAY_WIDTH
        : CALENDAR_CONSTANTS.DAY_WIDTH;
      
      // Calculate scroll position by summing widths of days before today
      // Use Math.round to match the virtualizer's calculations
      let estimatedScroll = 0;
      for (let i = 0; i < todayIndex; i++) {
        const day = currentDays[i];
        if (isWeekend(day)) {
          estimatedScroll += Math.round(baseWidth * 0.75); // Weekends are 25% narrower
        } else {
          estimatedScroll += baseWidth;
        }
      }
      
      // Center today in viewport
      const containerWidth = container.clientWidth;
      const todayWidth = Math.round(baseWidth * 1.4); // Today is wider
      const targetScroll = estimatedScroll - containerWidth / 2 + todayWidth / 2;
      
      // Scroll to calculated position immediately (no smooth for initial position)
      // This prevents race conditions with other scroll events
      container.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'instant',
      });
      
      // Scroll vertically to current time
      if (shouldScrollToCurrentTime) {
        const now = new Date();
        scrollToHour(container, now.getHours(), CALENDAR_CONSTANTS.SCROLL_TO_NOW_OFFSET_HOURS, 'instant');
      }
      
      setHasScrolledToToday(true);
      isScrollingRef.current = false;
      
      // Also try to find the element and fine-tune position if available
      // This is a secondary refinement, not the primary method
      const todayElement = await findElementWithRetry(
        `[data-day-id="${todayDay.toISOString()}"]`,
        CALENDAR_CONSTANTS.SCROLL_RETRY_ATTEMPTS,
        delay
      );
      
      if (todayElement) {
        // Fine-tune scroll position using actual element with smooth scroll
        scrollToElementHorizontally(container, todayElement, 'smooth');
      }
      
      return;
    }

    // Fallback: try to find element if index calculation failed
    const todayElement = await findElementWithRetry(
      `[data-day-id="${todayDay.toISOString()}"]`,
      CALENDAR_CONSTANTS.SCROLL_RETRY_ATTEMPTS * 3,
      delay
    );

    if (!todayElement || !container) {
      isScrollingRef.current = false;
      return;
    }

    // Scroll horizontally to today
    scrollToElementHorizontally(container, todayElement, 'instant');

    // Scroll vertically to current time
    if (shouldScrollToCurrentTime) {
      const now = new Date();
      scrollToHour(container, now.getHours(), CALENDAR_CONSTANTS.SCROLL_TO_NOW_OFFSET_HOURS, 'instant');
    }

    setHasScrolledToToday(true);
    isScrollingRef.current = false;
  }, [containerRef]); // Only depend on containerRef - other values accessed via refs

  // Auto-scroll on mount - use refs to avoid dependency on frequently-changing values
  useEffect(() => {
    if (!autoScrollOnMount || hasScrolledToToday || scrollAttemptedRef.current) {
      return;
    }

    // Check if today is in the days array
    const currentDays = daysRef.current;
    const todayDay = currentDays.find(day => isToday(day));
    if (!todayDay) {
      // Today not in range yet, will retry when days array updates
      return;
    }
    
    // Mark as attempted immediately to prevent multiple attempts
    scrollAttemptedRef.current = true;
    
    // Schedule the scroll - use a longer delay to ensure virtualizer is ready
    // Don't store timeout ID in cleanup since we want this to always run once
    const timeoutId = setTimeout(() => {
      scrollToToday();
    }, 100); // Shorter initial delay - scrollToToday has its own delay for layout
    
    return () => {
      clearTimeout(timeoutId);
      // Only reset if we haven't actually scrolled yet
      if (!hasScrolledToToday) {
        scrollAttemptedRef.current = false;
      }
    };
  }, [autoScrollOnMount, hasScrolledToToday, scrollToToday, days.length]); // Use days.length instead of days to reduce re-runs

  return {
    scrollToToday,
    hasScrolledToToday,
  };
};
