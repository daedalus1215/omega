import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * How the Android app reaches Omega. The web app is served by Omega and
 * calls /api on its own origin; the app ships its own copy of the UI, so it
 * needs the server's address. When Cloudflare Access protects the server it
 * also needs an Access service token, since Access's sign-in page is for
 * browsers and the app's requests can't complete it.
 *
 * Entered on the device rather than built in: CI's APKs can be downloaded by
 * anyone signed in to GitHub, and a built-in token would let them past Access.
 */
export type ServerConfig = {
  serverUrl: string;
  accessClientId: string;
  accessClientSecret: string;
};

export type ServerProblem = 'unreachable' | 'not-omega';

const STORAGE_KEY = 'server_config';

// Set from the ANDROID_SERVER_URL repo variable at build time, to prefill
// the setup form. Not a secret.
export const DEFAULT_SERVER_URL: string =
  import.meta.env.VITE_DEFAULT_SERVER_URL ?? '';

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

export const accessHeaders = (config: ServerConfig): Record<string, string> =>
  config.accessClientId
    ? {
        'CF-Access-Client-Id': config.accessClientId,
        'CF-Access-Client-Secret': config.accessClientSecret,
      }
    : {};

export const loadServerConfig = async (): Promise<ServerConfig | null> => {
  const { value } = await Preferences.get({ key: STORAGE_KEY });
  return value ? (JSON.parse(value) as ServerConfig) : null;
};

export const saveServerConfig = (config: ServerConfig): Promise<void> =>
  Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(config) });

/**
 * Asks the server's health endpoint whether these settings get through.
 * Returns null when they do. Plain axios rather than the app's client, so a
 * failure here can't trigger its 401 handling.
 */
export const checkServerConnection = async (
  config: ServerConfig
): Promise<ServerProblem | null> => {
  try {
    const response = await axios.get(`${config.serverUrl}/api/healthz`, {
      headers: accessHeaders(config),
      timeout: 15000,
    });
    // Access turns a request away with its sign-in page, which arrives as
    // a 200 once the redirect is followed, so check the body is Omega's.
    return response.data?.status === 'ok' ? null : 'not-omega';
  } catch (error) {
    return axios.isAxiosError(error) && error.response
      ? 'not-omega'
      : 'unreachable';
  }
};
