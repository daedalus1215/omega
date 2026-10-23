import 'fake-indexeddb/auto';
import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';
import { BASE, createCalendarServer, event } from './calendar-test-server';
import { createOfflineAdapter } from './offline-adapter';
import { EVENT_COVERAGE_KEY } from './offline-reads';
import { createOfflineStore } from './offline-store';
import { monthRanges, prefetchCalendar } from './prefetch-calendar';

let dbCounter = 0;

const setup = () => {
  const server = createCalendarServer();
  const store = createOfflineStore(`prefetch-calendar-${++dbCounter}`);
  const api = axios.create({ baseURL: BASE });
  // Like the app's request interceptor.
  api.interceptors.request.use(config => ({
    ...config,
    url: config.url?.startsWith('/api') ? config.url : `/api${config.url}`,
  }));
  api.defaults.adapter = createOfflineAdapter({
    send: server.send,
    store,
    getUri: config => api.getUri(config),
  });
  const sleep = vi.fn(async () => undefined);
  const run = () => prefetchCalendar({ api, store, sleep, spacingMs: 2_500 });
  return { server, store, sleep, run };
};

describe('monthRanges', () => {
  it('covers whole months from 3 back to 12 ahead, as plain dates', () => {
    const ranges = monthRanges(new Date(2026, 9, 22));

    expect(ranges).toHaveLength(16);
    expect(ranges[0]).toEqual(['2026-07-01', '2026-08-01']);
    expect(ranges[5]).toEqual(['2026-12-01', '2027-01-01']);
    expect(ranges.at(-1)).toEqual(['2027-10-01', '2027-11-01']);
  });
});

describe('prefetchCalendar', () => {
  it('fetches the account data, then every month of the window, spaced out', async () => {
    const { server, store, sleep, run } = setup();
    const [startDate] = monthRanges()[4];
    server.state.events.set(
      1,
      event(1, `${startDate}T09:00:00.000Z`, `${startDate}T10:00:00.000Z`)
    );

    expect(await run()).toEqual({ events: 1, outcome: 'complete' });

    const gets = server.state.calls.map(call => call.url);
    expect(gets.slice(0, 3)).toEqual([
      '/api/calendars',
      '/api/users/profile',
      '/api/calendar-invitations',
    ]);
    expect(gets.slice(3)).toEqual(
      monthRanges().map(
        ([start, end]) =>
          `/api/calendar-events?startDate=${start}&endDate=${end}`
      )
    );
    expect(sleep).toHaveBeenCalledTimes(gets.length - 1);
    expect(await store.getEvent(1)).toBeDefined();
  });

  it('pauses once a write is queued, leaving the stored copies alone', async () => {
    const { store, sleep, run } = setup();
    sleep.mockImplementationOnce(async () => {
      await store.enqueue({ method: 'PATCH', url: '/api/calendars/3', data: '{}' });
    });

    expect((await run()).outcome).toBe('paused');
  });

  it('drops events that ended before the window, unless a queued write needs them', async () => {
    const { store, run } = setup();
    await store.putEvent(event(1, '2020-01-01T09:00:00.000Z', '2020-01-01T10:00:00.000Z'));
    await store.setMeta(EVENT_COVERAGE_KEY, [
      { start: Date.UTC(2020, 0, 1), end: Date.UTC(2020, 1, 1) },
    ]);

    expect((await run()).outcome).toBe('complete');

    expect(await store.getEvent(1)).toBeUndefined();
    const [windowStart] = monthRanges()[0];
    const [, windowEnd] = monthRanges().at(-1)!;
    expect(await store.getMeta(EVENT_COVERAGE_KEY)).toEqual([
      { start: Date.parse(windowStart), end: Date.parse(windowEnd) },
    ]);
  });

  it('keeps an old event that a write queued during the run still needs', async () => {
    const { store, sleep, run } = setup();
    await store.putEvent(event(2, '2020-01-01T09:00:00.000Z', '2020-01-01T10:00:00.000Z'));
    // Queued during the last request, after the run's last check of the
    // queue: pruning then has to leave the event alone.
    const lastGap = 3 + monthRanges().length - 1;
    let gaps = 0;
    sleep.mockImplementation(async () => {
      if (++gaps === lastGap) {
        await store.enqueue({
          method: 'PUT',
          url: '/api/calendar-events/2',
          data: '{"title":"edited"}',
        });
      }
    });

    expect((await run()).outcome).toBe('complete');
    expect(await store.getEvent(2)).toBeDefined();
  });

  it('stops at the first sign of an outage, pruning nothing', async () => {
    const { server, store, sleep, run } = setup();
    await store.putEvent(event(1, '2020-01-01T09:00:00.000Z', '2020-01-01T10:00:00.000Z'));
    let requests = 0;
    sleep.mockImplementation(async () => {
      if (++requests === 5) server.state.online = false;
    });

    expect((await run()).outcome).toBe('unreachable');
    expect(await store.getEvent(1)).toBeDefined();
  });
});
