import 'fake-indexeddb/auto';
import type { AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';
import type { LockManager } from './locks';
import { createOfflineStore } from './offline-store';
import { createOutboxFlusher } from './outbox-flusher';

let dbCounter = 0;

// A per-name FIFO stand-in for navigator.locks: concurrent requests run one
// at a time, and ifAvailable requests give up while the lock is held.
const createFakeLocks = (): LockManager => {
  type State = { chain: Promise<unknown>; running: boolean };
  const states = new Map<string, State>();

  const stateFor = (name: string): State => {
    let state = states.get(name);
    if (!state) {
      state = { chain: Promise.resolve(), running: false };
      states.set(name, state);
    }
    return state;
  };

  return {
    request: (name, options, callback) => {
      const state = stateFor(name);
      if (options.ifAvailable && state.running) {
        return Promise.resolve(undefined);
      }
      const run = state.chain.then(async () => {
        state.running = true;
        try {
          return await callback();
        } finally {
          state.running = false;
        }
      });
      state.chain = run.catch(() => undefined);
      return run;
    },
  };
};

const jsonResponse = (id?: number): AxiosResponse =>
  ({ data: id === undefined ? {} : { id } }) as AxiosResponse;

describe('createOutboxFlusher across tabs', () => {
  it('replays each entry exactly once when two flushers flush concurrently', async () => {
    const locks = createFakeLocks();
    const store = createOfflineStore(`flusher-${++dbCounter}`);
    await store.enqueue({ method: 'POST', url: '/api/notes', data: '{"name":"a"}' });
    await store.enqueue({ method: 'POST', url: '/api/notes', data: '{"name":"b"}' });
    await store.enqueue({
      method: 'PATCH',
      url: '/api/notes/1/timestamp',
      data: '{}',
    });

    const replay = vi.fn(async () => jsonResponse());
    const first = createOutboxFlusher({ store, replay, locks });
    const second = createOutboxFlusher({ store, replay, locks });

    const outcomes = await Promise.all([first.flush(), second.flush()]);

    expect(outcomes).toEqual(['drained', 'drained']);
    expect(replay).toHaveBeenCalledTimes(3);
    expect(await store.outboxCount()).toBe(0);
  });

  it('reports busy and leaves the outbox intact when the lock wait times out', async () => {
    const store = createOfflineStore(`flusher-${++dbCounter}`);
    await store.enqueue({ method: 'POST', url: '/api/notes', data: '{"name":"a"}' });

    const replay = vi.fn(async () => jsonResponse());
    // What navigator.locks does when the wait signal (AbortSignal.timeout)
    // aborts: it rejects with the signal's reason, a DOMException named
    // TimeoutError.
    const timedOut: LockManager = {
      request: () =>
        Promise.reject(new DOMException('Timed out.', 'TimeoutError')),
    };
    const flusher = createOutboxFlusher({ store, replay, locks: timedOut });

    const outcome = await flusher.flush();

    expect(outcome).toBe('busy');
    expect(replay).not.toHaveBeenCalled();
    expect(await store.outboxCount()).toBe(1);
  });

  it('reports a recorded id so the other tabs can re-read the map', async () => {
    const locks = createFakeLocks();
    const store = createOfflineStore(`flusher-${++dbCounter}`);
    const tempId = -(Date.now() * 1000);
    await store.enqueue({
      method: 'POST',
      url: '/api/notes',
      data: '{"name":"a"}',
      tempId,
    });

    const replay = vi.fn(async () => jsonResponse(42));
    const onIdRecorded = vi.fn();
    const flusher = createOutboxFlusher({ store, replay, locks, onIdRecorded });

    await flusher.flush();

    expect(onIdRecorded).toHaveBeenCalledTimes(1);
    expect(await store.getIdMap()).toEqual(new Map([[tempId, 42]]));
  });
});
