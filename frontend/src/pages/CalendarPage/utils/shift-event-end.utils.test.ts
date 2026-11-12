import { describe, expect, it } from 'vitest';
import { shiftEventEnd } from './shift-event-end.utils';

// datetime-local values are local time, so these hold in any time zone.
describe('shiftEventEnd', () => {
  it('moves the end by as much as the start moved', () => {
    const actual = shiftEventEnd({
      previousStart: '2026-11-10T14:00',
      previousEnd: '2026-11-10T15:30',
      nextStart: '2026-11-10T16:00',
    });

    expect(actual).toBe('2026-11-10T17:30');
  });

  it('follows the start to another day', () => {
    const actual = shiftEventEnd({
      previousStart: '2026-11-10T14:00',
      previousEnd: '2026-11-10T15:00',
      nextStart: '2026-11-14T09:00',
    });

    expect(actual).toBe('2026-11-14T10:00');
  });

  it('follows the start earlier too', () => {
    const actual = shiftEventEnd({
      previousStart: '2026-11-10T14:00',
      previousEnd: '2026-11-10T14:45',
      nextStart: '2026-11-09T08:00',
    });

    expect(actual).toBe('2026-11-09T08:45');
  });

  it('keeps a multi-day event its full length', () => {
    const actual = shiftEventEnd({
      previousStart: '2026-11-10T22:00',
      previousEnd: '2026-11-12T10:00',
      nextStart: '2026-11-11T22:00',
    });

    expect(actual).toBe('2026-11-13T10:00');
  });

  it('leaves the end alone while the new start is incomplete', () => {
    const actual = shiftEventEnd({
      previousStart: '2026-11-10T14:00',
      previousEnd: '2026-11-10T15:00',
      nextStart: '',
    });

    expect(actual).toBe('2026-11-10T15:00');
  });

  it('keeps the end when the start was blank and the end is still after it', () => {
    const actual = shiftEventEnd({
      previousStart: '',
      previousEnd: '2026-11-10T15:00',
      nextStart: '2026-11-10T14:00',
    });

    expect(actual).toBe('2026-11-10T15:00');
  });

  it('puts the end after the start when the old end was not', () => {
    const actual = shiftEventEnd({
      previousStart: '2026-11-10T14:00',
      previousEnd: '2026-11-10T13:00',
      nextStart: '2026-11-10T16:00',
      fallbackDurationMinutes: 30,
    });

    expect(actual).toBe('2026-11-10T16:30');
  });

  it('uses an hour when no fallback is given', () => {
    const actual = shiftEventEnd({
      previousStart: '',
      previousEnd: '',
      nextStart: '2026-11-10T23:30',
    });

    expect(actual).toBe('2026-11-11T00:30');
  });
});
