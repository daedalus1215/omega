import 'fake-indexeddb/auto';
import {
  AxiosError,
  AxiosHeaders,
  CanceledError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { describe, expect, it, vi } from 'vitest';
import {
  createOfflineAdapter,
  OFFLINE_RESPONSE_HEADER,
} from './offline-adapter';
import { createOfflineStore } from './offline-store';

let dbCounter = 0;
const freshStore = () => createOfflineStore(`offline-adapter-${++dbCounter}`);

const BASE = 'https://omega.test';

const makeConfig = (
  url: string,
  method = 'get',
  extra: Partial<InternalAxiosRequestConfig> = {}
): InternalAxiosRequestConfig => ({
  url,
  method,
  headers: new AxiosHeaders(),
  ...extra,
});

const ok = (
  config: InternalAxiosRequestConfig,
  data: unknown,
  status = 200
): AxiosResponse => ({
  data,
  status,
  statusText: 'OK',
  headers: new AxiosHeaders(),
  config,
});

const networkError = (config: InternalAxiosRequestConfig) =>
  new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);

// Defaults to the JSON body the backend sends with its errors.
const httpError = (
  config: InternalAxiosRequestConfig,
  status: number,
  body = JSON.stringify({ statusCode: status, message: 'Error' })
) =>
  new AxiosError(
    `Request failed with status code ${status}`,
    AxiosError.ERR_BAD_RESPONSE,
    config,
    undefined,
    ok(config, body, status)
  );

const setup = () => {
  const send = vi.fn();
  const store = freshStore();
  const adapter = createOfflineAdapter({
    send,
    store,
    getUri: config => `${BASE}${config.url}`,
  });
  return { send, store, adapter };
};

describe('createOfflineAdapter', () => {
  it('serves the last successful GET response when the backend is unreachable', async () => {
    const { send, adapter } = setup();
    const config = makeConfig('/api/notes/detail/5');
    send.mockResolvedValueOnce(ok(config, '{"id":5,"name":"Fresh"}'));
    await adapter(config);

    send.mockRejectedValueOnce(networkError(config));
    const offline = await adapter(config);

    expect(offline.data).toBe('{"id":5,"name":"Fresh"}');
    expect(offline.status).toBe(200);
    expect((offline.headers as AxiosHeaders).get(OFFLINE_RESPONSE_HEADER)).toBe(
      '1'
    );
  });

  it('keys responses by full URI, including query params', async () => {
    const { send, adapter } = setup();
    const page0 = makeConfig('/api/notes/names?cursor=0');
    const page1 = makeConfig('/api/notes/names?cursor=1');
    send.mockResolvedValueOnce(ok(page0, '"page 0"'));
    await adapter(page0);

    send.mockRejectedValueOnce(networkError(page1));
    await expect(adapter(page1)).rejects.toThrow('Network Error');
  });

  it('rethrows when unreachable and nothing is stored', async () => {
    const { send, adapter } = setup();
    const config = makeConfig('/api/notes/detail/9');
    send.mockRejectedValueOnce(networkError(config));

    await expect(adapter(config)).rejects.toThrow('Network Error');
  });

  it('treats Cloudflare origin errors as unreachable', async () => {
    const { send, adapter } = setup();
    const config = makeConfig('/api/notes/detail/5');
    send.mockResolvedValueOnce(ok(config, '"cached"'));
    await adapter(config);

    send.mockRejectedValueOnce(httpError(config, 522));
    expect((await adapter(config)).data).toBe('"cached"');
  });

  it("treats the proxy's plain-text 404 as unreachable", async () => {
    const { send, adapter } = setup();
    const config = makeConfig('/api/notes/detail/5');
    send.mockResolvedValueOnce(ok(config, '"cached"'));
    await adapter(config);

    send.mockRejectedValueOnce(httpError(config, 404, '404 page not found\n'));
    expect((await adapter(config)).data).toBe('"cached"');
  });

  it('passes through errors the backend itself answered with', async () => {
    const { send, adapter } = setup();
    const config = makeConfig('/api/notes/detail/5');
    send.mockResolvedValueOnce(ok(config, '"cached"'));
    await adapter(config);

    send.mockRejectedValueOnce(httpError(config, 404));
    await expect(adapter(config)).rejects.toMatchObject({
      response: { status: 404 },
    });
  });

  it('does not store non-text responses', async () => {
    const { send, store, adapter } = setup();
    const config = makeConfig('/api/audio/7/download');
    send.mockResolvedValueOnce(ok(config, new Blob(['audio'])));
    await adapter(config);

    expect(await store.getResponse(`${BASE}/api/audio/7/download`)).toBe(
      undefined
    );
  });

  it('passes non-GET requests straight to the network', async () => {
    const { send, store, adapter } = setup();
    const config = makeConfig('/api/notes/detail/5', 'patch');
    send.mockResolvedValueOnce(ok(config, '{"id":5}'));

    await adapter(config);

    expect(send).toHaveBeenCalledWith(config);
    expect(await store.getResponse(`${BASE}/api/notes/detail/5`)).toBe(
      undefined
    );
  });
});

describe('createOfflineAdapter reachability', () => {
  it('reports whether requests reached the backend, ignoring cancellations', async () => {
    const send = vi.fn();
    const onReachabilityChange = vi.fn();
    const adapter = createOfflineAdapter({
      send,
      store: freshStore(),
      getUri: config => `${BASE}${config.url}`,
      onReachabilityChange,
    });
    const config = makeConfig('/api/notes/detail/5');

    send.mockRejectedValueOnce(networkError(config));
    await adapter(config).catch(() => undefined);
    send.mockRejectedValueOnce(httpError(config, 404));
    await adapter(config).catch(() => undefined);
    send.mockRejectedValueOnce(new CanceledError(undefined, undefined, config));
    await adapter(config).catch(() => undefined);
    send.mockResolvedValueOnce(ok(config, '{}'));
    await adapter(config);

    expect(onReachabilityChange.mock.calls).toEqual([[false], [true], [true]]);
  });

  it('answers reads locally once the backend is unreachable, still sending one at a time', async () => {
    const { send, store, adapter } = setup();
    await store.putResponse(`${BASE}/api/notes/detail/1`, '{"id":1}');
    await store.putResponse(`${BASE}/api/notes/detail/2`, '{"id":2}');
    const first = makeConfig('/api/notes/detail/1');
    send.mockRejectedValueOnce(networkError(first));
    await adapter(first);

    // From here on requests hang, like connecting with no network at all.
    send.mockImplementation(() => new Promise(() => {}));
    const second = await adapter(makeConfig('/api/notes/detail/2'));
    await adapter(makeConfig('/api/notes/detail/1'));

    expect(second.data).toBe('{"id":2}');
    // The first read, then one of the two after it.
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('goes back to the network once a background request gets an answer', async () => {
    const { send, store, adapter } = setup();
    const uri = `${BASE}/api/notes/detail/1`;
    await store.putResponse(uri, '"old"');
    const config = makeConfig('/api/notes/detail/1');
    send.mockRejectedValueOnce(networkError(config));
    await adapter(config);

    let answer!: (response: AxiosResponse) => void;
    send.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          answer = resolve;
        })
    );
    const local = await adapter(config);
    answer(ok(config, '"new"'));
    await vi.waitFor(async () =>
      expect((await store.getResponse(uri))?.data).toBe('"new"')
    );
    send.mockResolvedValueOnce(ok(config, '"newer"'));
    const fresh = await adapter(config);

    expect(local.data).toBe('"old"');
    expect(fresh.data).toBe('"newer"');
  });

  it('queues writes without trying the network while the backend is unreachable', async () => {
    const send = vi.fn();
    const requestFlush = vi.fn();
    const store = freshStore();
    const adapter = createOfflineAdapter({
      send,
      store,
      getUri: config => `${BASE}${config.url}`,
      requestFlush,
    });
    const read = makeConfig('/api/notes/detail/5');
    send.mockRejectedValueOnce(networkError(read));
    await adapter(read).catch(() => undefined);

    await adapter(
      makeConfig('/api/calendars/5', 'patch', {
        data: JSON.stringify({ name: 'Work' }),
      })
    );

    expect(send).toHaveBeenCalledTimes(1);
    expect(await store.outboxCount()).toBe(1);
    // The flush finds out whether the backend is back.
    expect(requestFlush).toHaveBeenCalledTimes(1);
  });
});

describe('createOfflineAdapter timeout', () => {
  const setupWithTimeout = () => {
    const send = vi.fn(
      async (config: InternalAxiosRequestConfig) => ok(config, '{}')
    );
    const store = freshStore();
    const adapter = createOfflineAdapter({
      send,
      store,
      getUri: config => `${BASE}${config.url}`,
      requestTimeoutMs: 15_000,
    });
    return { send, adapter };
  };

  it('applies the default timeout to GETs', async () => {
    const { send, adapter } = setupWithTimeout();
    await adapter(makeConfig('/api/notes/names'));
    expect(send.mock.calls[0][0].timeout).toBe(15_000);
  });

  it('leaves an explicit timeout alone', async () => {
    const { send, adapter } = setupWithTimeout();
    await adapter(makeConfig('/api/notes/names', 'get', { timeout: 30_000 }));
    expect(send.mock.calls[0][0].timeout).toBe(30_000);
  });

  it('leaves blob GETs without a timeout', async () => {
    const { send, adapter } = setupWithTimeout();
    await adapter(
      makeConfig('/api/notes/names', 'get', { responseType: 'blob' })
    );
    expect(send.mock.calls[0][0].timeout).toBeUndefined();
  });

  it('applies the default timeout to offline-routable writes', async () => {
    const { send, adapter } = setupWithTimeout();
    await adapter(
      makeConfig('/api/calendars/1', 'patch', {
        data: JSON.stringify({ name: 'edited' }),
      })
    );
    expect(send.mock.calls[0][0].timeout).toBe(15_000);
  });

  it('leaves non-routable writes without a timeout', async () => {
    const { send, adapter } = setupWithTimeout();
    await adapter(
      makeConfig('/api/auth/login', 'post', { data: '{}' })
    );
    expect(send.mock.calls[0][0].timeout).toBeUndefined();
  });

  it('applies the default timeout to replays', async () => {
    const { send, adapter } = setupWithTimeout();
    await adapter(
      makeConfig('/api/notes/detail/1', 'patch', {
        data: JSON.stringify({ title: 'edited' }),
        offlineReplay: true,
      })
    );
    expect(send.mock.calls[0][0].timeout).toBe(15_000);
  });
});
