import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createOfflineChannel,
  postStatusPatch,
  setDefaultStatusPoster,
  type OfflineChannel,
} from './offline-channel';

/**
 * A real BroadcastChannel whose posts are recorded, so a test can assert
 * exactly what went on the wire (a re-broadcast shows up as an extra post).
 */
const spiedChannel = (posts: unknown[]) => (name: string): BroadcastChannel => {
  const channel = new BroadcastChannel(name);
  const postMessage = channel.postMessage.bind(channel);
  channel.postMessage = data => {
    posts.push(data);
    return postMessage(data);
  };
  return channel;
};

describe('createOfflineChannel', () => {
  const channels: OfflineChannel[] = [];

  afterEach(() => {
    channels.splice(0).forEach(channel => channel.close());
    setDefaultStatusPoster(undefined);
  });

  it('delivers a queue change to the other channel only', async () => {
    const senderPosts: unknown[] = [];
    const receiverPosts: unknown[] = [];
    const senderQueue = vi.fn();
    const receiverQueue = vi.fn();
    const sender = createOfflineChannel(
      {
        onQueueChanged: senderQueue,
        onIdsChanged: vi.fn(),
        onStatusPatch: vi.fn(),
      },
      spiedChannel(senderPosts)
    );
    const receiver = createOfflineChannel(
      {
        onQueueChanged: receiverQueue,
        onIdsChanged: vi.fn(),
        onStatusPatch: vi.fn(),
      },
      spiedChannel(receiverPosts)
    );
    channels.push(sender, receiver);

    sender.post({ type: 'queue-changed' });

    await vi.waitFor(() => expect(receiverQueue).toHaveBeenCalledTimes(1));
    expect(senderQueue).not.toHaveBeenCalled();
    expect(senderPosts).toEqual([{ type: 'queue-changed' }]);
    expect(receiverPosts).toEqual([]);
  });

  it('applies a status patch to the other channel, without echoing it back', async () => {
    const receiverPosts: unknown[] = [];
    const senderStatus = vi.fn();
    const receiverStatus = vi.fn();
    const sender = createOfflineChannel({
      onQueueChanged: vi.fn(),
      onIdsChanged: vi.fn(),
      onStatusPatch: senderStatus,
    });
    const receiver = createOfflineChannel(
      {
        onQueueChanged: vi.fn(),
        onIdsChanged: vi.fn(),
        onStatusPatch: receiverStatus,
      },
      spiedChannel(receiverPosts)
    );
    channels.push(sender, receiver);

    sender.post({ type: 'status', patch: { sessionExpired: true } });

    // Delivered to the other instance...
    await vi.waitFor(() =>
      expect(receiverStatus).toHaveBeenCalledWith({ sessionExpired: true })
    );
    // ...exactly once, and neither the poster nor the receiver re-posted it
    // (a re-broadcast would show up as an extra post on the wire).
    expect(receiverStatus).toHaveBeenCalledTimes(1);
    expect(senderStatus).not.toHaveBeenCalled();
    expect(receiverPosts).toEqual([]);
  });

  it('tells the other channel its stores were cleared', async () => {
    const senderCleared = vi.fn();
    const receiverCleared = vi.fn();
    const handlers = {
      onQueueChanged: vi.fn(),
      onIdsChanged: vi.fn(),
      onStatusPatch: vi.fn(),
    };
    const sender = createOfflineChannel({
      ...handlers,
      onDataCleared: senderCleared,
    });
    const receiver = createOfflineChannel({
      ...handlers,
      onDataCleared: receiverCleared,
    });
    // One that doesn't listen for it mustn't trip over it.
    const bystander = createOfflineChannel(handlers);
    channels.push(sender, receiver, bystander);

    sender.post({ type: 'data-cleared' });

    await vi.waitFor(() => expect(receiverCleared).toHaveBeenCalledTimes(1));
    expect(senderCleared).not.toHaveBeenCalled();
  });

  it('posts status patches through the default poster', () => {
    const post = vi.fn();
    setDefaultStatusPoster(patch => post(patch));

    postStatusPatch({ accessDenied: false });

    expect(post).toHaveBeenCalledWith({ accessDenied: false });
  });

  it('no-ops when BroadcastChannel is unavailable', () => {
    const channel = createOfflineChannel(
      {
        onQueueChanged: vi.fn(),
        onIdsChanged: vi.fn(),
        onStatusPatch: vi.fn(),
      },
      () => undefined
    );
    channels.push(channel);

    expect(() => {
      channel.post({ type: 'ids-changed' });
      channel.close();
    }).not.toThrow();
  });
});
