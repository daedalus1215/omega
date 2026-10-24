import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarEventResponseDto } from '../api/dtos/calendar-events.dtos';

type AndroidReminder = { id: number; signature: string };

/** RemindersPlugin.kt, as far as these tests need it. */
const android = vi.hoisted(() => {
  const state = {
    scheduled: new Map<number, AndroidReminder>(),
    taps: [] as (string | undefined)[],
    onTapped: undefined as (() => void) | undefined,
  };
  const invoke = vi.fn(async (command: string, args?: unknown) => {
    switch (command) {
      case 'plugin:reminders|schedule':
        for (const reminder of (args as { reminders: AndroidReminder[] })
          .reminders) {
          state.scheduled.set(reminder.id, reminder);
        }
        return null;
      case 'plugin:reminders|cancel':
        for (const id of (args as { ids: number[] }).ids) {
          state.scheduled.delete(id);
        }
        return null;
      case 'plugin:reminders|list':
        return { reminders: [...state.scheduled.values()] };
      case 'plugin:reminders|take_tap':
        return { data: state.taps.shift() };
      default:
        throw new Error(`unexpected command ${command}`);
    }
  });
  const addPluginListener = vi.fn(
    async (_plugin: string, _event: string, handler: () => void) => {
      state.onTapped = handler;
      return { unregister: vi.fn(async () => undefined) };
    }
  );
  return { state, invoke, addPluginListener };
});
const notificationPlugin = vi.hoisted(() => ({
  cancel: vi.fn(async (_ids: number[]) => undefined),
}));
const stored = vi.hoisted(() => ({
  events: [] as CalendarEventResponseDto[],
  listEvents: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: android.invoke,
  addPluginListener: android.addPluginListener,
}));
vi.mock('@tauri-apps/plugin-notification', () => notificationPlugin);
vi.mock('../offline/offline-store', () => ({
  createOfflineStore: () => ({ listEvents: stored.listEvents }),
}));

const loadDevice = () => import('./reminder-device');

const commandsCalled = (command: string) =>
  android.invoke.mock.calls.filter(([called]) => called === command);

const event = (
  id: number,
  start: Date,
  minutes: number
): CalendarEventResponseDto => ({
  id,
  calendarId: 1,
  userId: 1,
  title: `Event ${id}`,
  startDate: start.toISOString(),
  endDate: start.toISOString(),
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  reminders: [
    {
      id: id * 10,
      calendarEventId: id,
      reminderMinutes: minutes,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
});

beforeEach(() => {
  // The module keeps its queue and store connection; start each test fresh.
  vi.resetModules();
  vi.clearAllMocks();
  android.state.scheduled.clear();
  android.state.taps = [];
  android.state.onTapped = undefined;
  stored.events = [];
  stored.listEvents.mockImplementation(async () => stored.events);
  const saved = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
  });
});

describe('syncReminders', () => {
  it('schedules each reminder for Android', async () => {
    const start = new Date(Date.now() + 2 * 3_600_000);
    stored.events = [event(7, start, 30)];
    const { syncReminders } = await loadDevice();

    await syncReminders();

    const [[, args]] = commandsCalled('plugin:reminders|schedule');
    const [reminder] = (args as { reminders: Record<string, unknown>[] })
      .reminders;
    expect(reminder).toMatchObject({
      id: 70,
      at: start.getTime() - 30 * 60_000,
      start: start.getTime(),
      title: 'Event 7',
      signature: expect.any(String),
    });
    expect(JSON.parse(reminder.data as string)).toEqual({
      eventId: 7,
      startDate: start.toISOString(),
    });
  });

  it('shares a pass between calls made before it starts', async () => {
    const { syncReminders } = await loadDevice();
    await Promise.all([syncReminders(), syncReminders(), syncReminders()]);
    expect(stored.listEvents).toHaveBeenCalledTimes(1);
  });

  it('runs again for a call made during a pass, with the newer data', async () => {
    let release!: () => void;
    stored.listEvents.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          release = () => resolve([]);
        })
    );
    const { syncReminders } = await loadDevice();

    const first = syncReminders();
    await vi.waitFor(() => expect(stored.listEvents).toHaveBeenCalledTimes(1));
    stored.events = [event(1, new Date(Date.now() + 3_600_000), 15)];
    const second = syncReminders();
    release();
    await Promise.all([first, second]);

    expect(stored.listEvents).toHaveBeenCalledTimes(2);
    expect(commandsCalled('plugin:reminders|schedule')).toHaveLength(1);
  });

  it("cancels the notification plugin's alarms, once", async () => {
    stored.events = [event(7, new Date(Date.now() + 3_600_000), 15)];
    const { syncReminders } = await loadDevice();

    await syncReminders();
    await syncReminders();

    expect(notificationPlugin.cancel).toHaveBeenCalledTimes(1);
    expect(notificationPlugin.cancel).toHaveBeenCalledWith([70]);
    expect(notificationPlugin.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      android.invoke.mock.invocationCallOrder[
        android.invoke.mock.calls.findIndex(
          ([command]) => command === 'plugin:reminders|schedule'
        )
      ]
    );
  });
});

describe('cancelAllReminders', () => {
  it('waits for a pass that is still scheduling', async () => {
    let release!: () => void;
    stored.listEvents.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          release = () =>
            resolve([event(1, new Date(Date.now() + 3_600_000), 15)]);
        })
    );
    const { syncReminders, cancelAllReminders, countScheduledReminders } =
      await loadDevice();

    const sync = syncReminders();
    await vi.waitFor(() => expect(stored.listEvents).toHaveBeenCalled());
    const cancelled = cancelAllReminders();
    release();
    await Promise.all([sync, cancelled]);

    expect(commandsCalled('plugin:reminders|cancel')).toEqual([
      ['plugin:reminders|cancel', { ids: [10] }],
    ]);
    expect(await countScheduledReminders()).toBe(0);
  });

  it('still runs after a pass that failed', async () => {
    android.state.scheduled.set(10, { id: 10, signature: 'x' });
    stored.listEvents.mockRejectedValueOnce(new Error('IndexedDB closed'));
    const { syncReminders, cancelAllReminders } = await loadDevice();

    await expect(syncReminders()).rejects.toThrow('IndexedDB closed');
    await cancelAllReminders();
    expect(android.state.scheduled.size).toBe(0);
  });
});

describe('onReminderTapped', () => {
  const tap = (eventId: number) =>
    JSON.stringify({ eventId, startDate: '2026-10-24T15:00:00.000Z' });

  it('hands over the tap that started the app', async () => {
    android.state.taps = [tap(7)];
    const { onReminderTapped } = await loadDevice();
    const handler = vi.fn();

    await onReminderTapped(handler);

    expect(handler).toHaveBeenCalledWith({
      eventId: 7,
      startDate: '2026-10-24T15:00:00.000Z',
    });
  });

  it('hands over taps while the app runs, and ignores bad ones', async () => {
    const { onReminderTapped } = await loadDevice();
    const handler = vi.fn();
    await onReminderTapped(handler);
    expect(handler).not.toHaveBeenCalled();

    for (const data of ['{"eventId":"7"}', 'not json', tap(8)]) {
      android.state.taps.push(data);
      android.state.onTapped?.();
    }

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(1));
    expect(handler).toHaveBeenCalledWith({
      eventId: 8,
      startDate: '2026-10-24T15:00:00.000Z',
    });
    expect(android.addPluginListener).toHaveBeenCalledWith(
      'reminders',
      'tapped',
      expect.any(Function)
    );
  });
});
