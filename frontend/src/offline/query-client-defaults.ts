import type { DefaultOptions } from '@tanstack/react-query';

/**
 * React Query's default networkMode ('online') holds queries and mutations
 * back whenever the webview reports no network. Wherever the offline layer
 * is installed (the Tauri app, browsers with offline mode on) its adapter
 * answers those requests from stored responses or queues them, so they must
 * still run: a held query leaves screens on their empty placeholders, and a
 * held mutation lives only in memory, lost if the app quits before the
 * network returns.
 */
export const offlineQueryDefaults: DefaultOptions = {
  queries: { networkMode: 'always' },
  mutations: { networkMode: 'always' },
};
