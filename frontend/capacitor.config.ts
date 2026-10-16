import type { CapacitorConfig } from '@capacitor/cli';

// The axios client uses baseURL '/' and prefixes /api per request (see
// src/api/axios.interceptor.ts), so it needs to be served from the same
// origin as the API. Bundled assets have no such origin, so instead of
// shipping dist/ we point the WebView at the live site: same code, same
// origin, no app changes. Set via CI; unset for a local Android Studio
// build, which then falls back to the bundled dist/ (and has no API).
const serverUrl = process.env.CAPACITOR_SERVER_URL;

// 'dev' targets a LAN deployment over plain HTTP, which Android blocks by
// default, hence cleartext below. A distinct appId/appName lets the dev
// build install alongside the prod app instead of replacing it.
const isDev = process.env.CAPACITOR_TARGET === 'dev';

const config: CapacitorConfig = {
  appId: isDev ? 'com.omega.app.dev' : 'com.omega.app',
  appName: isDev ? 'Omega Dev' : 'Omega',
  webDir: 'dist',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: isDev,
          // If the site sits behind Cloudflare Access (as Chronus does), its
          // SSO step redirects here. Without this, the WebView hands that
          // redirect to the system browser and the auth cookie lands in the
          // wrong cookie jar. A no-op when there is no Access in front.
          allowNavigation: ['*.cloudflareaccess.com'],
        },
      }
    : {}),
};

export default config;
