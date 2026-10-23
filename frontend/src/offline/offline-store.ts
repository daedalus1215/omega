import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CalendarEventResponseDto } from '../api/dtos/calendar-events.dtos';
import { replaceIds, rewriteUrlIds, tempIdsIn, type IdMap } from './temp-ids';

// Never rename it: that would orphan the calendar data and queued changes
// already stored on devices.
const DEFAULT_DB_NAME = 'omega-offline';

export type CachedResponse = {
  /** Full URI (base URL + path + query) of the GET this answers. */
  uri: string;
  /** Body exactly as received, before axios' transformResponse runs. */
  data: string;
  storedAt: number;
};

/** A write made while the backend was unreachable, waiting to be replayed. */
export type OutboxEntry = {
  seq: number;
  method: string;
  /** Request path as sent, e.g. `/api/calendar-events/5`. */
  url: string;
  params?: Record<string, unknown>;
  /** Serialized JSON body as sent. */
  data?: string;
  /** Temp id the UI was handed for the entity this request creates. */
  tempId?: number;
  attempts: number;
  queuedAt: number;
};

export type NewOutboxEntry = Pick<
  OutboxEntry,
  'method' | 'url' | 'params' | 'data' | 'tempId'
>;

export type FailedEntry = OutboxEntry & {
  status?: number;
  error: string;
  failedAt: number;
};

/**
 * An event or occurrence as the server sends it, the device's only copy of
 * it (specs/offline-apps.md, D5). Omega's addition to Chronus's store.
 */
export type StoredEvent = CalendarEventResponseDto & {
  /**
   * Stands in for the first occurrence of a repeating event created offline,
   * until the series syncs and the server's occurrences replace it (D8).
   */
  placeholder?: boolean;
};

/** Start and end of a time range, in ms, both inclusive. */
export type EventRange = { start: number; end: number };

interface OfflineSchema extends DBSchema {
  responses: { key: string; value: CachedResponse };
  outbox: { key: number; value: OutboxEntry };
  failed: { key: number; value: FailedEntry };
  idMap: { key: number; value: { tempId: number; realId: number } };
  /** Cross-tab shared state (prefetch schedule; user scoping in Phase 3). */
  meta: { key: string; value: { key: string; value: unknown } };
  events: { key: number; value: StoredEvent };
}

export type OfflineStore = {
  getResponse: (uri: string) => Promise<CachedResponse | undefined>;
  putResponse: (uri: string, data: string) => Promise<void>;
  deleteResponse: (uri: string) => Promise<void>;
  getJson: <T>(uri: string) => Promise<T | undefined>;
  putJson: (uri: string, value: unknown) => Promise<void>;
  /** Applies `update` to a stored JSON response, if there is one. */
  updateJson: <T>(
    uri: string,
    update: (value: T) => T
  ) => Promise<T | undefined>;
  /**
   * Applies `update` to every stored JSON response whose URI starts with
   * `prefix`; returning undefined leaves that response unchanged.
   */
  updateJsonByPrefix: <T>(
    prefix: string,
    update: (value: T, uri: string) => T | undefined
  ) => Promise<void>;
  /** URIs of every stored response, for pruning. */
  listResponseUris: () => Promise<string[]>;

  enqueue: (entry: NewOutboxEntry) => Promise<void>;
  peekOutbox: () => Promise<OutboxEntry | undefined>;
  listOutbox: () => Promise<OutboxEntry[]>;
  outboxCount: () => Promise<number>;
  removeFromOutbox: (seq: number) => Promise<void>;
  /** Bumps an entry's attempt counter and returns the new count. */
  recordAttempt: (seq: number) => Promise<number>;
  moveToFailed: (
    entry: OutboxEntry,
    status: number | undefined,
    error: string
  ) => Promise<void>;
  failedCount: () => Promise<number>;
  listFailed: () => Promise<FailedEntry[]>;
  /** Drops queued writes touching an entity that was never synced. */
  discardOutboxReferencing: (tempId: number) => Promise<void>;

  getIdMap: () => Promise<IdMap>;
  /**
   * Records the server id a temp id resolved to, and rewrites stored
   * responses so they're keyed by and refer to the real id.
   */
  recordId: (tempId: number, realId: number) => Promise<void>;
  /** Every stored event and occurrence. */
  listEvents: () => Promise<StoredEvent[]>;
  getEvent: (id: number) => Promise<StoredEvent | undefined>;
  putEvent: (event: StoredEvent) => Promise<void>;
  deleteEvent: (id: number) => Promise<void>;
  /**
   * Folds a server answer for `range` into the stored events, in one
   * transaction: stored events overlapping the range that the answer leaves
   * out are deleted, and the answer's events stored, except where `keep`
   * says the stored copy (or its absence) stands.
   */
  mergeEvents: (
    range: EventRange,
    events: StoredEvent[],
    keep: (id: number, stored: StoredEvent | undefined, incoming: StoredEvent | undefined) => boolean
  ) => Promise<void>;
  /** Shared cross-tab state, e.g. the prefetch schedule. */
  getMeta: <T>(key: string) => Promise<T | undefined>;
  setMeta: (key: string, value: unknown) => Promise<void>;
  /**
   * Drops the in-memory id map so the next read picks up ids recorded by
   * another tab (it receives the trigger as an `ids-changed` message).
   */
  invalidateIdMap: () => void;
  /**
   * Empties every store, meta included: on sign-out, or when the data
   * found at login belongs to another user.
   */
  clear: () => Promise<void>;
};

const STORE_NAMES = [
  'responses',
  'outbox',
  'failed',
  'idMap',
  'meta',
  'events',
] as const;

/** The server's overlap rule (CalendarEventRepository.findByDateRange). */
export const overlapsRange = (event: StoredEvent, range: EventRange): boolean =>
  Date.parse(event.startDate) <= range.end &&
  Date.parse(event.endDate) >= range.start;

const parseJson = <T>(data: string): T | undefined => {
  try {
    return JSON.parse(data) as T;
  } catch {
    return undefined;
  }
};

export const createOfflineStore = (
  dbName: string = DEFAULT_DB_NAME
): OfflineStore => {
  const dbPromise: Promise<IDBPDatabase<OfflineSchema>> = openDB<OfflineSchema>(
    dbName,
    4,
    {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          database.createObjectStore('responses', { keyPath: 'uri' });
        }
        if (oldVersion < 2) {
          database.createObjectStore('outbox', {
            keyPath: 'seq',
            autoIncrement: true,
          });
          database.createObjectStore('failed', { keyPath: 'seq' });
          database.createObjectStore('idMap', { keyPath: 'tempId' });
        }
        if (oldVersion < 3) {
          database.createObjectStore('meta', { keyPath: 'key' });
        }
        if (oldVersion < 4) {
          database.createObjectStore('events', { keyPath: 'id' });
        }
      },
    }
  );

  let idMapCache: Map<number, number> | undefined;

  const putResponse = async (uri: string, data: string) => {
    const db = await dbPromise;
    await db.put('responses', { uri, data, storedAt: Date.now() });
  };

  const getJson = async <T>(uri: string): Promise<T | undefined> => {
    const cached = await (await dbPromise).get('responses', uri);
    return cached ? parseJson<T>(cached.data) : undefined;
  };

  const getIdMap = async (): Promise<IdMap> => {
    if (!idMapCache) {
      const rows = await (await dbPromise).getAll('idMap');
      idMapCache = new Map(rows.map(row => [row.tempId, row.realId]));
    }
    return idMapCache;
  };

  return {
    getResponse: async uri => (await dbPromise).get('responses', uri),
    putResponse,
    deleteResponse: async uri => {
      await (await dbPromise).delete('responses', uri);
    },
    getJson,
    putJson: (uri, value) => putResponse(uri, JSON.stringify(value)),
    updateJson: async <T>(uri: string, update: (value: T) => T) => {
      const current = await getJson<T>(uri);
      if (current === undefined) {
        return undefined;
      }
      const next = update(current);
      await putResponse(uri, JSON.stringify(next));
      return next;
    },
    updateJsonByPrefix: async <T>(
      prefix: string,
      update: (value: T, uri: string) => T | undefined
    ) => {
      const db = await dbPromise;
      const tx = db.transaction('responses', 'readwrite');
      const range = IDBKeyRange.bound(prefix, `${prefix}￿`);
      for await (const cursor of tx.store.iterate(range)) {
        const current = parseJson<T>(cursor.value.data);
        if (current === undefined) continue;
        const next = update(current, cursor.value.uri);
        if (next !== undefined) {
          await cursor.update({
            ...cursor.value,
            data: JSON.stringify(next),
            storedAt: Date.now(),
          });
        }
      }
      await tx.done;
    },
    listResponseUris: async () => (await dbPromise).getAllKeys('responses'),

    enqueue: async entry => {
      const db = await dbPromise;
      // `seq` is assigned by the store's autoIncrement key generator.
      await db.add('outbox', {
        ...entry,
        attempts: 0,
        queuedAt: Date.now(),
      } as OutboxEntry);
    },
    peekOutbox: async () => {
      const db = await dbPromise;
      const cursor = await db.transaction('outbox').store.openCursor();
      return cursor?.value;
    },
    listOutbox: async () => (await dbPromise).getAll('outbox'),
    outboxCount: async () => (await dbPromise).count('outbox'),
    removeFromOutbox: async seq => {
      await (await dbPromise).delete('outbox', seq);
    },
    recordAttempt: async seq => {
      const db = await dbPromise;
      const tx = db.transaction('outbox', 'readwrite');
      const entry = await tx.store.get(seq);
      if (!entry) return 0;
      const attempts = entry.attempts + 1;
      await tx.store.put({ ...entry, attempts });
      await tx.done;
      return attempts;
    },
    moveToFailed: async (entry, status, error) => {
      const db = await dbPromise;
      const tx = db.transaction(['outbox', 'failed'], 'readwrite');
      await tx.objectStore('outbox').delete(entry.seq);
      await tx
        .objectStore('failed')
        .put({ ...entry, status, error, failedAt: Date.now() });
      await tx.done;
    },
    failedCount: async () => (await dbPromise).count('failed'),
    listFailed: async () => (await dbPromise).getAll('failed'),
    discardOutboxReferencing: async tempId => {
      const db = await dbPromise;
      const tx = db.transaction('outbox', 'readwrite');
      for await (const cursor of tx.store.iterate()) {
        const entry = cursor.value;
        if (
          entry.tempId === tempId ||
          tempIdsIn(entry.url, entry.data).has(tempId)
        ) {
          await cursor.delete();
        }
      }
      await tx.done;
    },

    getIdMap,
    recordId: async (tempId, realId) => {
      const db = await dbPromise;
      await db.put('idMap', { tempId, realId });
      await getIdMap(); // load the in-memory copy before amending it
      idMapCache?.set(tempId, realId);

      const single: IdMap = new Map([[tempId, realId]]);
      const needle = String(tempId);
      const tx = db.transaction('responses', 'readwrite');
      for await (const cursor of tx.store.iterate()) {
        const { uri, data } = cursor.value;
        if (!uri.includes(needle) && !data.includes(needle)) continue;
        const parsed = parseJson<unknown>(data);
        const next = {
          uri: rewriteUrlIds(uri, single),
          data:
            parsed === undefined
              ? data
              : JSON.stringify(replaceIds(parsed, single)),
          storedAt: Date.now(),
        };
        if (next.uri !== uri) {
          await cursor.delete();
        }
        await tx.store.put(next);
      }
      await tx.done;

      // Events refer to the new id too: as their own id, their series',
      // their calendar's, or their reminders'.
      const events = db.transaction('events', 'readwrite');
      for await (const cursor of events.store.iterate()) {
        const event = cursor.value;
        if (!JSON.stringify(event).includes(needle)) continue;
        const next = replaceIds(event, single) as StoredEvent;
        if (next.id !== event.id) {
          await cursor.delete();
        }
        await events.store.put(next);
      }
      await events.done;
    },
    listEvents: async () => (await dbPromise).getAll('events'),
    getEvent: async id => (await dbPromise).get('events', id),
    putEvent: async event => {
      await (await dbPromise).put('events', event);
    },
    deleteEvent: async id => {
      await (await dbPromise).delete('events', id);
    },
    mergeEvents: async (range, events, keep) => {
      const db = await dbPromise;
      const tx = db.transaction('events', 'readwrite');
      const incoming = new Map(events.map(event => [event.id, event]));
      for await (const cursor of tx.store.iterate()) {
        const stored = cursor.value;
        if (
          !incoming.has(stored.id) &&
          overlapsRange(stored, range) &&
          !keep(stored.id, stored, undefined)
        ) {
          await cursor.delete();
        }
      }
      for (const event of events) {
        const stored = await tx.store.get(event.id);
        if (!keep(event.id, stored, event)) {
          await tx.store.put(event);
        }
      }
      await tx.done;
    },
    getMeta: async <T>(key: string): Promise<T | undefined> =>
      ((await (await dbPromise).get('meta', key))?.value as T | undefined),
    setMeta: async (key, value) => {
      await (await dbPromise).put('meta', { key, value });
    },
    invalidateIdMap: () => {
      idMapCache = undefined;
    },
    clear: async () => {
      const db = await dbPromise;
      const tx = db.transaction(STORE_NAMES, 'readwrite');
      await Promise.all([
        ...STORE_NAMES.map(name => tx.objectStore(name).clear()),
        tx.done,
      ]);
      idMapCache = undefined;
    },
  };
};
