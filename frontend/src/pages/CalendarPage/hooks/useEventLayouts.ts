import { useMemo } from 'react';
import { eachDayOfInterval } from 'date-fns';
import { CalendarEventResponseDto } from '../../../api/dtos/calendar-events.dtos';
import {
  getEventsForDay,
  getEventSlotRange,
  findOverlapGroups,
} from '../utils/event-layout.utils';

export type EventLayout = {
  event: CalendarEventResponseDto;
  columnIndex: number;
  columnCount: number;
  startSlot: number;
  endSlot: number;
  startOffset: number;
  duration: number;
};

export type EventLayoutMap = Map<number, EventLayout>;

/**
 * Assigns column positions to overlapping events using optimal bin packing
 * Events that don't overlap can share columns for better space utilization
 */
const assignOptimalColumns = (
  group: CalendarEventResponseDto[],
  day: Date
): Map<number, { columnIndex: number; columnCount: number }> => {
  // Sort events by start time, then by duration (longer events first)
  const sorted = [...group].sort((a, b) => {
    const aRange = getEventSlotRange(a, day);
    const bRange = getEventSlotRange(b, day);
    const startDiff = aRange.startSlot - bRange.startSlot;
    if (startDiff !== 0) return startDiff;
    // If same start, longer events go first
    return bRange.endSlot - bRange.startSlot - (aRange.endSlot - aRange.startSlot);
  });

  // Track which column ends at what time
  const columns: { endSlot: number }[] = [];
  const assignments = new Map<number, { columnIndex: number }>();

  // Assign each event to the first available column
  sorted.forEach(event => {
    const { startSlot, endSlot } = getEventSlotRange(event, day);

    // Find first column where event fits (column has ended before this event starts)
    let columnIndex = columns.findIndex(col => col.endSlot <= startSlot);

    if (columnIndex === -1) {
      // No available column, create a new one
      columnIndex = columns.length;
      columns.push({ endSlot });
    } else {
      // Update the column's end time
      columns[columnIndex].endSlot = endSlot;
    }

    assignments.set(event.id, { columnIndex });
  });

  // Total columns needed for this group
  const columnCount = columns.length;

  // Build final map with column counts
  const result = new Map<number, { columnIndex: number; columnCount: number }>();
  assignments.forEach((assignment, eventId) => {
    result.set(eventId, {
      columnIndex: assignment.columnIndex,
      columnCount,
    });
  });

  return result;
};

/**
 * Calculate layout positions for events on a specific day.
 * Groups overlapping events and assigns optimal column positions.
 */
const calculateEventLayouts = (
  events: CalendarEventResponseDto[],
  day: Date
): EventLayoutMap => {
  const dayEvents = getEventsForDay(events, day);
  const layoutMap = new Map<number, EventLayout>();
  if (dayEvents.length === 0) {
    return layoutMap;
  }

  const groups = findOverlapGroups(dayEvents, day);

  for (const group of groups) {
    const columnAssignments = assignOptimalColumns(group, day);

    group.forEach(event => {
      const { startSlot, endSlot } = getEventSlotRange(event, day);
      const duration = endSlot - startSlot;
      const startOffset = startSlot % 1;
      const assignment = columnAssignments.get(event.id)!;

      layoutMap.set(event.id, {
        event,
        columnIndex: assignment.columnIndex,
        columnCount: assignment.columnCount,
        startSlot: Math.floor(startSlot),
        endSlot: Math.ceil(endSlot),
        startOffset,
        duration,
      });
    });
  }

  return layoutMap;
};

/**
 * Hook to calculate event layouts for all days in a date range.
 * Memoized to avoid recalculating on every render.
 *
 * @param startDate - The start date of the range (inclusive)
 * @param endDate - The end date of the range (inclusive)
 * @param events - Array of calendar events to layout
 * @returns Map of day ISO strings to event layout maps
 */
export const useEventLayouts = (
  startDate: Date,
  endDate: Date,
  events: CalendarEventResponseDto[]
): Map<string, EventLayoutMap> => {
  return useMemo(() => {
    const days = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });
    const maps = new Map<string, EventLayoutMap>();
    days.forEach(day => {
      maps.set(day.toISOString(), calculateEventLayouts(events, day));
    });
    return maps;
  }, [startDate, endDate, events]);
};
