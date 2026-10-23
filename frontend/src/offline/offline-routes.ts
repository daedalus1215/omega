import { AxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';
import type {
  EventReminderResponseDto,
  RecurringEventResponseDto,
} from '../api/dtos/calendar-events.dtos';
import type { CalendarResponseDto } from '../api/dtos/calendars.dtos';
import { STORAGE_KEYS } from '../constants/storage';
import type { OfflineStore, OutboxEntry, StoredEvent } from './offline-store';
import { isTempId, newTempId } from './temp-ids';

export type OfflineWriteContext = {
  store: OfflineStore;
  /** Full URI for an API path, matching how GET responses are keyed. */
  uri: (path: string) => string;
  params: Record<string, number>;
  /** Parsed JSON request body; empty when there was none. */
  body: Record<string, unknown>;
};

export type OfflineWriteResult = {
  /** Response body handed to the caller in place of the server's. */
  data?: unknown;
  /** For creates: the temp id standing in for the server-assigned one. */
  tempId?: number;
  /** The write no longer needs sending, e.g. deleting a never-synced event. */
  skipQueue?: boolean;
};

type OfflineRoute = {
  method: string;
  /** Path below /api; `:name` segments match numeric ids (temp ids too). */
  pattern: string;
  /** Don't queue this write if an identical one is already waiting. */
  dedupe?: boolean;
  /**
   * Sent by the app on its own, not a change the user made. Queued and
   * replayed in order like any other write, but not counted as one waiting
   * to sync, and dropped instead of set aside when the server rejects it.
   */
  background?: boolean;
  /**
   * Fold earlier queued writes to the same URL into this one, bodies merged
   * with later fields winning. Omega's PUTs replace the whole thing, so the
   * last one wins: dragging an event around offline queues a single move.
   */
  coalesce?: boolean;
  /**
   * Creates hand out temp ids, so they're only mirrored when queued; online,
   * the next list fetch picks the new entity up under its real id.
   */
  createsEntity?: boolean;
  /**
   * Mirrors the write into the stored events or GET responses so screens
   * reflect it while offline, and produces the response the caller gets
   * back. Throwing refuses the write: nothing is queued.
   */
  applyLocally: (ctx: OfflineWriteContext) => Promise<OfflineWriteResult>;
};

const CALENDARS_PATH = '/api/calendars';

const nowIso = () => new Date().toISOString();

const text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/** The logged-in user, from the login token, for events created offline. */
const currentUserId = (): number => {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.AUTH.JWT_TOKEN);
    return token === null ? 0 : Number(jwtDecode(token).sub);
  } catch {
    return 0;
  }
};

/**
 * The calendar a new event goes in: the one asked for, or, like the server,
 * the user's personal calendar.
 */
const calendarFor = async (ctx: OfflineWriteContext): Promise<number> => {
  if (typeof ctx.body.calendarId === 'number') return ctx.body.calendarId;
  const calendars =
    (await ctx.store.getJson<CalendarResponseDto[]>(ctx.uri(CALENDARS_PATH))) ??
    [];
  return (
    calendars.find(calendar => calendar.isPersonal)?.id ??
    calendars[0]?.id ??
    0
  );
};

const newReminder = (
  calendarEventId: number,
  reminderMinutes: number
): EventReminderResponseDto => ({
  id: newTempId(),
  calendarEventId,
  reminderMinutes,
  sentAt: null,
  createdAt: nowIso(),
  updatedAt: nowIso(),
});

const minutesList = (value: unknown): number[] =>
  Array.isArray(value)
    ? value.filter((minutes): minutes is number => typeof minutes === 'number')
    : typeof value === 'number'
      ? [value]
      : [];

/**
 * A placeholder (D8) has no id the server will ever know, so a write naming
 * it could never be replayed. Refused, rather than queued forever.
 */
const refuseIfPlaceholder = (event: StoredEvent | undefined): void => {
  if (event?.placeholder) {
    throw new AxiosError(
      'Available once this repeating event syncs',
      'ERR_NOT_SYNCED'
    );
  }
};

const routes: OfflineRoute[] = [
  {
    method: 'POST',
    pattern: '/calendar-events',
    createsEntity: true,
    applyLocally: async ctx => {
      const id = newTempId();
      const now = nowIso();
      const event: StoredEvent = {
        id,
        calendarId: await calendarFor(ctx),
        userId: currentUserId(),
        title: text(ctx.body.title) ?? '',
        description: text(ctx.body.description),
        color: text(ctx.body.color),
        startDate: text(ctx.body.startDate) ?? now,
        endDate: text(ctx.body.endDate) ?? now,
        createdAt: now,
        updatedAt: now,
        isRecurring: false,
        reminders: minutesList(ctx.body.reminderMinutes).map(minutes =>
          newReminder(id, minutes)
        ),
      };
      await ctx.store.putEvent(event);
      return { data: event, tempId: id };
    },
  },
  {
    method: 'PUT',
    pattern: '/calendar-events/:id',
    coalesce: true,
    applyLocally: async ctx => {
      const stored = await ctx.store.getEvent(ctx.params.id);
      refuseIfPlaceholder(stored);
      if (!stored) return {};
      const startDate = text(ctx.body.startDate) ?? stored.startDate;
      // Moving the start makes every reminder due again, as on the server.
      const reminders =
        startDate === stored.startDate
          ? stored.reminders
          : stored.reminders?.map(reminder => ({ ...reminder, sentAt: null }));
      const event: StoredEvent = {
        ...stored,
        title: text(ctx.body.title) ?? stored.title,
        description: text(ctx.body.description) ?? stored.description,
        color: text(ctx.body.color) ?? stored.color,
        startDate,
        endDate: text(ctx.body.endDate) ?? stored.endDate,
        updatedAt: nowIso(),
        reminders,
      };
      await ctx.store.putEvent(event);
      return { data: event };
    },
  },
  {
    method: 'DELETE',
    pattern: '/calendar-events/:id',
    applyLocally: async ctx => {
      const { id } = ctx.params;
      const stored = await ctx.store.getEvent(id);
      await ctx.store.deleteEvent(id);
      // Deleting a placeholder cancels its series, which never synced.
      if (stored?.placeholder && stored.recurringEventId !== undefined) {
        await ctx.store.discardOutboxReferencing(stored.recurringEventId);
        return { data: { success: true }, skipQueue: true };
      }
      if (isTempId(id)) {
        await ctx.store.discardOutboxReferencing(id);
        return { data: { success: true }, skipQueue: true };
      }
      return { data: { success: true } };
    },
  },
  {
    // The series' occurrences appear once it syncs (user, 2026-10-22); until
    // then its first occurrence stands in, read-only (D8).
    method: 'POST',
    pattern: '/calendar-events/recurring',
    createsEntity: true,
    applyLocally: async ctx => {
      const seriesId = newTempId();
      const placeholderId = newTempId();
      const now = nowIso();
      const startDate = text(ctx.body.startDate) ?? now;
      const endDate = text(ctx.body.endDate) ?? now;
      const common = {
        userId: currentUserId(),
        title: text(ctx.body.title) ?? '',
        description: text(ctx.body.description),
        color: text(ctx.body.color),
        startDate,
        endDate,
        createdAt: now,
        updatedAt: now,
      };
      await ctx.store.putEvent({
        ...common,
        id: placeholderId,
        calendarId: await calendarFor(ctx),
        isRecurring: true,
        recurringEventId: seriesId,
        placeholder: true,
        reminders: minutesList(ctx.body.reminderMinutes).map(minutes =>
          newReminder(placeholderId, minutes)
        ),
      });
      const series: RecurringEventResponseDto = {
        ...common,
        id: seriesId,
        recurrencePattern:
          ctx.body.recurrencePattern as RecurringEventResponseDto['recurrencePattern'],
        recurrenceEndDate: text(ctx.body.recurrenceEndDate),
        noEndDate: ctx.body.noEndDate === true,
        reminderMinutes:
          typeof ctx.body.reminderMinutes === 'number'
            ? ctx.body.reminderMinutes
            : undefined,
      };
      return { data: series, tempId: seriesId };
    },
  },
  {
    method: 'DELETE',
    pattern: '/calendar-events/recurring/:id',
    applyLocally: async ctx => {
      const { id } = ctx.params;
      for (const event of await ctx.store.listEvents()) {
        if (event.recurringEventId === id) {
          await ctx.store.deleteEvent(event.id);
        }
      }
      if (isTempId(id)) {
        await ctx.store.discardOutboxReferencing(id);
        return { data: { success: true }, skipQueue: true };
      }
      return { data: { success: true } };
    },
  },
  {
    // The only reminder write the app makes: the details dialog saves the
    // whole set. The single-reminder endpoints need a connection.
    method: 'PUT',
    pattern: '/calendar-events/:id/reminders',
    coalesce: true,
    applyLocally: async ctx => {
      const { id } = ctx.params;
      const stored = await ctx.store.getEvent(id);
      refuseIfPlaceholder(stored);
      // Like the server: unchanged reminders keep their id and sent state.
      const existing = stored?.reminders ?? [];
      const reminders = minutesList(ctx.body.reminderMinutes).map(
        minutes =>
          existing.find(reminder => reminder.reminderMinutes === minutes) ??
          newReminder(id, minutes)
      );
      if (stored) {
        await ctx.store.putEvent({ ...stored, reminders });
      }
      return { data: reminders };
    },
  },
  {
    method: 'PATCH',
    pattern: '/calendars/:id',
    coalesce: true,
    applyLocally: async ctx => {
      const { id } = ctx.params;
      let updated: CalendarResponseDto | undefined;
      await ctx.store.updateJson<CalendarResponseDto[]>(
        ctx.uri(CALENDARS_PATH),
        calendars =>
          calendars.map(calendar => {
            if (calendar.id !== id) return calendar;
            updated = {
              ...calendar,
              name: text(ctx.body.name) ?? calendar.name,
              color: text(ctx.body.color) ?? calendar.color,
              updatedAt: nowIso(),
            };
            return updated;
          })
      );
      return { data: updated };
    },
  },
];

const compiledRoutes = routes.map(route => {
  const names: string[] = [];
  const source = route.pattern.replace(/:(\w+)/g, (_, name: string) => {
    names.push(name);
    return '(-?\\d+)';
  });
  return { route, names, regex: new RegExp(`^${source}$`) };
});

/**
 * Finds the offline handler for a write, given its path below /api. Writes
 * without one aren't supported offline and fail as usual.
 */
export const matchOfflineRoute = (
  method: string,
  path: string
): { route: OfflineRoute; params: Record<string, number> } | undefined => {
  const upper = method.toUpperCase();
  for (const { route, names, regex } of compiledRoutes) {
    if (route.method !== upper) continue;
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

/** A request URL's path below /api, as the route patterns are written. */
export const apiPathOf = (url: string) =>
  url.split('?')[0].replace(/^\/api(?=\/)/, '');

/**
 * Whether a queued write is one the app sent on its own (see `background`).
 * Decided by route rather than stored on the entry, so entries queued
 * before a route was marked count the same way.
 */
export const isBackgroundWrite = ({
  method,
  url,
}: Pick<OutboxEntry, 'method' | 'url'>): boolean =>
  matchOfflineRoute(method, apiPathOf(url))?.route.background === true;
