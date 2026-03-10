/**
 * Date utility functions for consistent date handling across the backend.
 * All functions work with local timezone to ensure dates match user expectations.
 */

/**
 * Gets the current date in YYYY-MM-DD format using local timezone.
 * This is the format used throughout the application for date storage.
 *
 * @returns Current date as YYYY-MM-DD string in local timezone
 */
export const getCurrentDateString = (): string => {
  return new Date().toLocaleDateString('en-CA');
};

/**
 * Gets a date string in YYYY-MM-DD format for a given Date object using local timezone.
 *
 * @param date - The Date object to format
 * @returns Date as YYYY-MM-DD string in local timezone
 */
export const getDateString = (date: Date): string => {
  return date.toLocaleDateString('en-CA');
};

/**
 * Gets the current time in HH:MM format using local timezone.
 * This is the format used for time storage.
 *
 * @returns Current time as HH:MM string in local timezone
 */
export const getCurrentTimeString = (): string => {
  return new Date().toTimeString().slice(0, 5);
};

/**
 * Gets a time string in HH:MM format for a given Date object using local timezone.
 *
 * @param date - The Date object to format
 * @returns Time as HH:MM string in local timezone
 */
export const getTimeString = (date: Date): string => {
  return date.toTimeString().slice(0, 5);
};

/**
 * Parses a date string in YYYY-MM-DD format and returns a Date object.
 * The date is interpreted as local time (not UTC).
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export const parseDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};

/**
 * Gets the start and end dates for a week containing the given date.
 *
 * @param date - The date to get the week for (defaults to current date)
 * @returns Object with weekStartDate and weekEndDate in YYYY-MM-DD format
 */
export const getWeekDateRange = (
  date: Date = new Date()
): { weekStartDate: string; weekEndDate: string } => {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(date);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    weekStartDate: getDateString(startOfWeek),
    weekEndDate: getDateString(endOfWeek),
  };
};
