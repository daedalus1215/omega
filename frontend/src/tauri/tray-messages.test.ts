import { describe, expect, it } from 'vitest';
import type { SyncStatus } from '../offline/sync-status';
import {
  describeSyncProblem,
  describeSyncResult,
  describeSyncStatus,
} from './tray-messages';

const status = (patch: Partial<SyncStatus> = {}): SyncStatus => ({
  reachable: true,
  pending: 0,
  failed: 0,
  sessionExpired: false,
  accessDenied: false,
  ...patch,
});

describe('describeSyncStatus', () => {
  it.each([
    [status(), 'All changes synced'],
    [status({ pending: 1 }), 'Syncing 1 change'],
    [status({ reachable: false, pending: 3 }), 'Offline · 3 pending'],
    [status({ reachable: false, failed: 2 }), '2 changes not saved'],
    [status({ failed: 1, sessionExpired: true }), 'Log in to sync'],
    [
      status({ sessionExpired: true, accessDenied: true, pending: 2 }),
      'Connection rejected · 2 pending',
    ],
  ])('describes %o as %s', (current, expected) => {
    expect(describeSyncStatus(current)).toBe(expected);
  });
});

describe('describeSyncProblem', () => {
  it('counts rejected changes', () => {
    expect(describeSyncProblem({ kind: 'rejected', count: 1 }).title).toBe(
      "1 change couldn't be saved"
    );
    expect(describeSyncProblem({ kind: 'rejected', count: 3 }).body).toBe(
      'The server rejected them while syncing.'
    );
  });

  it('points to the connection settings when Cloudflare rejects them', () => {
    expect(describeSyncProblem({ kind: 'access-denied' })).toEqual({
      title: 'Cloudflare rejected the connection',
      body: 'Changes are saved on this device. Update the connection settings in Omega to keep syncing.',
    });
  });
});

describe('describeSyncResult', () => {
  it('says what stays queued while the server is unreachable', () => {
    expect(
      describeSyncResult(true, status({ reachable: false, pending: 2 }))
    ).toEqual({
      title: "Can't reach the server",
      body: "2 changes saved on this device will sync when it's back.",
    });
  });

  it('asks for a login when the session expired or there is none', () => {
    expect(
      describeSyncResult(false, status({ sessionExpired: true, pending: 1 }))
    ).toEqual({
      title: 'Log in to sync',
      body: 'Your session expired. 1 change saved on this device.',
    });
    expect(describeSyncResult(false, status()).title).toBe('Log in to sync');
  });

  it('says the connection was rejected before anything else', () => {
    expect(
      describeSyncResult(
        true,
        status({ accessDenied: true, sessionExpired: true, pending: 1 })
      )
    ).toEqual({
      title: 'Connection rejected',
      body: 'Cloudflare turned the connection settings away. 1 change saved on this device.',
    });
  });

  it('reports being up to date, mentioning changes set aside earlier', () => {
    expect(describeSyncResult(true, status()).title).toBe('Up to date');
    expect(describeSyncResult(true, status({ failed: 1 })).body).toBe(
      "Everything else is synced; 1 change couldn't be saved."
    );
  });
});
