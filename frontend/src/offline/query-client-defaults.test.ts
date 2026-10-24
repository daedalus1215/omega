import {
  MutationObserver,
  onlineManager,
  QueryClient,
} from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { offlineQueryDefaults } from './query-client-defaults';

describe('offlineQueryDefaults', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('runs queries while the webview reports no network', async () => {
    onlineManager.setOnline(false);
    const client = new QueryClient({ defaultOptions: offlineQueryDefaults });
    const queryFn = vi.fn().mockResolvedValue('stored note');

    void client.fetchQuery({ queryKey: ['note', 5], queryFn });

    await vi.waitFor(() => expect(queryFn).toHaveBeenCalled());
  });

  it('runs mutations while the webview reports no network', async () => {
    onlineManager.setOnline(false);
    const client = new QueryClient({ defaultOptions: offlineQueryDefaults });
    const mutationFn = vi.fn().mockResolvedValue('queued');

    void new MutationObserver(client, { mutationFn }).mutate(undefined);

    await vi.waitFor(() => expect(mutationFn).toHaveBeenCalled());
  });
});
