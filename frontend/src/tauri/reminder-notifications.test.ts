import { describe, expect, it, vi } from 'vitest';
import type { CalendarEventResponseDto } from '../api/dtos/calendar-events.dtos';
import {
  describeLeadTime,
  describeReminder,
  MAX_SCHEDULED_REMINDERS,
  notificationIdFor,
  planReminders,
  reconcileReminders,
  REMINDER_HORIZON_MS,
  type PlannedReminder,
  type ReminderPlan,
  type ReminderScheduler,
} from './reminder-notifications';

// Local times throughout, so the wording checks hold in any time zone.
const NOW = new Date(2026, 9, 24, 9, 0).getTime(); // Sat Oct 24, 9:00 AM

const event = (
  id: number,
  start: Date,
  reminderMinutes: number[],
  patch: Partial<CalendarEventResponseDto> = {}
): CalendarEventResponseDto => ({
  id,
  calendarId: 1,
  userId: 1,
  title: `Event ${id}`,
  startDate: start.toISOString(),
  endDate: new Date(start.getTime() + 3_600_000).toISOString(),
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  reminders: reminderMinutes.map((minutes, index) => ({
    id: id * 10 + index,
    calendarEventId: id,
    reminderMinutes: minutes,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  })),
  ...patch,
});

describe('describeLeadTime', () => {
  it.each([
    [15, '15 minutes'],
    [1, '1 minute'],
    [60, '1 hour'],
    [90, '1 hour 30 minutes'],
    [1440, '1 day'],
    [1500, '1 day 1 hour'],
    [2880, '2 days'],
  ])('describes %i as %s', (minutes, expected) => {
    expect(describeLeadTime(minutes)).toBe(expected);
  });
});

describe('describeReminder', () => {
  const start = new Date(2026, 9, 24, 15, 0);

  it('gives the lead time and the start, same day', () => {
    expect(describeReminder(30, start, new Date(2026, 9, 24, 14, 30))).toBe(
      'In 30 minutes · 3:00 PM'
    );
  });

  it('says "Starting now" for a reminder at the start', () => {
    expect(describeReminder(0, start, start)).toBe('Starting now · 3:00 PM');
  });

  it('says "Tomorrow" when the event is the next day', () => {
    expect(describeReminder(1440, start, new Date(2026, 9, 23, 15, 0))).toBe(
      'In 1 day · Tomorrow, 3:00 PM'
    );
  });

  it('gives the date when the event is further off', () => {
    const later = new Date(2026, 9, 27, 15, 0);
    expect(describeReminder(4320, later, new Date(2026, 9, 24, 15, 0))).toBe(
      'In 3 days · Tue, Oct 27, 3:00 PM'
    );
  });
});

describe('notificationIdFor', () => {
  it('uses server ids as they are', () => {
    expect(notificationIdFor(42)).toBe(42);
  });

  it('moves temp ids into a positive 32-bit range of their own', () => {
    for (const tempId of [-1, -1_792_000_000_123, -Number.MAX_SAFE_INTEGER]) {
      const id = notificationIdFor(tempId);
      expect(id).toBeGreaterThanOrEqual(1_500_000_000);
      expect(id).toBeLessThanOrEqual(2 ** 31 - 1);
    }
  });
});

describe('planReminders', () => {
  it('schedules each reminder its lead time before the start', () => {
    const start = new Date(2026, 9, 24, 15, 0);
    const [first, second] = planReminders(
      [event(1, start, [60, 15], { title: 'Dentist' })],
      NOW
    ).due;
    expect(first.at).toEqual(new Date(2026, 9, 24, 14, 0));
    expect(first.title).toBe('Dentist');
    expect(first.body).toBe('In 1 hour · 3:00 PM');
    expect(second.at).toEqual(new Date(2026, 9, 24, 14, 45));
    expect(first.extra).toMatchObject({
      eventId: 1,
      startDate: start.toISOString(),
    });
  });

  it('schedules none already due, about to be, or past the horizon', () => {
    const { due } = planReminders(
      [
        event(1, new Date(NOW + 30 * 60_000), [60]), // was due half an hour ago
        event(2, new Date(NOW + 5_000), [0]), // too close to hand over
        event(3, new Date(NOW + REMINDER_HORIZON_MS + 120_000), [1]),
        event(4, new Date(NOW + 2 * 3_600_000), [60]),
      ],
      NOW
    );
    expect(due.map(reminder => reminder.extra.eventId)).toEqual([4]);
  });

  it('knows every reminder, scheduled now or not', () => {
    const { due, signatures } = planReminders(
      [
        event(1, new Date(NOW + 5_000), [0]), // too close to schedule
        event(2, new Date(NOW + 3_600_000), [15]),
      ],
      NOW
    );
    expect(due.map(reminder => reminder.id)).toEqual([20]);
    expect([...signatures.keys()].sort()).toEqual([10, 20]);
    expect(signatures.get(20)).toBe(due[0].extra.signature);
  });

  it('puts the soonest first and caps the count', () => {
    const events = Array.from({ length: MAX_SCHEDULED_REMINDERS + 5 }, (_, i) =>
      event(
        i + 1,
        new Date(NOW + (MAX_SCHEDULED_REMINDERS + 5 - i) * 600_000),
        [0]
      )
    );
    const { due } = planReminders(events, NOW);
    expect(due).toHaveLength(MAX_SCHEDULED_REMINDERS);
    const times = due.map(reminder => reminder.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(due[0].extra.eventId).toBe(MAX_SCHEDULED_REMINDERS + 5);
  });

  it('names an untitled event', () => {
    const [planned] = planReminders(
      [event(1, new Date(NOW + 3_600_000), [15], { title: '  ' })],
      NOW
    ).due;
    expect(planned.title).toBe('Untitled event');
  });

  it('skips events without reminders', () => {
    const plan = planReminders(
      [event(1, new Date(NOW + 3_600_000), [], { reminders: undefined })],
      NOW
    );
    expect(plan.due).toEqual([]);
    expect(plan.signatures.size).toBe(0);
  });
});

const planned = (id: number, signature: string): PlannedReminder => ({
  id,
  at: new Date(NOW + id * 60_000),
  title: `Event ${id}`,
  body: 'In 15 minutes · 9:15 AM',
  extra: { eventId: id, startDate: '', signature },
});

/** A plan scheduling `due`, and knowing those plus `alsoKnown` (id → signature). */
const plan = (
  due: PlannedReminder[],
  alsoKnown: [number, string][] = []
): ReminderPlan => ({
  due,
  signatures: new Map([
    ...due.map(reminder => [reminder.id, reminder.extra.signature] as const),
    ...alsoKnown,
  ]),
});

const fakeScheduler = (pending: { id: number; signature: string }[]) => {
  const scheduler = {
    pending: vi.fn(async () => pending),
    cancel: vi.fn(async (_ids: number[]) => undefined),
    schedule: vi.fn(async (_reminders: PlannedReminder[]) => undefined),
  } satisfies ReminderScheduler;
  return scheduler;
};

describe('reconcileReminders', () => {
  it('schedules everything when nothing is pending', async () => {
    const scheduler = fakeScheduler([]);
    const result = await reconcileReminders(
      plan([planned(1, 'a'), planned(2, 'b')]),
      scheduler
    );
    expect(result).toEqual({ scheduled: 2, cancelled: 0 });
    expect(scheduler.cancel).not.toHaveBeenCalled();
    expect(scheduler.schedule).toHaveBeenCalledWith([
      planned(1, 'a'),
      planned(2, 'b'),
    ]);
  });

  it('leaves unchanged reminders alone', async () => {
    const scheduler = fakeScheduler([{ id: 1, signature: 'a' }]);
    const result = await reconcileReminders(plan([planned(1, 'a')]), scheduler);
    expect(result).toEqual({ scheduled: 0, cancelled: 0 });
    expect(scheduler.cancel).not.toHaveBeenCalled();
    expect(scheduler.schedule).not.toHaveBeenCalled();
  });

  it("cancels what's no longer planned", async () => {
    const scheduler = fakeScheduler([
      { id: 1, signature: 'a' },
      { id: 7, signature: 'gone' },
    ]);
    await reconcileReminders(plan([planned(1, 'a')]), scheduler);
    expect(scheduler.cancel).toHaveBeenCalledWith([7]);
    expect(scheduler.schedule).not.toHaveBeenCalled();
  });

  it('replaces a reminder whose event changed', async () => {
    const scheduler = fakeScheduler([{ id: 1, signature: 'old' }]);
    const result = await reconcileReminders(
      plan([planned(1, 'new')]),
      scheduler
    );
    expect(result).toEqual({ scheduled: 1, cancelled: 1 });
    expect(scheduler.cancel).toHaveBeenCalledWith([1]);
    expect(scheduler.schedule).toHaveBeenCalledWith([planned(1, 'new')]);
  });

  it('cancels everything for an empty plan', async () => {
    const scheduler = fakeScheduler([
      { id: 3, signature: 'x' },
      { id: 4, signature: 'y' },
    ]);
    await reconcileReminders(plan([]), scheduler);
    expect(scheduler.cancel).toHaveBeenCalledWith([3, 4]);
  });

  it("keeps an unchanged one that's about to show, or due but not shown yet", async () => {
    // Neither is in `due` any more (too close, or past), but both still
    // match their reminder: cancelling them would lose them.
    const scheduler = fakeScheduler([
      { id: 5, signature: 'in-5-seconds' },
      { id: 6, signature: 'a-second-ago' },
    ]);
    const result = await reconcileReminders(
      plan(
        [],
        [
          [5, 'in-5-seconds'],
          [6, 'a-second-ago'],
        ]
      ),
      scheduler
    );
    expect(result).toEqual({ scheduled: 0, cancelled: 0 });
    expect(scheduler.cancel).not.toHaveBeenCalled();
  });
});
