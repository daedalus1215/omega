import 'fake-indexeddb/auto';
import axios, {
  AxiosError,
  AxiosHeaders,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installOfflineSupport, syncNow } from './install-offline-support';
import { createWebTransport } from './offline-transport';
import { createOfflineStore } from './offline-store';
import { getSyncStatus, updateSyncStatus } from './sync-status';

let dbCounter = 0;

const BASE = 'https://omega.test';
const NOTE_URI = `${BASE}/api/notes/detail/1`;

// The browser's opaque redirect: `new Response(null, { status: 0 })` throws,
// so shadow the getters instead.
const opaqueRedirect = (): Response => {
  const response = new Response(null, { status: 200 });
  Object.defineProperty(response, 'status', { value: 0 });
  Object.defineProperty(response, 'type', { value: 'opaqueredirect' });
  return response;
};

const json = (body: string) =>
  new Response(body, { headers: { 'content-type': 'application/json' } });

const stubLoggedIn = () => {
  const storage = new Map([['jwt_token', 'token']]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
  });
};

const setup = (fetchImpl: typeof fetch, timeoutMs = 200) => {
  const api = axios.create({ baseURL: BASE });
  api.defaults.env = { ...api.defaults.env, fetch: fetchImpl };
  const store = createOfflineStore(`web-transport-${++dbCounter}`);
  installOfflineSupport(api, {
    store,
    schedule: false,
    transport: createWebTransport({ timeoutMs }),
  });
  return { api, store };
};

afterEach(() => {
  vi.unstubAllGlobals();
  updateSyncStatus({ accessDenied: false, reachable: true });
});

describe('createWebTransport', () => {
  const configWith = (fetchImpl: typeof fetch) =>
    ({
      url: NOTE_URI,
      method: 'get',
      headers: new AxiosHeaders(),
      env: { fetch: fetchImpl },
    }) as InternalAxiosRequestConfig;

  it('rejects an opaque redirect instead of settling it as a success', async () => {
    const transport = createWebTransport();
    const config = configWith(vi.fn(async () => opaqueRedirect()));
    const error: unknown = await transport.send(config).catch(err => err);
    expect(error).toBeInstanceOf(AxiosError);
    expect((error as AxiosError).response?.status).toBe(0);
  });

  it('lets real responses through', async () => {
    const transport = createWebTransport();
    const config = configWith(vi.fn(async () => json('{"id":1}')));
    const response = await transport.send(config);
    expect(response.status).toBe(200);
  });
});

describe('web transport through the offline layer', () => {
  // Followed, a Cloudflare Access redirect fails CORS and passes for being
  // offline; only a manual redirect comes back as the opaque response the
  // guard recognizes.
  it("asks the browser's fetch not to follow redirects", async () => {
    const fetchImpl = vi.fn(
      async (_input: URL | Request | string, _init?: RequestInit) =>
        json('{"id":1}')
    );
    const { api } = setup(fetchImpl);

    await api.get('/api/notes/detail/1');

    expect(new Request(...fetchImpl.mock.calls[0]).redirect).toBe('manual');
  });

  it('serves the stored copy on an opaque redirect, flags access denied, and keeps the stored copy intact', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () =>
      calls++ === 0 ? json('{"id":1,"title":"real"}') : opaqueRedirect()
    );
    const { api, store } = setup(fetchImpl);

    const first = await api.get('/api/notes/detail/1');
    expect(first.data).toEqual({ id: 1, title: 'real' });

    const second = await api.get('/api/notes/detail/1');
    expect(second.data).toEqual({ id: 1, title: 'real' });

    const cached = await store.getResponse(NOTE_URI);
    expect(cached?.data).toBe('{"id":1,"title":"real"}');
    expect(getSyncStatus().accessDenied).toBe(true);
  });

  it('keeps a queued write queued when the replay meets an opaque redirect', async () => {
    stubLoggedIn();
    const fetchImpl = vi.fn(async () => opaqueRedirect());
    const { api, store } = setup(fetchImpl);

    await api.patch('/api/calendars/1', { name: 'edited' });
    expect(await store.outboxCount()).toBe(1);

    expect(await syncNow()).toBe(true);

    expect(await store.outboxCount()).toBe(1);
    expect(getSyncStatus().accessDenied).toBe(true);
  });

  it('times out a blackholed GET and serves the stored copy', async () => {
    const { api } = setup(vi.fn(async () => json('{"id":1,"title":"real"}')));
    await api.get('/api/notes/detail/1');

    // The backend now blackholes: fetch hangs until the axios timeout aborts
    // it, which the offline layer classifies as unreachable.
    const hanging = vi.fn(
      (input: URL | Request | string) =>
        new Promise<Response>((_resolve, reject) => {
          // The axios fetch adapter passes a Request as the first argument
          // where the Request constructor is supported (node, browsers);
          // the timeout's abort signal rides on it.
          const signal = (input as Request).signal;
          signal.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          });
        })
    );
    api.defaults.env = { ...api.defaults.env, fetch: hanging };

    const { data } = await api.get('/api/notes/detail/1');
    expect(data).toEqual({ id: 1, title: 'real' });
    expect(getSyncStatus().reachable).toBe(false);
  });
});
