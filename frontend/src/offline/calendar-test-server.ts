// Test support only: an in-memory Omega server for the offline layer's tests,
// wired to the offline adapter and outbox flusher the way the app wires them.
import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { vi } from 'vitest';
import type { CalendarEventResponseDto } from '../api/dtos/calendar-events.dtos';
import type { CalendarResponseDto } from '../api/dtos/calendars.dtos';
import { createOfflineAdapter } from './offline-adapter';
import { createOfflineStore } from './offline-store';
import { createOutboxFlusher } from './outbox-flusher';

export const BASE = 'https://omega.test';
const WEEK_MS = 7 * 24 * 60 * 60_000;

export const makeConfig = (
  url: string,
  method: string,
  data?: string
): InternalAxiosRequestConfig => ({
  url,
  method,
  data,
  headers: new AxiosHeaders(),
});

const respond = (
  config: InternalAxiosRequestConfig,
  data: string,
  status = 200
): AxiosResponse => ({
  data,
  status,
  statusText: '',
  headers: new AxiosHeaders(),
  config,
});

export const event = (
  id: number,
  start: string,
  end: string,
  extra: Partial<CalendarEventResponseDto> = {}
): CalendarEventResponseDto => ({
  id,
  calendarId: 1,
  userId: 1,
  title: `Event ${id}`,
  startDate: start,
  endDate: end,
  createdAt: start,
  updatedAt: start,
  isRecurring: false,
  reminders: [],
  ...extra,
});

type Series = {
  id: number;
  calendarId: number;
  title: string;
  start: number;
  durationMs: number;
  /** Weekly occurrences already generated, by week number. */
  generated: Map<number, number>;
  /** Occurrences deleted one by one, by week number. */
  exceptions: Set<number>;
};

export type ServerCall = { method: string; url: string; data?: unknown };

/**
 * Behaves like Omega's server for the endpoints the offline layer handles:
 * ranges match by the same overlap rule (plain dates are midnight UTC), and
 * weekly repeating events get their occurrences created as they're read.
 */
export const createCalendarServer = () => {
  const state = {
    online: true,
    calls: [] as ServerCall[],
    events: new Map<number, CalendarEventResponseDto>(),
    series: new Map<number, Series>(),
    calendars: [
      {
        id: 3,
        name: 'Personal',
        color: '#6366f1',
        ownerId: 1,
        isPersonal: true,
        role: 'owner',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ] as CalendarResponseDto[],
    nextId: 100,
    /** `METHOD /path` → status to fail with. */
    failures: new Map<string, number>(),
  };

  const generateOccurrences = (start: number, end: number) => {
    for (const series of state.series.values()) {
      for (let week = 0; week < 60; week++) {
        const occurrenceStart = series.start + week * WEEK_MS;
        const occurrenceEnd = occurrenceStart + series.durationMs;
        if (occurrenceStart > end || occurrenceEnd < start) continue;
        if (series.generated.has(week) || series.exceptions.has(week)) continue;
        const id = state.nextId++;
        series.generated.set(week, id);
        state.events.set(
          id,
          event(
            id,
            new Date(occurrenceStart).toISOString(),
            new Date(occurrenceEnd).toISOString(),
            {
              calendarId: series.calendarId,
              title: series.title,
              isRecurring: true,
              recurringEventId: series.id,
            }
          )
        );
      }
    }
  };

  const handle = (method: string, path: string, query: URLSearchParams, body: Record<string, unknown>) => {
    if (method === 'GET' && path === '/api/calendars') return state.calendars;
    if (method === 'GET' && path === '/api/users/profile') {
      return { id: 1, username: 'folks', email: null };
    }
    if (method === 'GET' && path === '/api/calendar-invitations') return [];
    if (method === 'GET' && path === '/api/calendar-events') {
      const start = Date.parse(query.get('startDate') ?? '');
      const end = Date.parse(query.get('endDate') ?? '');
      generateOccurrences(start, end);
      return [...state.events.values()]
        .filter(e => Date.parse(e.startDate) <= end && Date.parse(e.endDate) >= start)
        .sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
    }
    if (method === 'POST' && path === '/api/calendar-events') {
      const id = state.nextId++;
      const created = event(id, String(body.startDate), String(body.endDate), {
        title: String(body.title),
        calendarId: typeof body.calendarId === 'number' ? body.calendarId : 3,
        reminders: (Array.isArray(body.reminderMinutes) ? body.reminderMinutes : []).map(
          (minutes, i) => ({
            id: 900 + id * 10 + i,
            calendarEventId: id,
            reminderMinutes: Number(minutes),
            sentAt: null,
            createdAt: '',
            updatedAt: '',
          })
        ),
      });
      state.events.set(id, created);
      return { ...created, reminders: undefined };
    }
    if (method === 'POST' && path === '/api/calendar-events/recurring') {
      const id = state.nextId++;
      const start = Date.parse(String(body.startDate));
      state.series.set(id, {
        id,
        calendarId: typeof body.calendarId === 'number' ? body.calendarId : 3,
        title: String(body.title),
        start,
        durationMs: Date.parse(String(body.endDate)) - start,
        generated: new Map(),
        exceptions: new Set(),
      });
      return { id, title: body.title };
    }
    let match = /^\/api\/calendar-events\/recurring\/(\d+)$/.exec(path);
    if (match && method === 'DELETE') {
      const id = Number(match[1]);
      if (!state.series.delete(id)) return 404;
      for (const [eventId, e] of state.events) {
        if (e.recurringEventId === id) state.events.delete(eventId);
      }
      return { success: true };
    }
    match = /^\/api\/calendar-events\/(\d+)\/reminders$/.exec(path);
    if (match) {
      const existing = state.events.get(Number(match[1]));
      if (!existing) return 404;
      if (method === 'GET') return existing.reminders ?? [];
      const reminders = (body.reminderMinutes as number[]).map((minutes, i) => ({
        id: 800 + i,
        calendarEventId: existing.id,
        reminderMinutes: minutes,
        sentAt: null,
        createdAt: '',
        updatedAt: '',
      }));
      state.events.set(existing.id, { ...existing, reminders });
      return reminders;
    }
    match = /^\/api\/calendar-events\/(\d+)$/.exec(path);
    if (match) {
      const id = Number(match[1]);
      const existing = state.events.get(id);
      if (!existing) return 404;
      if (method === 'GET') return { ...existing, reminders: undefined };
      if (method === 'PUT') {
        const updated = { ...existing, ...body } as CalendarEventResponseDto;
        state.events.set(id, updated);
        return updated;
      }
      if (method === 'DELETE') {
        state.events.delete(id);
        const series =
          existing.recurringEventId === undefined
            ? undefined
            : state.series.get(existing.recurringEventId);
        for (const [week, occurrenceId] of series?.generated ?? []) {
          if (occurrenceId === id) series?.exceptions.add(week);
        }
        return { success: true };
      }
    }
    match = /^\/api\/calendars\/(\d+)$/.exec(path);
    if (match && method === 'PATCH') {
      const id = Number(match[1]);
      state.calendars = state.calendars.map(c => (c.id === id ? { ...c, ...body } : c));
      return state.calendars.find(c => c.id === id);
    }
    return 404;
  };

  const send = vi.fn(
    async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      if (!state.online) {
        throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
      }
      const method = (config.method ?? 'get').toUpperCase();
      const url = new URL(config.url ?? '', BASE);
      for (const [key, value] of Object.entries(config.params ?? {})) {
        url.searchParams.set(key, String(value));
      }
      const body =
        typeof config.data === 'string' ? JSON.parse(config.data) : {};
      state.calls.push({ method, url: url.pathname + url.search, data: body });
      const failure = state.failures.get(`${method} ${url.pathname}`);
      const result = failure ?? handle(method, url.pathname, url.searchParams, body);
      if (typeof result === 'number') {
        throw new AxiosError(
          `Request failed with status code ${result}`,
          AxiosError.ERR_BAD_REQUEST,
          config,
          undefined,
          respond(config, JSON.stringify({ statusCode: result, message: 'Error' }), result)
        );
      }
      return respond(config, JSON.stringify(result));
    }
  );

  return { state, send };
};

let dbCounter = 0;

/** The offline adapter and flusher in front of a fake server. */
export const setupCalendar = () => {
  const server = createCalendarServer();
  const store = createOfflineStore(`calendar-${++dbCounter}`);
  const adapter = createOfflineAdapter({
    send: server.send,
    store,
    getUri: config => `${BASE}${config.url}`,
  });
  const flusher = createOutboxFlusher({
    store,
    maxAttempts: 2,
    // Like api.request(): replays go through the adapter, which sends them
    // as they are but notes that the server answered, and the body comes
    // back parsed by transformResponse.
    replay: async request => {
      const response = await adapter({
        ...makeConfig(request.url, request.method.toLowerCase(), request.data),
        offlineReplay: true,
      });
      return { ...response, data: JSON.parse(response.data || 'null') };
    },
  });

  const call = async (method: string, url: string, body?: unknown) => {
    const response = await adapter(
      makeConfig(
        url,
        method.toLowerCase(),
        body === undefined ? undefined : JSON.stringify(body)
      )
    );
    return JSON.parse(response.data || 'null');
  };
  const range = (startDate: string, endDate: string) =>
    call('GET', `/api/calendar-events?startDate=${startDate}&endDate=${endDate}`);

  return { server, store, adapter, flusher, call, range };
};
