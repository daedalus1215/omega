export type StatusPatch = {
  reachable?: boolean;
  sessionExpired?: boolean;
  accessDenied?: boolean;
};

export type OfflineChannelMessage =
  | { type: 'queue-changed' }
  | { type: 'ids-changed' }
  | { type: 'status'; patch: StatusPatch }
  | { type: 'data-cleared' };

export type OfflineChannelHandlers = {
  /** Another tab changed the outbox: re-read the pending/failed counts. */
  onQueueChanged: () => void;
  /** Another tab recorded temp ids: drop the in-memory id map. */
  onIdsChanged: () => void;
  /** Apply another tab's status flags locally; never re-broadcast. */
  onStatusPatch: (patch: StatusPatch) => void;
  /**
   * Another tab emptied the stores (sign-out, or another user's data found
   * at login): everything this tab holds in memory is stale.
   */
  onDataCleared?: () => void;
};

const CHANNEL_NAME = 'omega-offline';

export type OfflineChannel = {
  post: (message: OfflineChannelMessage) => void;
  close: () => void;
};

export const createOfflineChannel = (
  handlers: OfflineChannelHandlers,
  createChannel?: (name: string) => BroadcastChannel | undefined
): OfflineChannel => {
  const channel =
    createChannel?.(CHANNEL_NAME) ??
    (typeof BroadcastChannel === 'undefined'
      ? undefined
      : new BroadcastChannel(CHANNEL_NAME));

  if (channel) {
    channel.onmessage = event => {
      const message = event.data as OfflineChannelMessage | undefined;
      if (!message || typeof message.type !== 'string') return;
      if (message.type === 'queue-changed') {
        handlers.onQueueChanged();
      } else if (message.type === 'ids-changed') {
        handlers.onIdsChanged();
      } else if (message.type === 'status') {
        handlers.onStatusPatch(message.patch);
      } else if (message.type === 'data-cleared') {
        handlers.onDataCleared?.();
      }
    };
  }

  return {
    post: message => channel?.postMessage(message),
    close: () => channel?.close(),
  };
};

/**
 * The channel instance is owned by installOfflineSupport; this is how UI
 * components (the re-login dialog, the Cloudflare re-auth flow) broadcast a
 * status patch without importing the instance.
 */
let defaultStatusPoster: ((patch: StatusPatch) => void) | undefined;

export const setDefaultStatusPoster = (
  post: ((patch: StatusPatch) => void) | undefined
): void => {
  defaultStatusPoster = post;
};

export const postStatusPatch = (patch: StatusPatch): void => {
  defaultStatusPoster?.(patch);
};
