import { startOfDay } from 'date-fns';
import { CalendarEventResponseDto } from '../../../api/dtos/calendar-events.dtos';
import { CALENDAR_CONSTANTS } from '../constants/calendar.constants';

export type ResizeDirection = 'top' | 'bottom';

export type ResizePosition = {
  day: Date;
  hour: number;
  minutes: number;
};

/**
 * Calculate the new start and end dates when resizing an event from the top (start time).
 * The end time remains unchanged.
 *
 * @param event - The event being resized
 * @param resizePosition - The new start position
 * @returns New start and end dates
 */
export const calculateResizeFromTop = (
  event: CalendarEventResponseDto,
  resizePosition: ResizePosition
): { startDate: Date; endDate: Date } => {
  const dayStart = startOfDay(resizePosition.day);
  const newStartDate = new Date(dayStart);
  newStartDate.setHours(resizePosition.hour, resizePosition.minutes, 0, 0);

  const originalEnd = new Date(event.endDate);

  // Ensure new start is before end (minimum 15 minutes)
  const minEndTime = newStartDate.getTime() + CALENDAR_CONSTANTS.DRAG_SNAP_INTERVAL * 60 * 1000;
  if (originalEnd.getTime() < minEndTime) {
    // If resizing would make end before start, adjust end time
    originalEnd.setTime(minEndTime);
  }

  return {
    startDate: newStartDate,
    endDate: originalEnd,
  };
};

/**
 * Calculate the new start and end dates when resizing an event from the bottom (end time).
 * The start time remains unchanged.
 *
 * @param event - The event being resized
 * @param resizePosition - The new end position
 * @returns New start and end dates
 */
export const calculateResizeFromBottom = (
  event: CalendarEventResponseDto,
  resizePosition: ResizePosition
): { startDate: Date; endDate: Date } => {
  const originalStart = new Date(event.startDate);

  const dayStart = startOfDay(resizePosition.day);
  const newEndDate = new Date(dayStart);
  newEndDate.setHours(resizePosition.hour, resizePosition.minutes, 0, 0);

  // Ensure new end is after start (minimum 15 minutes)
  const minEndTime = originalStart.getTime() + CALENDAR_CONSTANTS.DRAG_SNAP_INTERVAL * 60 * 1000;
  if (newEndDate.getTime() < minEndTime) {
    // If resizing would make end before start, adjust end time
    newEndDate.setTime(minEndTime);
  }

  return {
    startDate: originalStart,
    endDate: newEndDate,
  };
};

/**
 * Calculate resize position from mouse/client coordinates within a day column.
 * Snaps to 15-minute intervals.
 *
 * @param clientY - Mouse Y coordinate relative to viewport
 * @param dayElement - The day column element
 * @param day - The date for this day column
 * @returns Resize position with day, hour, and minutes
 */
export const calculateResizePosition = (
  clientY: number,
  dayElement: HTMLElement,
  day: Date
): ResizePosition | null => {
  const dayContent = dayElement.querySelector(
    '[class*="dayContent"]'
  ) as HTMLElement;
  if (!dayContent) {
    return null;
  }

  const rect = dayContent.getBoundingClientRect();
  const relativeY = clientY - rect.top;
  const expectedHeight =
    CALENDAR_CONSTANTS.HOURS_PER_DAY * CALENDAR_CONSTANTS.SLOT_HEIGHT;
  const extraHeight = Math.max(0, rect.height - expectedHeight);
  const usableHeight = Math.max(1, rect.height - extraHeight);

  if (relativeY < 0) {
    return {
      day,
      hour: 0,
      minutes: 0,
    };
  }

  if (relativeY > usableHeight) {
    return {
      day,
      hour: 23,
      minutes: 45,
    };
  }

  const totalMinutes = (relativeY / usableHeight) * (24 * 60);
  const hour = Math.floor(totalMinutes / 60);
  const minutes = Math.floor((totalMinutes % 60) / 15) * 15;

  const clampedHour = Math.min(23, Math.max(0, hour));
  const clampedMinutes = clampedHour === 23 ? 45 : Math.min(45, minutes);

  return {
    day,
    hour: clampedHour,
    minutes: clampedMinutes,
  };
};
