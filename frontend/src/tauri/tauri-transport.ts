import {
  resolveFetchAdapter,
  type OfflineTransport,
} from '../offline/offline-transport';

// Without this a blackholed backend holds each request for the OS's TCP
// connect timeout (minutes) before it counts as unreachable.
const CONNECT_TIMEOUT_MS = 10_000;

/**
 * Tauri's transport: the Rust-side fetch (installed on api.defaults.env by
 * configureApiForTauri) through axios' fetch adapter.
 */
export const tauriTransport: OfflineTransport = {
  send: config => resolveFetchAdapter(config)(config),
  fetchOptions: {
    connectTimeout: CONNECT_TIMEOUT_MS,
    // Cloudflare Access answers a rejected service token with a redirect to
    // its login page. Followed, that page comes back as a 200: stored over
    // real responses, and counted as a successful sync of queued writes.
    maxRedirections: 0,
  },
};
