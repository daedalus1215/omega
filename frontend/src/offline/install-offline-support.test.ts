import 'fake-indexeddb/auto';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tauriTransport } from '../tauri/tauri-transport';
import {
  claimOfflineData,
  clearOfflineData,
  getOfflineSummary,
  installOfflineSupport,
  PREFETCH_LOCK_NAME,
  syncNow,
} from './install-offline-support';
import { createOfflineStore, type OfflineStore } from './offline-store';
import { type OfflineTransport } from './offline-transport';
import { getSyncStatus, onSyncProblem, updateSyncStatus } from './sync-status';
import { prefetchCalendar } from './prefetch-calendar';
import { createInMemoryLockManager, type LockManager } from './locks';

let dbCounter = 0;

vi.mock('./prefetch-calendar', () => ({
  prefetchCalendar: vi.fn(async () => ({
    events: 0,
    outcome: 'complete' as const,
  })),
}));

const setup = (
  transport?: OfflineTransport,
  locks?: LockManager,
  store = createOfflineStore(`install-${++dbCounter}`)
) => {
  const fetchImpl = vi.fn(
    async (_input: URL | Request | string, _init?: RequestInit) =>
      new Response('{"id":1}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
  );
  const api = axios.create({ baseURL: 'https://omega.test' });
  api.defaults.adapter = 'fetch';
  api.defaults.env = { ...api.defaults.env, fetch: fetchImpl };
  const sync = installOfflineSupport(api, {
    store,
    schedule: false,
    transport,
    locks,
  });
  return { api, fetchImpl, store, sync };
};

const stubLoggedIn = () => {
  const storage = new Map([['jwt_token', 'token']]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
  });
};

describe('installOfflineSupport', () => {
  it('sends requests through the configured env.fetch', async () => {
    const { api, fetchImpl } = setup();

    const response = await api.get('/api/notes/detail/1');

    expect(response.data).toEqual({ id: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  // Tauri's fetch rejects with the Rust error as a plain string, not an Error.
  it('serves stored responses when env.fetch rejects with a string', async () => {
    const { api, fetchImpl } = setup();
    await api.get('/api/notes/detail/1');

    fetchImpl.mockRejectedValueOnce(
      'error sending request for url (https://omega.test/api/notes/detail/1)'
    );
    const response = await api.get('/api/notes/detail/1');

    expect(response.data).toEqual({ id: 1 });
  });
});

describe('installOfflineSupport replay', () => {
  it('lets replayed writes through to the network instead of re-queuing them', async () => {
    const { api, fetchImpl } = setup();
    fetchImpl.mockRejectedValueOnce('error sending request');
    const queued = await api.patch('/api/calendars/1', { name: 'x' });
    expect(queued.headers['x-omega-offline']).toBe('1');

    await api.request({
      method: 'PATCH',
      url: '/api/calendars/1',
      data: '{"name":"x"}',
      offlineReplay: true,
    });

    const [input, init] = fetchImpl.mock.calls.at(-1)!;
    const request = new Request(input, init);
    expect(request.method).toBe('PATCH');
    expect(await request.text()).toBe('{"name":"x"}');
  });
});

describe('installOfflineSupport session expiry', () => {
  const unauthorized = () =>
    new Response('{"message":"Unauthorized"}', {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });

  beforeEach(stubLoggedIn);
  afterEach(() => {
    vi.unstubAllGlobals();
    updateSyncStatus({ sessionExpired: false });
  });

  it('flags an expired session and keeps serving stored responses', async () => {
    const { api, fetchImpl } = setup();
    await api.get('/api/notes/detail/1');

    fetchImpl.mockResolvedValueOnce(unauthorized());
    const response = await api.get('/api/notes/detail/1');

    expect(response.data).toEqual({ id: 1 });
    expect(getSyncStatus().sessionExpired).toBe(true);
  });

  it('reports the expiry once, not for every request turned away', async () => {
    const { api, fetchImpl } = setup();
    await api.get('/api/notes/detail/1');
    const onProblem = vi.fn();
    const stopListening = onSyncProblem(onProblem);
    fetchImpl.mockImplementation(async () => unauthorized());

    await api.get('/api/notes/detail/1');
    await api.get('/api/notes/detail/1');
    stopListening();

    expect(onProblem).toHaveBeenCalledExactlyOnceWith({
      kind: 'session-expired',
    });
  });

  it("doesn't treat a wrong password as an expired session", async () => {
    const { api, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(unauthorized());

    await expect(
      api.post('/api/auth/login', { username: 'u', password: 'wrong' })
    ).rejects.toMatchObject({ response: { status: 401 } });
    expect(getSyncStatus().sessionExpired).toBe(false);
  });

  it('holds queued writes until the next login', async () => {
    const { api, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(unauthorized());
    await api.patch('/api/calendars/1', { name: 'first' });
    expect(getSyncStatus().sessionExpired).toBe(true);

    // Queuing behind a pending write asks for a flush, which must not
    // replay anything with the expired token.
    await api.patch('/api/calendars/1', { name: 'second' });
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("doesn't sync now with an expired session", async () => {
    const { api, fetchImpl } = setup();
    fetchImpl.mockResolvedValueOnce(unauthorized());
    await api.patch('/api/calendars/1', { name: 'x' });

    expect(await syncNow()).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('installOfflineSupport Cloudflare Access', () => {
  // What Cloudflare Access answers when the service token isn't accepted.
  const accessRedirect = () =>
    new Response('<html>Sign in</html>', {
      status: 302,
      headers: {
        'content-type': 'text/html',
        location: 'https://team.cloudflareaccess.com/cdn-cgi/access/login/x',
        'www-authenticate': 'Cloudflare-Access resource_metadata="x"',
      },
    });

  beforeEach(stubLoggedIn);
  afterEach(() => {
    vi.unstubAllGlobals();
    updateSyncStatus({ accessDenied: false });
  });

  it("asks Tauri's fetch not to follow redirects", async () => {
    const { api, fetchImpl } = setup(tauriTransport);

    await api.get('/api/notes/detail/1');

    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ maxRedirections: 0 });
  });

  it('keeps serving stored responses without storing its login page, until requests get through again', async () => {
    const { api, fetchImpl, store } = setup();
    await api.get('/api/notes/detail/1');

    fetchImpl.mockResolvedValueOnce(accessRedirect());
    const response = await api.get('/api/notes/detail/1');

    expect(response.data).toEqual({ id: 1 });
    expect(
      await store.getJson('https://omega.test/api/notes/detail/1')
    ).toEqual({ id: 1 });
    expect(getSyncStatus().accessDenied).toBe(true);

    await api.get('/api/notes/detail/1');
    expect(getSyncStatus().accessDenied).toBe(false);
  });

  it('reports the rejection once, not for every request turned away', async () => {
    const { api, fetchImpl } = setup();
    await api.get('/api/notes/detail/1');
    const onProblem = vi.fn();
    const stopListening = onSyncProblem(onProblem);
    fetchImpl.mockImplementation(async () => accessRedirect());

    await api.get('/api/notes/detail/1');
    await api.get('/api/notes/detail/1');
    stopListening();

    expect(onProblem).toHaveBeenCalledExactlyOnceWith({
      kind: 'access-denied',
    });
  });

  it('queues writes, and keeps them queued when syncing instead of setting them aside', async () => {
    const { api, fetchImpl, store } = setup();
    fetchImpl.mockImplementation(async () => accessRedirect());

    const queued = await api.patch('/api/calendars/1', { name: 'x' });
    expect(queued.headers['x-omega-offline']).toBe('1');

    expect(await syncNow()).toBe(true);
    expect(await store.outboxCount()).toBe(1);
    expect(await store.failedCount()).toBe(0);
  });
});

describe('installOfflineSupport reachability', () => {
  beforeEach(() => updateSyncStatus({ reachable: true }));
  afterEach(() => updateSyncStatus({ reachable: true }));

  it('tells the other tabs when the backend stops or starts answering, once per change', async () => {
    const { api, fetchImpl } = setup();
    const otherTab = new BroadcastChannel('omega-offline');
    const posted: unknown[] = [];
    otherTab.onmessage = event => {
      const patch = (event.data as { patch?: object }).patch;
      if (patch && 'reachable' in patch) posted.push(patch);
    };
    // Straight to the network every time, as the background probe does.
    const fetchNote = () =>
      api
        .get('/api/notes/detail/1', { noOfflineFallback: true })
        .catch(() => undefined);

    await fetchNote();
    fetchImpl.mockRejectedValue('error sending request');
    await fetchNote();
    await fetchNote();
    fetchImpl.mockImplementation(async () => new Response('{"id":1}'));
    await fetchNote();
    await fetchNote();

    await vi.waitFor(() =>
      expect(posted).toEqual([{ reachable: false }, { reachable: true }])
    );
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(posted).toHaveLength(2);
    otherTab.close();
  });
});

describe('installOfflineSupport sync counts', () => {
  beforeEach(stubLoggedIn);
  afterEach(() => vi.unstubAllGlobals());

  it('counts the changes waiting to sync and the ones set aside', async () => {
    const store = createOfflineStore(`install-${++dbCounter}`);
    await store.enqueue({
      method: 'PUT',
      url: '/api/calendar-events/9',
      data: '{"title":"gone"}',
    });
    await store.moveToFailed((await store.peekOutbox())!, 404, 'Not Found');
    const { api, fetchImpl } = setup(undefined, undefined, store);
    fetchImpl.mockRejectedValue('error sending request');

    await api.patch('/api/calendars/5', { name: 'x' });

    expect(await store.outboxCount()).toBe(1);
    await vi.waitFor(() =>
      expect(getSyncStatus()).toMatchObject({ pending: 1, failed: 1 })
    );
  });
});

describe('syncNow', () => {
  beforeEach(stubLoggedIn);
  afterEach(() => vi.unstubAllGlobals());

  it('sends queued writes straight away', async () => {
    const { api, fetchImpl } = setup();
    fetchImpl.mockRejectedValueOnce('error sending request');
    await api.patch('/api/calendars/1', { name: 'x' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    expect(await syncNow()).toBe(true);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(new Request(...fetchImpl.mock.calls[1]).method).toBe('PATCH');
  });
});

describe('installOfflineSupport prefetch', () => {
  // The only lock behavior the prefetch gate needs: ifAvailable gives up
  // while the lock is held, and everything else runs directly.
  const createPrefetchLocks = () => {
    let held = false;
    const locks: LockManager = {
      request: (name, options, callback) =>
        name === PREFETCH_LOCK_NAME && options.ifAvailable && held
          ? Promise.resolve(undefined)
          : Promise.resolve(callback()),
    };
    return {
      locks,
      hold: () => {
        held = true;
      },
    };
  };

  // Each tab holds its first prefetch back for a minute after launch.
  const PAST_STARTUP_DELAY_MS = 61_000;
  const realNow = Date.now.bind(Date);
  let clock: { mockRestore: () => void } | undefined;
  /** Moves Date.now() `ms` past the real clock; returns the new now. */
  const later = (ms: number): number => {
    const now = realNow() + ms;
    clock?.mockRestore();
    clock = vi.spyOn(Date, 'now').mockReturnValue(now);
    return now;
  };

  afterEach(() => {
    clock?.mockRestore();
    clock = undefined;
    vi.mocked(prefetchCalendar).mockClear();
  });

  it('prefetches on a device with no schedule stored yet, once the startup delay has passed', async () => {
    const { store, sync } = setup();

    await sync();
    expect(prefetchCalendar).not.toHaveBeenCalled();

    const now = later(PAST_STARTUP_DELAY_MS);
    await sync();

    expect(prefetchCalendar).toHaveBeenCalledTimes(1);
    expect(await store.getMeta<number>('nextPrefetchAt')).toBe(
      now + 30 * 60_000
    );
  });

  it('holds back even an overdue run until the startup delay has passed', async () => {
    const { store, sync } = setup();
    await store.setMeta('nextPrefetchAt', Date.now() - 60 * 60_000);

    await sync();
    expect(prefetchCalendar).not.toHaveBeenCalled();

    later(PAST_STARTUP_DELAY_MS);
    await sync();
    expect(prefetchCalendar).toHaveBeenCalledTimes(1);
  });

  it('refreshes straight away, startup delay or not, once queued writes get through after an outage', async () => {
    const { fetchImpl, store, sync } = setup();
    await store.enqueue({
      method: 'PATCH',
      url: '/api/notes/detail/1',
      data: '{"title":"edited"}',
    });
    fetchImpl.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await sync(); // the replay finds the backend unreachable
    expect(prefetchCalendar).not.toHaveBeenCalled();

    await sync(); // the backend is back
    expect(await store.outboxCount()).toBe(0);
    expect(prefetchCalendar).toHaveBeenCalledTimes(1);
  });

  it('skips the prefetch while the shared schedule is in the future', async () => {
    const { store, sync } = setup();
    const now = later(PAST_STARTUP_DELAY_MS);
    await store.setMeta('nextPrefetchAt', now + 60_000);

    await sync();

    expect(prefetchCalendar).not.toHaveBeenCalled();
  });

  it('skips the prefetch while another tab holds the prefetch lock', async () => {
    const { locks, hold } = createPrefetchLocks();
    const { store, sync } = setup(undefined, locks);
    const now = later(PAST_STARTUP_DELAY_MS);
    await store.setMeta('nextPrefetchAt', now - 1);
    hold();

    await sync();

    expect(prefetchCalendar).not.toHaveBeenCalled();
  });

  it('prefetches when due, and shares the next run via the meta store', async () => {
    const { locks } = createPrefetchLocks();
    const { store, sync } = setup(undefined, locks);
    const now = later(PAST_STARTUP_DELAY_MS);
    await store.setMeta('nextPrefetchAt', now - 1);

    await sync();

    expect(prefetchCalendar).toHaveBeenCalledTimes(1);
    expect(await store.getMeta<number>('nextPrefetchAt')).toBe(
      now + 30 * 60_000
    );
  });

  // A run takes minutes (requests are spaced out) while sync ticks every
  // 30 s. Both lock managers: navigator.locks where the runtime has it
  // (Node 22+, browsers), and the fallback for runtimes without it.
  it.each([
    ['the default lock manager', undefined],
    ['the in-memory fallback', createInMemoryLockManager()],
  ])(
    "doesn't start a second prefetch while this tab's run is still going (%s)",
    async (_name, locks) => {
      let finish!: () => void;
      vi.mocked(prefetchCalendar).mockImplementationOnce(
        () =>
          new Promise(resolve => {
            finish = () => resolve({ events: 0, outcome: 'complete' });
          })
      );
      const { store, sync } = setup(undefined, locks);
      later(PAST_STARTUP_DELAY_MS);
      await store.setMeta('nextPrefetchAt', 0);

      const first = sync();
      await vi.waitFor(() => expect(prefetchCalendar).toHaveBeenCalledTimes(1));
      await sync(); // the next tick, mid-run

      expect(prefetchCalendar).toHaveBeenCalledTimes(1);
      finish();
      await first;
    }
  );
});

const NOTE_URI = 'https://omega.test/api/notes/detail/1';

// jwt-decode only reads the payload segment.
const tokenFor = (sub: string) =>
  `header.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.signature`;

/** One of everything a user leaves behind, owned by `owner`. */
const fillStore = async (store: OfflineStore, owner?: string) => {
  await store.putResponse(NOTE_URI, '{"id":1,"title":"theirs"}');
  await store.enqueue({
    method: 'PATCH',
    url: '/api/notes/detail/1',
    data: '{"title":"theirs, edited"}',
  });
  await store.enqueue({ method: 'DELETE', url: '/api/notes/2' });
  const rejected = await store.peekOutbox();
  await store.moveToFailed(rejected!, 400, 'Bad Request');
  await store.recordId(-500, 7);
  await store.setMeta('nextPrefetchAt', Date.now() + 60_000);
  if (owner !== undefined) await store.setMeta('owner', owner);
};

const expectEmpty = async (store: OfflineStore) => {
  expect(await store.getResponse(NOTE_URI)).toBeUndefined();
  expect(await store.outboxCount()).toBe(0);
  expect(await store.failedCount()).toBe(0);
  expect(await store.getIdMap()).toEqual(new Map());
  expect(await store.getMeta('nextPrefetchAt')).toBeUndefined();
};

describe('claimOfflineData', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('adopts data stored before ownership existed', async () => {
    const { store } = setup();
    await fillStore(store);

    expect(await claimOfflineData('a')).toBe(false);

    expect(await store.getMeta('owner')).toBe('a');
    expect(await store.getResponse(NOTE_URI)).toBeDefined();
    expect(await store.outboxCount()).toBe(1);
  });

  it("keeps its owner's data", async () => {
    const { store } = setup();
    await fillStore(store, 'a');

    expect(await claimOfflineData('a')).toBe(false);

    expect(await store.getResponse(NOTE_URI)).toBeDefined();
    expect(await store.outboxCount()).toBe(1);
  });

  it("deletes another user's data, queued writes included", async () => {
    const { store } = setup();
    await fillStore(store, 'a');

    expect(await claimOfflineData('b')).toBe(true);

    await expectEmpty(store);
    expect(await store.getMeta('owner')).toBe('b');
  });

  it("never serves another user's stored copy, even to a read made while the claim runs", async () => {
    const { api, fetchImpl, store } = setup();
    await fillStore(store, 'a');
    fetchImpl.mockRejectedValue(new TypeError('Failed to fetch')); // offline

    const claim = claimOfflineData('b');
    const read = api.get('/api/notes/detail/1').then(
      response => response.data,
      (error: unknown) => error
    );

    expect(await read).toBeInstanceOf(Error);
    await claim;
  });

  it("never replays another user's queued writes", async () => {
    stubLoggedIn();
    const { fetchImpl, store } = setup();
    await fillStore(store, 'a');

    void claimOfflineData('b');
    expect(await syncNow()).toBe(true);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(await store.outboxCount()).toBe(0);
  });

  it('claims for the logged-in user at startup', async () => {
    const store = createOfflineStore(`install-${++dbCounter}`);
    await fillStore(store, 'a');
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === 'jwt_token' ? tokenFor('b') : null),
    });

    setup(undefined, undefined, store);

    await vi.waitFor(async () =>
      expect(await store.getMeta('owner')).toBe('b')
    );
    await expectEmpty(store);
  });
});

describe('clearOfflineData', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('deletes everything, owner included, resets the status and tells the other tabs', async () => {
    const { store } = setup();
    await fillStore(store, 'a');
    updateSyncStatus({ sessionExpired: true, pending: 1, failed: 1 });
    const otherTab = new BroadcastChannel('omega-offline');
    const received: unknown[] = [];
    otherTab.onmessage = event => received.push(event.data);

    await clearOfflineData();

    await expectEmpty(store);
    expect(await store.getMeta('owner')).toBeUndefined();
    expect(getSyncStatus()).toMatchObject({
      sessionExpired: false,
      pending: 0,
      failed: 0,
    });
    await vi.waitFor(() =>
      expect(received).toContainEqual({ type: 'data-cleared' })
    );
    otherTab.close();
  });

  it('waits for a running flush, so it never writes ids back after the clear', async () => {
    stubLoggedIn();
    const { fetchImpl, store } = setup();
    await store.enqueue({
      method: 'POST',
      url: '/api/notes',
      data: '{"name":"new"}',
      tempId: -1_000_000_000_000_001,
    });
    let answer!: () => void;
    fetchImpl.mockImplementationOnce(
      () =>
        new Promise<Response>(resolve => {
          answer = () =>
            resolve(
              new Response('{"id":42}', {
                headers: { 'content-type': 'application/json' },
              })
            );
        })
    );

    const flushing = syncNow();
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    const clearing = clearOfflineData();
    answer(); // the create succeeds mid-clear; its id gets recorded
    await Promise.all([flushing, clearing]);

    expect(await store.getIdMap()).toEqual(new Map());
    expect(await store.outboxCount()).toBe(0);
  });
});

describe('getOfflineSummary', () => {
  it('counts the stored events, offline-created ones included, and the ranges they cover', async () => {
    const { store } = setup();
    const event = (id: number) => ({
      id,
      calendarId: 1,
      userId: 1,
      title: 'Event',
      startDate: '2026-10-05T09:00:00.000Z',
      endDate: '2026-10-05T10:00:00.000Z',
      createdAt: '',
      updatedAt: '',
    });
    await store.putEvent(event(1));
    await store.putEvent(event(-1_700_000_000_000_001));
    await store.setMeta('eventCoverage', [{ start: 1, end: 2 }]);

    expect(await getOfflineSummary()).toEqual({
      events: 2,
      coverage: [{ start: 1, end: 2 }],
    });
  });
});
