import { CALENDAR_CONSTANTS } from '../constants/calendar.constants';

type DayWidthOptions = {
  isMobile: boolean;
  todayMultiplier?: number; // Multiplier for today's width (default: 1.4 = 40% wider)
  weekendMultiplier?: number; // Multiplier for weekend width (default: 0.75 = 25% narrower)
};

/**
 * Calculate the width for a day column
 * All days have consistent width for a uniform grid view
 * 
 * @param _day - The date (unused, kept for API compatibility)
 * @param options - Configuration options
 * @returns Width in pixels
 */
export const calculateDayWidth = (
  _day: Date,
  options: DayWidthOptions
): number => {
  const { isMobile } = options;

  // All days have the same base width for consistent grid view
  return isMobile
    ? CALENDAR_CONSTANTS.MOBILE_DAY_WIDTH
    : CALENDAR_CONSTANTS.DAY_WIDTH;
};

/**
 * Get width calculation function for use with virtualization
 * Returns a function that can be used to calculate width by index
 */
export const createDayWidthCalculator = (
  days: Date[],
  options: DayWidthOptions
): ((index: number) => number) => {
  return (index: number) => {
    const day = days[index];
    if (!day) {
      // Fallback to base width if day not found
      return options.isMobile
        ? CALENDAR_CONSTANTS.MOBILE_DAY_WIDTH
        : CALENDAR_CONSTANTS.DAY_WIDTH;
    }
    return calculateDayWidth(day, options);
  };
};
