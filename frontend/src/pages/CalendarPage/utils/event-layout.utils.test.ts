import { describe, expect, it } from 'vitest';
import { CalendarEventResponseDto } from '../../../api/dtos/calendar-events.dtos';
import { eventsOverlap, getEventsForDay } from './event-layout.utils';

// Local times, like the calendar's, so the tests hold in any time zone.
const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 9, day, hour, minute);

const event = (
  id: number,
  start: Date,
  end: Date
): CalendarEventResponseDto => ({
  id,
  calendarId: 1,
  userId: 1,
  title: `Event ${id}`,
  startDate: start.toISOString(),
  endDate: end.toISOString(),
  createdAt: start.toISOString(),
  updatedAt: start.toISOString(),
});

describe('getEventsForDay', () => {
  it('includes events that start that day and ones running into it', () => {
    const sameDay = event(1, at(22, 9), at(22, 10));
    const fromYesterday = event(2, at(21, 22), at(22, 1));
    const tomorrow = event(3, at(23, 9), at(23, 10));

    expect(
      getEventsForDay([sameDay, fromYesterday, tomorrow], at(22, 12)).map(
        e => e.id
      )
    ).toEqual([1, 2]);
  });
});

describe('eventsOverlap', () => {
  it('treats back-to-back events as not overlapping', () => {
    const first = event(1, at(22, 9), at(22, 10));
    const touching = event(2, at(22, 10), at(22, 11));
    const inside = event(3, at(22, 9, 30), at(22, 9, 45));

    expect(eventsOverlap(first, touching, at(22, 0))).toBe(false);
    expect(eventsOverlap(first, inside, at(22, 0))).toBe(true);
  });
});
