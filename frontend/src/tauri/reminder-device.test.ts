import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarEventResponseDto } from '../api/dtos/calendar-events.dtos';

const plugin = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  pending: vi.fn(async (): Promise<{ id: number; extra?: unknown }[]> => []),
  cancel: vi.fn(async (_ids: number[]) => undefined),
  cancelAll: vi.fn(async () => undefined),
  onAction: vi.fn(),
}));
const stored = vi.hoisted(() => ({
  events: [] as CalendarEventResponseDto[],
  listEvents: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-notification', async () => {
  // Only to keep Schedule, Importance and Visibility; nothing calls Tauri.
  const actual = await vi.importActual<
    typeof import('@tauri-apps/plugin-notification')
  >('@tauri-apps/plugin-notification');
  return { ...actual, ...plugin };
});
vi.mock('../offline/offline-store', () => ({
  createOfflineStore: () => ({ listEvents: stored.listEvents }),
}));

const loadDevice = () => import('./reminder-device');

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
  stored.events = [];
  stored.listEvents.mockImplementation(async () => stored.events);
});

describe('syncReminders', () => {
  it('schedules each reminder for Android', async () => {
    const start = new Date(Date.now() + 2 * 3_600_000);
    start.setMilliseconds(250);
    stored.events = [event(7, start, 30)];
    const { syncReminders } = await loadDevice();

    await syncReminders();

    expect(plugin.sendNotification).toHaveBeenCalledTimes(1);
    const options = plugin.sendNotification.mock.calls[0][0];
    expect(options).toMatchObject({
      id: 70,
      channelId: 'reminders',
      title: 'Event 7',
      icon: 'ic_stat_omega',
      autoCancel: true,
      extra: { eventId: 7, startDate: start.toISOString() },
    });
    // What the plugin sends on: a whole-second time, allowed in Doze.
    const schedule = JSON.parse(JSON.stringify(options.schedule));
    expect(schedule.at.allowWhileIdle).toBe(true);
    expect(schedule.at.repeating).toBe(false);
    expect(schedule.at.date).toMatch(/T\d\d:\d\d:\d\d\.000Z$/);
    expect(Date.parse(schedule.at.date)).toBe(
      Math.floor((start.getTime() - 30 * 60_000) / 1000) * 1000
    );
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
    expect(plugin.sendNotification).toHaveBeenCalledTimes(1);
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
    const { syncReminders, cancelAllReminders } = await loadDevice();

    const sync = syncReminders();
    await vi.waitFor(() => expect(stored.listEvents).toHaveBeenCalled());
    const cancelled = cancelAllReminders();
    release();
    await Promise.all([sync, cancelled]);

    expect(plugin.sendNotification).toHaveBeenCalledTimes(1);
    expect(plugin.cancelAll.mock.invocationCallOrder[0]).toBeGreaterThan(
      plugin.sendNotification.mock.invocationCallOrder[0]
    );
  });

  it('still runs after a pass that failed', async () => {
    stored.listEvents.mockRejectedValueOnce(new Error('IndexedDB closed'));
    const { syncReminders, cancelAllReminders } = await loadDevice();

    await expect(syncReminders()).rejects.toThrow('IndexedDB closed');
    await cancelAllReminders();
    expect(plugin.cancelAll).toHaveBeenCalledTimes(1);
  });
});

describe('onReminderTapped', () => {
  it("hands over a tapped reminder's event, and ignores other taps", async () => {
    const { onReminderTapped } = await loadDevice();
    const handler = vi.fn();
    await onReminderTapped(handler);
    const tap = plugin.onAction.mock.calls[0][0] as (event: unknown) => void;

    tap({ actionId: 'tap', notification: { extra: {} } });
    tap({ actionId: 'tap', notification: null });
    tap({
      actionId: 'tap',
      notification: {
        extra: { eventId: 7, startDate: '2026-10-24T15:00:00.000Z' },
      },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      eventId: 7,
      startDate: '2026-10-24T15:00:00.000Z',
    });
  });
});
