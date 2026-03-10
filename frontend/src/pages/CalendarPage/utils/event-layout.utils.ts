import { startOfDay } from 'date-fns';
import { CalendarEventResponseDto } from '../../../api/dtos/calendar-events.dtos';

export type EventSlotRange = {
  startSlot: number;
  endSlot: number;
};

/**
 * Get all events that occur on a specific day.
 * Includes events that start on that day (even if they span multiple days).
 */
export const getEventsForDay = (
  events: CalendarEventResponseDto[],
  day: Date
): CalendarEventResponseDto[] => {
  const dayStart = startOfDay(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);
  return events.filter(event => {
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    return eventStart <= dayEnd && eventEnd >= dayStart;
  });
};

/**
 * Calculate the time slot range for an event on a specific day.
 * Returns the start and end slot indices (0-23 for hours, with fractional parts for minutes).
 */
export const getEventSlotRange = (
  event: CalendarEventResponseDto,
  day: Date
): EventSlotRange => {
  const dayStart = startOfDay(day);
  const eventStart = new Date(event.startDate);
  const eventEnd = new Date(event.endDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);
  const clampedStart = eventStart < dayStart ? dayStart : eventStart;
  const clampedEnd = eventEnd > dayEnd ? dayEnd : eventEnd;
  const startSlot = clampedStart.getHours() + clampedStart.getMinutes() / 60;
  const endSlot = clampedEnd.getHours() + clampedEnd.getMinutes() / 60;
  return { startSlot, endSlot };
};

/**
 * Check if two events overlap in time on a specific day.
 */
export const eventsOverlap = (
  event1: CalendarEventResponseDto,
  event2: CalendarEventResponseDto,
  day: Date
): boolean => {
  const range1 = getEventSlotRange(event1, day);
  const range2 = getEventSlotRange(event2, day);
  return range1.startSlot < range2.endSlot && range2.startSlot < range1.endSlot;
};

/**
 * Find all events that overlap transitively (connected components in overlap graph).
 * Uses union-find approach to group all overlapping events.
 */
export const findOverlapGroups = (
  dayEvents: CalendarEventResponseDto[],
  day: Date
): CalendarEventResponseDto[][] => {
  if (dayEvents.length === 0) {
    return [];
  }
  const parent = new Map<number, number>();
  const find = (id: number): number => {
    if (!parent.has(id)) {
      parent.set(id, id);
    }
    if (parent.get(id) !== id) {
      parent.set(id, find(parent.get(id)!));
    }
    return parent.get(id)!;
  };
  const union = (id1: number, id2: number): void => {
    const root1 = find(id1);
    const root2 = find(id2);
    if (root1 !== root2) {
      parent.set(root1, root2);
    }
  };
  for (let i = 0; i < dayEvents.length; i++) {
    for (let j = i + 1; j < dayEvents.length; j++) {
      if (eventsOverlap(dayEvents[i], dayEvents[j], day)) {
        union(dayEvents[i].id, dayEvents[j].id);
      }
    }
  }
  const groupsMap = new Map<number, CalendarEventResponseDto[]>();
  for (const event of dayEvents) {
    const root = find(event.id);
    if (!groupsMap.has(root)) {
      groupsMap.set(root, []);
    }
    groupsMap.get(root)!.push(event);
  }
  return Array.from(groupsMap.values());
};
