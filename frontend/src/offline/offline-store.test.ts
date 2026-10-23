import 'fake-indexeddb/auto';
import { openDB, type DBSchema } from 'idb';
import { describe, expect, it } from 'vitest';
import { createOfflineStore, type StoredEvent } from './offline-store';

const event = (id: number): StoredEvent => ({
  id,
  calendarId: 1,
  userId: 1,
  title: 'Event',
  startDate: '2026-10-05T09:00:00.000Z',
  endDate: '2026-10-05T10:00:00.000Z',
  createdAt: '',
  updatedAt: '',
});

let dbCounter = 0;

// The layout before schema v3: the meta store did not exist yet.
interface LegacySchema extends DBSchema {
  responses: {
    key: string;
    value: { uri: string; data: string; storedAt: number };
  };
  outbox: {
    key: number;
    value: {
      seq: number;
      method: string;
      url: string;
      data?: string;
      params?: string;
      tempId?: number;
      attempts: number;
      queuedAt: number;
    };
  };
  failed: { key: number; value: unknown };
  idMap: { key: number; value: { tempId: number; realId: number } };
}

describe('createOfflineStore', () => {
  it('upgrades a pre-v3 database in place, keeping its data', async () => {
    const dbName = `legacy-${++dbCounter}`;
    const legacy = await openDB<LegacySchema>(dbName, 2, {
      upgrade(database) {
        database.createObjectStore('responses', { keyPath: 'uri' });
        database.createObjectStore('outbox', {
          keyPath: 'seq',
          autoIncrement: true,
        });
        database.createObjectStore('failed', { keyPath: 'seq' });
        database.createObjectStore('idMap', { keyPath: 'tempId' });
      },
    });
    await legacy.put('responses', {
      uri: '/api/notes/detail/1',
      data: '{"id":1}',
      storedAt: 1_700_000_000_000,
    });
    await legacy.add(
      'outbox',
      {
        method: 'PATCH',
        url: '/api/notes/1/timestamp',
        data: '{}',
        attempts: 0,
        queuedAt: 1_700_000_000_000,
      } as LegacySchema['outbox']['value']
    );
    await legacy.close();

    const store = createOfflineStore(dbName);

    expect(await store.getResponse('/api/notes/detail/1')).toEqual({
      uri: '/api/notes/detail/1',
      data: '{"id":1}',
      storedAt: 1_700_000_000_000,
    });
    expect(await store.outboxCount()).toBe(1);
  });

  it('round-trips meta values shared between tabs', async () => {
    const store = createOfflineStore(`meta-${++dbCounter}`);

    expect(await store.getMeta<number>('nextPrefetchAt')).toBeUndefined();
    await store.setMeta('nextPrefetchAt', 1234);
    expect(await store.getMeta<number>('nextPrefetchAt')).toBe(1234);
    await store.setMeta('nextPrefetchAt', 0);
    expect(await store.getMeta<number>('nextPrefetchAt')).toBe(0);
  });

  it('lets a second instance pick up ids recorded by the first', async () => {
    const dbName = `idmap-${++dbCounter}`;
    const first = createOfflineStore(dbName);
    const second = createOfflineStore(dbName);
    expect(await second.getIdMap()).toEqual(new Map());

    await first.recordId(-500, 7);

    expect(await second.getIdMap()).toEqual(new Map()); // stale in-memory copy
    second.invalidateIdMap();
    expect(await second.getIdMap()).toEqual(new Map([[-500, 7]]));
  });

  it('clears every store, meta and the in-memory id map included', async () => {
    const store = createOfflineStore(`clear-${++dbCounter}`);
    await store.putResponse('https://omega.test/api/notes/detail/1', '{}');
    await store.enqueue({ method: 'PATCH', url: '/api/notes/detail/1' });
    await store.enqueue({ method: 'PATCH', url: '/api/notes/detail/2' });
    const rejected = await store.peekOutbox();
    await store.moveToFailed(rejected!, 400, 'Bad Request');
    await store.recordId(-500, 7);
    expect(await store.getIdMap()).toEqual(new Map([[-500, 7]])); // cached
    await store.setMeta('owner', 'a');
    await store.putEvent(event(1));

    await store.clear();

    expect(await store.listResponseUris()).toEqual([]);
    expect(await store.outboxCount()).toBe(0);
    expect(await store.failedCount()).toBe(0);
    expect(await store.getIdMap()).toEqual(new Map());
    expect(await store.getMeta('owner')).toBeUndefined();
    expect(await store.listEvents()).toEqual([]);
  });

  it('rewrites a synced temp id wherever events refer to it', async () => {
    const store = createOfflineStore(`event-ids-${++dbCounter}`);
    const temp = -1_700_000_000_000_001;
    await store.putEvent({
      ...event(temp),
      reminders: [
        {
          id: -1_700_000_000_000_002,
          calendarEventId: temp,
          reminderMinutes: 10,
          sentAt: null,
          createdAt: '',
          updatedAt: '',
        },
      ],
    });
    // An occurrence standing in for a series created offline (a placeholder).
    await store.putEvent({ ...event(-1_700_000_000_000_003), recurringEventId: temp });

    await store.recordId(temp, 42);

    expect(await store.getEvent(temp)).toBeUndefined();
    expect((await store.getEvent(42))?.reminders?.[0].calendarEventId).toBe(42);
    expect((await store.getEvent(-1_700_000_000_000_003))?.recurringEventId).toBe(42);
  });
});
