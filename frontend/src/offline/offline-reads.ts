import type { EventReminderResponseDto } from '../api/dtos/calendar-events.dtos';
import {
  overlapsRange,
  type EventRange,
  type OfflineStore,
  type StoredEvent,
} from './offline-store';
import { isTempId, tempIdsIn } from './temp-ids';

export type OfflineReadContext = {
  store: OfflineStore;
  /** Full URI for an API path, matching how GET responses are keyed. */
  uri: (path: string) => string;
};

/**
 * Answers a GET with no stored copy of its own from stored data that covers
 * it, or undefined when nothing does. Chronus derives note lists here; Omega
 * answers its event reads from the events store instead (read routes below).
 */
export const deriveOfflineResponse = async (
  _requestUri: string,
  _ctx: OfflineReadContext
): Promise<unknown> => undefined;

// ---------------------------------------------------------------------------
// Events (specs/offline-apps.md, D5): one stored copy per event, so any date
// range the calendar asks for can be answered offline, and an offline edit
// only has to change one record.

/** Meta row: the time ranges the stored events are complete for. */
export const EVENT_COVERAGE_KEY = 'eventCoverage';

const EVENT_IN_URL = /\/calendar-events\/(-?\d+)(?=[/?]|$)/;
const SERIES_IN_URL = /\/calendar-events\/recurring\/(-?\d+)(?=[/?]|$)/;

export type QueuedEventRefs = {
  /** Events (temp ids too) that queued writes change or delete. */
  events: Set<number>;
  /** Series that queued writes delete. */
  series: Set<number>;
};

/**
 * What queued writes touch. Until they sync, the stored copies of these (or
 * their absence, for deletes) are the ones that count: the server's answer
 * doesn't have the change yet.
 */
export const queuedEventRefs = async (
  store: OfflineStore
): Promise<QueuedEventRefs> => {
  const refs: QueuedEventRefs = { events: new Set(), series: new Set() };
  for (const entry of await store.listOutbox()) {
    const series = SERIES_IN_URL.exec(entry.url)?.[1];
    if (series !== undefined) refs.series.add(Number(series));
    const event = EVENT_IN_URL.exec(entry.url)?.[1];
    if (event !== undefined) refs.events.add(Number(event));
    for (const id of tempIdsIn(entry.url, entry.data)) refs.events.add(id);
  }
  return refs;
};

/**
 * Whether the stored copy of an event stands against the server's answer:
 * always while queued writes touch it, and for events the server has never
 * seen. A placeholder (D8) gives way once its series has synced, when the
 * server's occurrences take its place.
 */
const keepsLocalCopy =
  (refs: QueuedEventRefs) =>
  (
    id: number,
    stored: StoredEvent | undefined,
    incoming: StoredEvent | undefined
  ): boolean => {
    if (refs.events.has(id)) return true;
    const series = (stored ?? incoming)?.recurringEventId;
    if (series !== undefined && refs.series.has(series)) return true;
    if (stored && isTempId(id)) {
      return !(stored.placeholder && !isTempId(stored.recurringEventId));
    }
    return false;
  };

/**
 * The query's date range as the server reads it: plain dates are midnight
 * UTC there (date-fns parseISO in a UTC container), as they are for
 * Date.parse. Both ends inclusive.
 */
export const parseEventRange = (
  query: URLSearchParams
): EventRange | undefined => {
  const start = Date.parse(query.get('startDate') ?? '');
  const end = Date.parse(query.get('endDate') ?? '');
  return Number.isNaN(start) || Number.isNaN(end) ? undefined : { start, end };
};

/** Adds a range to a sorted list of ranges, joining any it touches. */
export const addCoverage = (
  coverage: EventRange[],
  range: EventRange
): EventRange[] => {
  const merged: EventRange[] = [];
  for (const current of [...coverage, range].sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
};

const byStart = (a: StoredEvent, b: StoredEvent) =>
  Date.parse(a.startDate) - Date.parse(b.startDate);

/** Server events merged over a stored copy, keeping what the answer omits. */
const withStoredExtras = (
  incoming: StoredEvent,
  stored: StoredEvent | undefined
): StoredEvent => ({
  ...incoming,
  reminders: incoming.reminders ?? stored?.reminders,
});

type OfflineReadRoute = {
  /** Path below /api; `:name` segments match numeric ids (temp ids too). */
  pattern: string;
  /** After a successful GET: folds the server's answer into the store. */
  store: (
    ctx: OfflineReadContext,
    query: URLSearchParams,
    params: Record<string, number>,
    data: unknown
  ) => Promise<void>;
  /** While the server can't be reached: the answer, or undefined if none. */
  answer: (
    ctx: OfflineReadContext,
    query: URLSearchParams,
    params: Record<string, number>
  ) => Promise<unknown>;
};

const readRoutes: OfflineReadRoute[] = [
  {
    pattern: '/calendar-events',
    store: async (ctx, query, _params, data) => {
      const range = parseEventRange(query);
      if (!range || !Array.isArray(data)) return;
      const refs = await queuedEventRefs(ctx.store);
      const stored = new Map(
        (await ctx.store.listEvents()).map(event => [event.id, event])
      );
      await ctx.store.mergeEvents(
        range,
        (data as StoredEvent[]).map(event =>
          withStoredExtras(event, stored.get(event.id))
        ),
        keepsLocalCopy(refs)
      );
      const coverage =
        (await ctx.store.getMeta<EventRange[]>(EVENT_COVERAGE_KEY)) ?? [];
      await ctx.store.setMeta(EVENT_COVERAGE_KEY, addCoverage(coverage, range));
    },
    answer: async (ctx, query) => {
      const range = parseEventRange(query);
      if (!range) return undefined;
      return (await ctx.store.listEvents())
        .filter(event => overlapsRange(event, range))
        .sort(byStart);
    },
  },
  {
    pattern: '/calendar-events/:id',
    store: async (ctx, _query, { id }, data) => {
      if (data === null || typeof data !== 'object') return;
      const stored = await ctx.store.getEvent(id);
      const incoming = withStoredExtras(data as StoredEvent, stored);
      if (!keepsLocalCopy(await queuedEventRefs(ctx.store))(id, stored, incoming)) {
        await ctx.store.putEvent(incoming);
      }
    },
    answer: async (ctx, _query, { id }) => ctx.store.getEvent(id),
  },
  {
    pattern: '/calendar-events/:id/reminders',
    store: async (ctx, _query, { id }, data) => {
      const stored = await ctx.store.getEvent(id);
      if (!stored || !Array.isArray(data)) return;
      if (!keepsLocalCopy(await queuedEventRefs(ctx.store))(id, stored, stored)) {
        await ctx.store.putEvent({
          ...stored,
          reminders: data as EventReminderResponseDto[],
        });
      }
    },
    answer: async (ctx, _query, { id }) => {
      const event = await ctx.store.getEvent(id);
      return event ? (event.reminders ?? []) : undefined;
    },
  },
];

const compiledReadRoutes = readRoutes.map(route => {
  const names: string[] = [];
  const source = route.pattern.replace(/:(\w+)/g, (_, name: string) => {
    names.push(name);
    return '(-?\\d+)';
  });
  return { route, names, regex: new RegExp(`^${source}$`) };
});

/**
 * Finds the read route for a GET, given its path below /api. GETs without
 * one are stored and replayed by URL.
 */
export const matchOfflineReadRoute = (
  path: string
):
  | { route: OfflineReadRoute; params: Record<string, number> }
  | undefined => {
  for (const { route, names, regex } of compiledReadRoutes) {
    const match = regex.exec(path);
    if (match) {
      return {
        route,
        params: Object.fromEntries(
          names.map((name, i) => [name, Number(match[i + 1])])
        ),
      };
    }
  }
  return undefined;
};
