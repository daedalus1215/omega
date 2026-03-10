import { startOfDay } from 'date-fns';
import { CalendarEventResponseDto } from '../../../api/dtos/calendar-events.dtos';
import { CALENDAR_CONSTANTS } from '../constants/calendar.constants';

export type DropPosition = {
  day: Date;
  hour: number;
  minutes: number;
};

/**
 * Calculate the new start and end dates for an event based on drop position.
 * Maintains the original event duration.
 *
 * @param event - The event being moved
 * @param dropPosition - The position where the event was dropped
 * @returns New start and end dates
 */
export const calculateNewEventTimes = (
  event: CalendarEventResponseDto,
  dropPosition: DropPosition
): { startDate: Date; endDate: Date } => {
  const dayStart = startOfDay(dropPosition.day);
  const newStartDate = new Date(dayStart);
  newStartDate.setHours(dropPosition.hour, dropPosition.minutes, 0, 0);

  const originalStart = new Date(event.startDate);
  const originalEnd = new Date(event.endDate);
  const durationMs = originalEnd.getTime() - originalStart.getTime();

  const newEndDate = new Date(newStartDate.getTime() + durationMs);

  return {
    startDate: newStartDate,
    endDate: newEndDate,
  };
};

/**
 * Calculate drop position from mouse/client coordinates within a day column.
 * Snaps to 15-minute intervals for better UX.
 *
 * @param clientY - Mouse Y coordinate relative to viewport
 * @param dayElement - The day column element
 * @param day - The date for this day column
 * @returns Drop position with day, hour, and minutes
 */
export const calculateDropPosition = (
  clientY: number,
  dayElement: HTMLElement,
  day: Date
): DropPosition | null => {
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
