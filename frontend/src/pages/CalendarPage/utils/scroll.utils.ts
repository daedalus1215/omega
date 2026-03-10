import { CALENDAR_CONSTANTS } from '../constants/calendar.constants';

/**
 * Scrolls to center an element within its container horizontally
 */
export const scrollToElementHorizontally = (
  container: HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior = 'smooth'
): void => {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const scrollLeft = container.scrollLeft;
  const elementLeft = elementRect.left - containerRect.left + scrollLeft;
  const elementWidth = element.offsetWidth;
  const containerWidth = container.clientWidth;

  // Center the element in the viewport
  const targetScrollLeft =
    elementLeft - containerWidth / 2 + elementWidth / 2;

  container.scrollTo({
    left: targetScrollLeft,
    behavior,
  });
};

/**
 * Scrolls to a specific vertical position based on hour of day
 */
export const scrollToHour = (
  container: HTMLElement,
  hour: number,
  offsetHours: number = CALENDAR_CONSTANTS.SCROLL_TO_NOW_OFFSET_HOURS,
  behavior: ScrollBehavior = 'smooth'
): void => {
  const targetHour = Math.max(0, hour - offsetHours);
  const targetScrollTop = targetHour * CALENDAR_CONSTANTS.SLOT_HEIGHT;

  container.scrollTo({
    top: targetScrollTop,
    behavior,
  });
};

/**
 * Finds an element with retry logic for async rendering
 */
export const findElementWithRetry = async (
  querySelector: string,
  maxAttempts: number = CALENDAR_CONSTANTS.SCROLL_RETRY_ATTEMPTS,
  delayMs: number = 150
): Promise<HTMLElement | null> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const element = document.querySelector(querySelector) as HTMLElement;
    if (element) {
      return element;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return null;
};

/**
 * Preserves scroll position by calculating offset before content changes
 */
export const preserveScrollPosition = (
  container: HTMLElement,
  callback: () => void
): void => {
  const previousScrollWidth = container.scrollWidth;
  const previousScrollLeft = container.scrollLeft;

  callback();

  // After React re-renders, adjust scroll position
  requestAnimationFrame(() => {
    const newScrollWidth = container.scrollWidth;
    const addedWidth = newScrollWidth - previousScrollWidth;
    if (addedWidth > 0) {
      container.scrollLeft = previousScrollLeft + addedWidth;
    }
  });
};

/**
 * Snaps a value to the nearest interval
 */
export const snapToInterval = (value: number, interval: number): number => {
  return Math.round(value / interval) * interval;
};

/**
 * Converts minutes to pixels based on slot height
 */
export const minutesToPixels = (minutes: number): number => {
  return (minutes / 60) * CALENDAR_CONSTANTS.SLOT_HEIGHT;
};

/**
 * Converts pixels to minutes based on slot height
 */
export const pixelsToMinutes = (pixels: number): number => {
  return (pixels / CALENDAR_CONSTANTS.SLOT_HEIGHT) * 60;
};
