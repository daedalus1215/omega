import { useEffect, useRef, useCallback, useState } from 'react';
import { CALENDAR_CONSTANTS } from '../constants/calendar.constants';

type UseInfiniteScrollDaysOptions = {
  containerRef: React.RefObject<HTMLDivElement>;
  onLoadMoreDays: (direction: 'left' | 'right') => void;
  loadThreshold?: number; // Number of days from edge to trigger loading
  totalContentWidth?: number; // Total width of virtualized content (from virtualizer)
};

type UseInfiniteScrollDaysReturn = {
  isLoadingLeft: boolean;
  isLoadingRight: boolean;
};

/**
 * Hook to detect scroll position and trigger loading more days when near edges.
 * Implements infinite scrolling for the calendar view.
 *
 * @param options - Configuration options
 * @param options.containerRef - Ref to the scrollable container
 * @param options.onLoadMoreDays - Callback to load more days
 * @param options.loadThreshold - Days from edge to trigger loading (default from constants)
 */
export const useInfiniteScrollDays = ({
  containerRef,
  onLoadMoreDays,
  loadThreshold = CALENDAR_CONSTANTS.SCROLL_THRESHOLD,
  totalContentWidth,
}: UseInfiniteScrollDaysOptions): UseInfiniteScrollDaysReturn => {
  const isLoadingLeftRef = useRef(false);
  const isLoadingRightRef = useRef(false);
  const dayWidthRef = useRef<number | null>(null);
  const lastLoadTimeRef = useRef<number>(0);
  const lastLoadDirectionRef = useRef<'left' | 'right' | null>(null);
  const mountTimeRef = useRef<number>(Date.now());
  const [isLoadingLeft, setIsLoadingLeft] = useState(false);
  const [isLoadingRight, setIsLoadingRight] = useState(false);

  const calculateDayWidth = useCallback((): number => {
    if (dayWidthRef.current !== null) {
      return dayWidthRef.current;
    }
    // Estimate day width based on container or use default
    const isMobile = window.innerWidth <= 600;
    const estimatedWidth = isMobile
      ? CALENDAR_CONSTANTS.MOBILE_DAY_WIDTH
      : CALENDAR_CONSTANTS.DAY_WIDTH;
    dayWidthRef.current = estimatedWidth;
    return estimatedWidth;
  }, []);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Prevent loading immediately after mount (wait for initial scroll-to-today)
    const now = Date.now();
    if (now - mountTimeRef.current < 500) {
      return;
    }

    // Prevent rapid consecutive loads in the same direction
    // But allow switching directions immediately
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;
    // Use totalContentWidth if provided (from virtualizer), otherwise use scrollWidth
    const scrollWidth = totalContentWidth ?? container.scrollWidth;
    const dayWidth = calculateDayWidth();

    // Calculate how many days from the start/end we are
    const daysFromStart = scrollLeft / dayWidth;
    const daysFromEnd = (scrollWidth - scrollLeft - containerWidth) / dayWidth;

    // Check if we should load more on the left
    if (daysFromStart < loadThreshold) {
      // Don't trigger if already loading left, or if we just loaded left recently
      if (isLoadingLeftRef.current) {
        return;
      }
      if (lastLoadDirectionRef.current === 'left' && timeSinceLastLoad < 300) {
        return;
      }
      
      isLoadingLeftRef.current = true;
      lastLoadTimeRef.current = now;
      lastLoadDirectionRef.current = 'left';
      setIsLoadingLeft(true);
      onLoadMoreDays('left');
      
      // Reset loading flag after a short delay
      setTimeout(() => {
        isLoadingLeftRef.current = false;
        setIsLoadingLeft(false);
      }, 100);
    } else if (daysFromEnd < loadThreshold) {
      // Don't trigger if already loading right, or if we just loaded right recently
      if (isLoadingRightRef.current) {
        return;
      }
      if (lastLoadDirectionRef.current === 'right' && timeSinceLastLoad < 300) {
        return;
      }
      
      isLoadingRightRef.current = true;
      lastLoadTimeRef.current = now;
      lastLoadDirectionRef.current = 'right';
      setIsLoadingRight(true);
      onLoadMoreDays('right');
      
      // Reset loading flag after a short delay
      setTimeout(() => {
        isLoadingRightRef.current = false;
        setIsLoadingRight(false);
      }, 100);
    }
  }, [containerRef, onLoadMoreDays, loadThreshold, calculateDayWidth, totalContentWidth]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Update day width when container size changes
    const updateDayWidth = () => {
      const firstDayElement = container.querySelector(
        '[data-day-id]'
      ) as HTMLElement;
      if (firstDayElement) {
        dayWidthRef.current = firstDayElement.offsetWidth;
      }
    };

    updateDayWidth();

    // Use requestAnimationFrame for smoother scroll detection
    let rafId: number;
    let lastScrollLeft = container.scrollLeft;
    
    const onScroll = () => {
      // Only process if scroll position actually changed significantly
      const currentScrollLeft = container.scrollLeft;
      if (Math.abs(currentScrollLeft - lastScrollLeft) < 5) {
        return;
      }
      lastScrollLeft = currentScrollLeft;
      
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(handleScroll);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateDayWidth);

    return () => {
      container.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateDayWidth);
      cancelAnimationFrame(rafId);
    };
  }, [containerRef, handleScroll]);

  return {
    isLoadingLeft,
    isLoadingRight,
  };
};
