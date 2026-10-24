import { afterEach, describe, expect, it, vi } from 'vitest';
import { signOutAndClear, unsyncedChanges, type SignOutSteps } from './sign-out';

const recordingSteps = (clearOfflineData: () => Promise<void>) => {
  const calls: string[] = [];
  const steps: SignOutSteps = {
    logout: () => calls.push('logout'),
    goToLogin: () => calls.push('goToLogin'),
    clearOfflineData: async () => {
      calls.push('clearOfflineData:start');
      await clearOfflineData();
      calls.push('clearOfflineData:done');
    },
    clearQueryCache: () => calls.push('clearQueryCache'),
  };
  return { calls, steps };
};

describe('unsyncedChanges', () => {
  it('counts queued and set-aside writes alike', () => {
    expect(unsyncedChanges({ pending: 0, failed: 0 })).toBe(0);
    expect(unsyncedChanges({ pending: 2, failed: 1 })).toBe(3);
  });
});

describe('signOutAndClear', () => {
  afterEach(() => vi.restoreAllMocks());

  it('drops the token first and empties the query cache only once the offline data is gone', async () => {
    let finishClearing!: () => void;
    const { calls, steps } = recordingSteps(
      () =>
        new Promise<void>(resolve => {
          finishClearing = resolve;
        })
    );

    const signingOut = signOutAndClear(steps);
    await vi.waitFor(() => expect(calls).toContain('clearOfflineData:start'));
    expect(calls).not.toContain('clearQueryCache');
    finishClearing();
    await signingOut;

    expect(calls).toEqual([
      'logout',
      'goToLogin',
      'clearOfflineData:start',
      'clearOfflineData:done',
      'clearQueryCache',
    ]);
  });

  it('still empties the query cache when clearing the offline data fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { calls, steps } = recordingSteps(() =>
      Promise.reject(new Error('IndexedDB unavailable'))
    );

    await expect(signOutAndClear(steps)).resolves.toBeUndefined();

    expect(calls).toContain('clearQueryCache');
    expect(console.error).toHaveBeenCalled();
  });
});
