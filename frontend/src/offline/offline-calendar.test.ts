import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { CalendarEventResponseDto } from '../api/dtos/calendar-events.dtos';
import { event, setupCalendar } from './calendar-test-server';
import { addCoverage, EVENT_COVERAGE_KEY, parseEventRange } from './offline-reads';
import { isTempId } from './temp-ids';

const ids = (events: CalendarEventResponseDto[]) => events.map(e => e.id);

/**
 * The calendar's refetch after an outage, answered by the server. The first
 * request after one is answered from storage while the server is probed in
 * the background; the next goes to the server.
 */
const reconnect = async (
  range: (startDate: string, endDate: string) => Promise<CalendarEventResponseDto[]>
) => {
  await range('2026-10-01', '2026-11-01');
  await new Promise(resolve => setTimeout(resolve, 20));
  return range('2026-10-01', '2026-11-01');
};

describe('offline event reads', () => {
  it('answers any date range offline from the events it has seen', async () => {
    const { server, range } = setupCalendar();
    server.state.events.set(1, event(1, '2026-10-05T09:00:00.000Z', '2026-10-05T10:00:00.000Z'));
    server.state.events.set(2, event(2, '2026-10-12T09:00:00.000Z', '2026-10-12T10:00:00.000Z'));
    server.state.events.set(3, event(3, '2026-10-20T09:00:00.000Z', '2026-10-20T10:00:00.000Z'));
    await range('2026-10-01', '2026-11-01');

    server.state.online = false;
    // A range the calendar never asked for while online.
    expect(ids(await range('2026-10-11', '2026-10-21'))).toEqual([2, 3]);
  });

  it("uses the server's overlap rule, both ends inclusive", async () => {
    const { server, range } = setupCalendar();
    const start = '2026-10-10T00:00:00.000Z';
    const end = '2026-10-12T00:00:00.000Z';
    server.state.events.set(1, event(1, '2026-10-09T23:00:00.000Z', start)); // ends at the start
    server.state.events.set(2, event(2, end, '2026-10-12T01:00:00.000Z')); // starts at the end
    server.state.events.set(3, event(3, '2026-10-09T22:00:00.000Z', '2026-10-09T23:59:59.999Z'));
    server.state.events.set(4, event(4, '2026-10-12T00:00:00.001Z', '2026-10-12T02:00:00.000Z'));
    await range('2026-10-01', '2026-11-01');
    const online = ids(await range('2026-10-10', '2026-10-12'));

    server.state.online = false;
    expect(ids(await range('2026-10-10', '2026-10-12'))).toEqual(online);
    expect(online).toEqual([1, 2]);
  });

  it('reads plain dates as midnight UTC, as the server does', () => {
    expect(
      parseEventRange(new URLSearchParams('startDate=2026-10-10&endDate=2026-10-12'))
    ).toEqual({
      start: Date.UTC(2026, 9, 10),
      end: Date.UTC(2026, 9, 12),
    });
    expect(parseEventRange(new URLSearchParams('startDate=2026-10-10'))).toBeUndefined();
  });

  it('drops events deleted elsewhere, but only within the range fetched', async () => {
    const { server, store, range } = setupCalendar();
    server.state.events.set(1, event(1, '2026-10-05T09:00:00.000Z', '2026-10-05T10:00:00.000Z'));
    server.state.events.set(2, event(2, '2026-12-05T09:00:00.000Z', '2026-12-05T10:00:00.000Z'));
    await range('2026-10-01', '2027-01-01');

    server.state.events.clear();
    await range('2026-10-01', '2026-11-01');

    expect(ids(await store.listEvents())).toEqual([2]);
  });

  it('keeps the local copy of an event while a write to it waits to sync', async () => {
    const { server, store, call, range } = setupCalendar();
    server.state.events.set(5, event(5, '2026-10-05T09:00:00.000Z', '2026-10-05T10:00:00.000Z', { title: 'Old' }));
    server.state.events.set(6, event(6, '2026-10-06T09:00:00.000Z', '2026-10-06T10:00:00.000Z'));
    await range('2026-10-01', '2026-11-01');

    server.state.online = false;
    await call('PUT', '/api/calendar-events/5', { title: 'New', startDate: '2026-10-05T09:00:00.000Z', endDate: '2026-10-05T10:00:00.000Z' });
    await call('DELETE', '/api/calendar-events/6');
    expect(await store.outboxCount()).toBe(2);

    // Back online, the calendar refetches before the queue has drained: the
    // server's answer doesn't have either change yet.
    server.state.online = true;
    const answer = await reconnect(range);

    expect(ids(answer)).toContain(6); // the server's answer goes to the caller
    expect((await store.getEvent(5))?.title).toBe('New');
    expect(await store.getEvent(6)).toBeUndefined();
  });

  it('never drops an event created offline before it syncs', async () => {
    const { server, store, call, range } = setupCalendar();
    server.state.online = false;
    const created = await call('POST', '/api/calendar-events', {
      title: 'Offline',
      startDate: '2026-10-05T09:00:00.000Z',
      endDate: '2026-10-05T10:00:00.000Z',
    });
    await store.removeFromOutbox((await store.peekOutbox())!.seq);

    server.state.online = true;
    await reconnect(range);

    expect(await store.getEvent(created.id)).toBeDefined();
  });

  it("keeps an event's reminders when the single-event answer leaves them out", async () => {
    const { server, store, call, range } = setupCalendar();
    const reminder = { id: 7, calendarEventId: 5, reminderMinutes: 15, sentAt: null, createdAt: '', updatedAt: '' };
    server.state.events.set(5, event(5, '2026-10-05T09:00:00.000Z', '2026-10-05T10:00:00.000Z', { reminders: [reminder] }));
    await range('2026-10-01', '2026-11-01');

    await call('GET', '/api/calendar-events/5');

    expect((await store.getEvent(5))?.reminders).toEqual([reminder]);
    server.state.online = false;
    expect(await call('GET', '/api/calendar-events/5/reminders')).toEqual([reminder]);
  });

  it('records the ranges it has stored, joining those that touch', async () => {
    const { store, range } = setupCalendar();
    await range('2026-10-01', '2026-11-01');
    await range('2026-11-01', '2026-12-01');
    await range('2027-03-01', '2027-04-01');

    expect(await store.getMeta(EVENT_COVERAGE_KEY)).toEqual([
      { start: Date.UTC(2026, 9, 1), end: Date.UTC(2026, 11, 1) },
      { start: Date.UTC(2027, 2, 1), end: Date.UTC(2027, 3, 1) },
    ]);
    expect(addCoverage([], { start: 5, end: 9 })).toEqual([{ start: 5, end: 9 }]);
  });
});

describe('offline event writes', () => {
  it('creates an event offline under a temp id, in the personal calendar, with its reminders', async () => {
    const { server, store, call, range } = setupCalendar();
    await call('GET', '/api/calendars');
    server.state.online = false;

    const created = await call('POST', '/api/calendar-events', {
      title: 'Dentist',
      startDate: '2026-10-05T09:00:00.000Z',
      endDate: '2026-10-05T10:00:00.000Z',
      reminderMinutes: [10, 60],
    });

    expect(isTempId(created.id)).toBe(true);
    expect(created).toMatchObject({ title: 'Dentist', calendarId: 3 });
    expect(created.reminders.map((r: { reminderMinutes: number }) => r.reminderMinutes)).toEqual([10, 60]);
    expect(ids(await range('2026-10-01', '2026-11-01'))).toEqual([created.id]);
    expect(await store.outboxCount()).toBe(1);
  });

  it('syncs an event created, edited and given reminders offline: one create, then the edits against its real id', async () => {
    const { server, store, flusher, call, range } = setupCalendar();
    server.state.online = false;
    const created = await call('POST', '/api/calendar-events', {
      title: 'Draft',
      startDate: '2026-10-05T09:00:00.000Z',
      endDate: '2026-10-05T10:00:00.000Z',
    });
    await call('PUT', `/api/calendar-events/${created.id}`, {
      title: 'Final',
      startDate: '2026-10-05T11:00:00.000Z',
      endDate: '2026-10-05T12:00:00.000Z',
    });
    await call('PUT', `/api/calendar-events/${created.id}/reminders`, { reminderMinutes: [30] });
    expect((await range('2026-10-01', '2026-11-01'))[0]).toMatchObject({ title: 'Final' });

    server.state.online = true;
    expect(await flusher.flush()).toBe('drained');

    const writes = server.state.calls.filter(c => c.method !== 'GET');
    expect(writes.map(c => `${c.method} ${c.url}`)).toEqual([
      'POST /api/calendar-events',
      'PUT /api/calendar-events/100',
      'PUT /api/calendar-events/100/reminders',
    ]);
    expect(server.state.events.get(100)).toMatchObject({ title: 'Final' });
    expect(await store.getEvent(created.id)).toBeUndefined();
    expect(await store.getEvent(100)).toMatchObject({ title: 'Final' });
  });

  it('sends nothing for an event created and deleted before it ever synced', async () => {
    const { server, store, flusher, call } = setupCalendar();
    server.state.online = false;
    const created = await call('POST', '/api/calendar-events', {
      title: 'Never mind',
      startDate: '2026-10-05T09:00:00.000Z',
      endDate: '2026-10-05T10:00:00.000Z',
    });
    await call('PUT', `/api/calendar-events/${created.id}`, { title: 'Still never mind' });
    await call('DELETE', `/api/calendar-events/${created.id}`);

    expect(await store.outboxCount()).toBe(0);
    server.state.online = true;
    await flusher.flush();
    expect(server.state.calls).toEqual([]);
  });

  it('queues a single move however often an event is dragged offline', async () => {
    const { server, store, call, range } = setupCalendar();
    server.state.events.set(5, event(5, '2026-10-05T09:00:00.000Z', '2026-10-05T10:00:00.000Z'));
    await range('2026-10-01', '2026-11-01');
    server.state.online = false;

    for (const hour of [10, 11, 12]) {
      await call('PUT', '/api/calendar-events/5', {
        title: 'Event 5',
        startDate: `2026-10-05T${hour}:00:00.000Z`,
        endDate: `2026-10-05T${hour + 1}:00:00.000Z`,
      });
    }

    const queued = await store.listOutbox();
    expect(queued).toHaveLength(1);
    expect(JSON.parse(queued[0].data!)).toMatchObject({ startDate: '2026-10-05T12:00:00.000Z' });
  });

  it("makes reminders due again when an event moves, as the server does", async () => {
    const { server, store, call, range } = setupCalendar();
    const sent = { id: 7, calendarEventId: 5, reminderMinutes: 15, sentAt: '2026-10-05T08:45:00.000Z', createdAt: '', updatedAt: '' };
    server.state.events.set(5, event(5, '2026-10-05T09:00:00.000Z', '2026-10-05T10:00:00.000Z', { reminders: [sent] }));
    await range('2026-10-01', '2026-11-01');
    server.state.online = false;

    await call('PUT', '/api/calendar-events/5', { title: 'Later', startDate: '2026-10-06T09:00:00.000Z', endDate: '2026-10-06T10:00:00.000Z' });

    expect((await store.getEvent(5))?.reminders?.[0].sentAt).toBeNull();
  });

  it('deletes one occurrence offline, leaving the rest of the series', async () => {
    const { server, store, flusher, call, range } = setupCalendar();
    await call('POST', '/api/calendar-events/recurring', {
      title: 'Standup',
      startDate: '2026-10-05T09:00:00.000Z',
      endDate: '2026-10-05T09:15:00.000Z',
    });
    const [first, second] = await range('2026-10-01', '2026-10-20');
    server.state.online = false;

    await call('DELETE', `/api/calendar-events/${first.id}`);

    const offline = ids(await range('2026-10-01', '2026-10-20'));
    expect(offline).not.toContain(first.id);
    expect(offline).toContain(second.id);
    server.state.online = true;
    await flusher.flush();
    expect(ids(await range('2026-10-01', '2026-10-20'))).not.toContain(first.id);
    expect(await store.outboxCount()).toBe(0);
  });

  it("deletes a series offline, and its occurrences don't come back before that syncs", async () => {
    const { server, store, call, range } = setupCalendar();
    const series = await call('POST', '/api/calendar-events/recurring', {
      title: 'Standup',
      startDate: '2026-10-05T09:00:00.000Z',
      endDate: '2026-10-05T09:15:00.000Z',
    });
    expect((await range('2026-10-01', '2026-11-01')).length).toBeGreaterThan(1);
    server.state.online = false;

    await call('DELETE', `/api/calendar-events/recurring/${series.id}`);
    expect(await range('2026-10-01', '2026-11-01')).toEqual([]);

    // Online again, but the delete hasn't been replayed yet.
    server.state.online = true;
    await reconnect(range);
    expect(await store.listEvents()).toEqual([]);
  });

  it('renames a calendar offline in the stored list', async () => {
    const { server, call } = setupCalendar();
    await call('GET', '/api/calendars');
    server.state.online = false;

    await call('PATCH', '/api/calendars/3', { name: 'Home' });

    expect((await call('GET', '/api/calendars'))[0]).toMatchObject({ id: 3, name: 'Home' });
  });
});

describe('repeating events created offline (placeholders)', () => {
  const createSeries = async (call: ReturnType<typeof setupCalendar>['call']) =>
    call('POST', '/api/calendar-events/recurring', {
      title: 'Gym',
      startDate: '2026-10-05T18:00:00.000Z',
      endDate: '2026-10-05T19:00:00.000Z',
      recurrencePattern: { type: 'WEEKLY', interval: 1 },
      noEndDate: true,
      reminderMinutes: 30,
    });

  it('shows the first occurrence as a placeholder until the series syncs', async () => {
    const { server, store, call, range } = setupCalendar();
    server.state.online = false;

    const series = await createSeries(call);

    expect(isTempId(series.id)).toBe(true);
    const [placeholder] = await range('2026-10-01', '2026-11-01');
    expect(placeholder).toMatchObject({
      title: 'Gym',
      recurringEventId: series.id,
      isRecurring: true,
      placeholder: true,
    });
    expect(await store.outboxCount()).toBe(1);
  });

  it("refuses edits to the placeholder rather than queue what can't be sent", async () => {
    const { server, store, call, range } = setupCalendar();
    server.state.online = false;
    await createSeries(call);
    const [placeholder] = await range('2026-10-01', '2026-11-01');

    await expect(
      call('PUT', `/api/calendar-events/${placeholder.id}`, { title: 'Swim' })
    ).rejects.toThrow('Available once this repeating event syncs');
    await expect(
      call('PUT', `/api/calendar-events/${placeholder.id}/reminders`, { reminderMinutes: [5] })
    ).rejects.toThrow('Available once this repeating event syncs');

    expect(await store.outboxCount()).toBe(1);
    expect((await store.getEvent(placeholder.id))?.title).toBe('Gym');
  });

  it.each([
    ['the occurrence', (placeholder: CalendarEventResponseDto) => `/api/calendar-events/${placeholder.id}`],
    ['the series', (placeholder: CalendarEventResponseDto) => `/api/calendar-events/recurring/${placeholder.recurringEventId}`],
  ])('cancels the series when %s is deleted: nothing reaches the server', async (_name, url) => {
    const { server, store, flusher, call, range } = setupCalendar();
    server.state.online = false;
    await createSeries(call);
    const [placeholder] = await range('2026-10-01', '2026-11-01');

    await call('DELETE', url(placeholder));

    expect(await store.outboxCount()).toBe(0);
    expect(await store.listEvents()).toEqual([]);
    server.state.online = true;
    await flusher.flush();
    expect(server.state.calls).toEqual([]);
  });

  it("gives way to the server's occurrences once the series has synced", async () => {
    const { server, store, flusher, call, range } = setupCalendar();
    server.state.online = false;
    await createSeries(call);

    server.state.online = true;
    expect(await flusher.flush()).toBe('drained');
    const events: CalendarEventResponseDto[] = await range('2026-10-01', '2026-11-01');

    expect(events.length).toBeGreaterThan(1);
    expect(events.every(e => !e.placeholder && !isTempId(e.id))).toBe(true);
    expect((await store.listEvents()).some(e => e.placeholder)).toBe(false);
  });
});
