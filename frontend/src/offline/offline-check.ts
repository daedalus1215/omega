import api, { setUnauthorizedHandler } from '../api/axios.interceptor';
import { installOfflineSupport } from './install-offline-support';
import { createWebTransport } from './offline-transport';

/**
 * Runs the offline layer in a plain browser. Only the offline-check build
 * (VITE_OFFLINE_IN_BROWSER=1) loads this, so the manual checks can drive the
 * app headless (specs/offline-apps.md); browser offline mode isn't a feature,
 * and production builds leave this file out.
 */
export const startOfflineCheck = (): void => {
  setUnauthorizedHandler(() => {});
  installOfflineSupport(api, { transport: createWebTransport() });
};
