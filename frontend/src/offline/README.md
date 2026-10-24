# Offline layer

Copied from Chronus (`chronus/frontend/src/offline/`, `main` at `12fbe93`,
2026-10-22) so the Omega apps work offline the same way. The plan is in
`specs/offline-apps.md`. A library shared by both apps may replace the two
copies one day, so keep them easy to compare: same file names, structure and
comments, with the differences listed here. A fix to a copied file probably
belongs in Chronus too, and the other way round.

## Copied as they are, apart from names

`offline-adapter.ts`, `offline-store.ts`, `outbox-flusher.ts`, `temp-ids.ts`,
`locks.ts`, `offline-channel.ts`, `offline-errors.ts`, `sync-scheduler.ts`,
`sync-status.ts`, `query-client-defaults.ts`, `offline-transport.ts`,
`install-offline-support.ts`, and `src/tauri/tauri-transport.ts`. With their
tests.

- The IndexedDB database is `omega-offline` (Chronus: `chronus-desktop-offline`).
  **Never rename it**: that orphans the data and queued changes on devices.
- Lock names `omega-offline-flush` and `omega-offline-prefetch`, the
  BroadcastChannel `omega-offline`, and the response header `x-omega-offline`.
- Comments that talked about notes talk about the calendar.

## Omega's own

- `offline-routes.ts`: the route type and matching are Chronus's; the routes
  are Omega's (specs D7, Phase 4).
- `offline-reads.ts`: Chronus's `deriveOfflineResponse` seam; what it answers
  is Omega's (specs D5, Phase 4).
- `prefetch-calendar.ts` replaces `prefetch-notes.ts`: same schedule, spacing
  and outcomes, fetching what the calendar needs (specs D6).
- The `events` store (schema v4) and the read routes in `offline-reads.ts`:
  calendar views ask for any date range, so events are stored one record
  each and ranges answered from them, instead of by URL (specs D5). The
  adapter's `handleRead` sends event GETs through the read routes; that seam
  is the main candidate for the shared library.
- `calendar-test-server.ts`: an in-memory Omega server for the tests.
- `offline-check.ts`: runs the layer in a plain browser, for the headless
  manual checks only (`VITE_OFFLINE_IN_BROWSER=1`). Chronus has a real browser
  offline mode instead (`web-offline.ts`, `cloudflare-reauth.ts`,
  `storage-persistence.ts`), which Omega doesn't copy.
- `getOfflineSummary` (Settings) counts stored events and the dates they cover,
  where Chronus's counts notes.
- `components/`: the sync badge and relogin dialog, rebuilt in MUI. The badge
  has a compact form for the desktop sidebar rail, since Omega's desktop
  layout has no header.

## Candidates for Chronus, or for the shared library

- The Tauri build leaves the service worker out (`vite build --mode tauri`):
  the app ships its own files, so a cached copy can only be stale.
