import type { CapacitorConfig } from '@capacitor/cli';

// The app ships the built UI (dist/, built with --mode android) and talks to
// Omega over the network. The server address, and a Cloudflare Access
// service token when Access protects it, are entered on first launch (see
// src/native/server-config.ts).
//
// It used to point the WebView at the live site instead, but with Access in
// front there was no way through: Access's sign-in is for browsers, and a
// WebView can't add the token's headers to the page's own requests.

// A distinct appId/appName lets the dev build install alongside the prod app
// instead of replacing it (app/build.gradle reads CAPACITOR_TARGET too).
const isDev = process.env.CAPACITOR_TARGET === 'dev';

const config: CapacitorConfig = {
  appId: isDev ? 'com.omega.app.dev' : 'com.omega.app',
  appName: isDev ? 'Omega Dev' : 'Omega',
  webDir: 'dist',
  // The dev deployment is plain HTTP on the LAN, which Android blocks by
  // default.
  ...(isDev ? { server: { cleartext: true } } : {}),
  plugins: {
    // Sends fetch/XHR to absolute URLs (all API calls) through native HTTP,
    // so they skip CORS and carry the Access headers.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
