import { describe, expect, it, vi } from 'vitest';
import {
  createInMemoryLockManager,
  fromWebLocks,
  type LockManager,
} from './locks';

let lockCounter = 0;
const uniqueName = () => `locks-test-${++lockCounter}`;

/** Holds `name` through `manager` until the returned function is called. */
const hold = async (manager: LockManager, name: string) => {
  let release!: () => void;
  const held = new Promise<void>(resolve => {
    release = resolve;
  });
  void manager.request(name, {}, () => held);
  // Let the request be granted before the caller races it.
  await new Promise(resolve => setTimeout(resolve, 0));
  return release;
};

const behavesLikeALock = (create: () => LockManager) => {
  it('runs the callback and resolves with its result when the lock is free', async () => {
    const manager = create();

    const result = await manager.request(uniqueName(), {}, () => 'done');

    expect(result).toBe('done');
  });

  it("with ifAvailable, doesn't run the callback while the lock is held", async () => {
    const manager = create();
    const name = uniqueName();
    const release = await hold(manager, name);
    const callback = vi.fn(() => 'ran');

    const result = await manager.request(name, { ifAvailable: true }, callback);

    expect(result).toBeUndefined();
    expect(callback).not.toHaveBeenCalled();
    release();
  });

  it('with ifAvailable, runs the callback once the lock is released', async () => {
    const manager = create();
    const name = uniqueName();
    const release = await hold(manager, name);
    release();
    await new Promise(resolve => setTimeout(resolve, 0));

    const result = await manager.request(
      name,
      { ifAvailable: true },
      () => 'ran'
    );

    expect(result).toBe('ran');
  });
};

// Against the real API: with ifAvailable it calls the callback with null
// rather than skipping it, which is what fromWebLocks has to absorb.
describe.runIf(typeof navigator !== 'undefined' && navigator.locks)(
  'fromWebLocks over navigator.locks',
  () => {
    behavesLikeALock(() => fromWebLocks(navigator.locks));
  }
);

describe('createInMemoryLockManager', () => {
  behavesLikeALock(createInMemoryLockManager);
});
