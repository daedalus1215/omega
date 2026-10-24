# Implementation Plan — Omega Desktop and Android Apps, Offline (Step 1)

**Status:** Written 2026-10-22 from Chronus's finished offline work
(`chronus/specs/web-offline-mode.md`, Chronus `main` at `12fbe93`). Q1, Q5, Q6 and Q7 went
with their defaults. Phases 0–1 done 2026-10-22: the desktop build, the Android Rust check
and `config.rs`'s tests pass locally; the CI APK still needs the `ANDROID_DEBUG_KEYSTORE_BASE64`
secret. The HTTP plugin also allows plain `http://` to any host, for the dev server (Q7).
Phase 2 done 2026-10-22: in headless Chromium, the Tauri build has no transitions, ripple or
animations except spinners, and a closed dialog is gone within 30 ms; the browser build is
unchanged. Phase 3 done 2026-10-22: in headless Chromium against a stub API, the
offline-check build shows the stored calendar after the API goes away and queues nothing, and
the production build still uses XHR and sends a 401 to `/login`. 9 copied tests that need a
write route are skipped until Phase 4. Until Phase 5, the Tauri app ignores a 401 (no relogin
dialog yet). Phase 4 done 2026-10-22 (code and tests): 139 tests pass, and each safeguard in the
merge, the placeholder rules and pruning was checked by breaking it and watching a test fail.
Only the whole-set reminder save works offline (D7). The headless M-checks against a real
backend run in Phase 6. Phase 5 done 2026-10-22; on desktop the sync badge sits in the sidebar
rail, because the desktop layout has no header (see D10 "As built"). Phase 6 done 2026-10-22:
README "Offline mode" section, and M2–M9 pass headless against a real backend (39 checks; see
"Manual verification → Results"). **Left:** M10–M12, the user's checks on their devices. Open
questions below have recommended defaults.
**Author:** daedalus1215 + Claude
**Date:** 2026-10-22
**Follow-up:** Step 2, idempotent replays and conflict detection (see "Out of scope")

## Why this exists

Chronus now has a Tauri desktop app and a Tauri Android app. Both work offline for days:
changes are saved on the device and sync when the server is reachable again. They are the
primary offline clients; browser offline mode stays an opt-in extra there. Omega should end
up in the same place.

Omega today:

- **Web app:** React + MUI, served by the backend's nginx image. No offline data.
- **Android:** a Capacitor app on the `android-app` branch (pushed, not merged to `main`).
  It ships its own copy of the UI and asks for the server address and a Cloudflare Access
  service token on first launch. It opens without a connection, but can't show or save any
  data without the server.
- **Desktop:** no app.
- **Animations:** all on. In Chronus they blinked in the apps' webviews (WebKitGTK on Linux,
  Android's WebView) and are now off there.

This plan has three parts:

1. **One shell.** Tauri for desktop and Android, replacing Capacitor (Phases 1–2).
2. **Animations off in the apps** (Phase 2).
3. **Offline mode.** Copy Chronus's offline layer, then teach it about calendars
   (Phases 3–5). This is the bulk of the work. A calendar asks for *date ranges* that change
   as you scroll, which Chronus's store-by-URL approach can't answer offline (D5).

## Decisions already made (user, 2026-10-22)

- **Tauri replaces Capacitor.** Desktop and Android share one shell and one offline layer,
  as in Chronus.
- **Repeating events created offline can wait for their occurrences, for now.** They can
  appear once the series syncs; D8 says what shows in the meantime. **Eventually they should
  show offline too**, so Step 1 must keep the way open (D8, "Later").
- **Copy Chronus's code for now.** A shared library may come later, so keep the copies easy
  to compare with Chronus (D4).
- **No browser offline mode.** The apps are the offline clients, as in Chronus.

## Open questions (answer before or during Phase 0; defaults in **bold**)

- **Q1. App identifiers.** **Default: desktop `com.omega.app.desktop`, Android
  `com.omega.app`.** Debug APKs get the `.debug` suffix (as in Chronus), so the Tauri debug
  app (`com.omega.app.debug`) installs alongside the Capacitor app while you switch.
  Uninstall the Capacitor app once the Tauri one works.
- **Q2. How much of the calendar is stored on the device.** **Default: from the start of
  the month 3 months back to the end of the month 12 months ahead** (D6). Further out shows
  as empty while offline.
- **Q3. What a repeating event created offline shows before it syncs.** **Default: its
  first occurrence, as a placeholder that can be deleted but not edited until it syncs**
  (D8). The alternative is nothing at all until it syncs. That's simpler, but it invites
  creating the event twice.
- **Q4. Calendars offline.** **Default: renaming and recoloring a calendar work offline.
  Creating or deleting a calendar, and all sharing (invites, members, invitations), need a
  connection.**
- **Q5. Where Phase 1 starts.** **Default: on `android-app`, merged to `main` by PR once
  Phase 2 is done.** It already has the setup flow's copy and two login fixes worth keeping:
  - the "Login response carried no token" check, because Cloudflare's sign-in page can
    arrive as a 200;
  - telling a wrong password apart from no answer.
  The later phases branch from `main`.
- **Q6. Android signing key.** **Default: reuse Chronus's debug keystore**
  (`~/.android/chronus-debug.keystore`) for Omega's `ANDROID_DEBUG_KEYSTORE_BASE64` secret.
  It's a debug key, so sharing it between the two apps costs nothing. The alternative is a
  new keystore.
- **Q7. The "Omega Dev" variant.** **Default: drop it.** The server address is entered on
  the device, so one app can point at the dev server. Check that a plain-HTTP LAN address
  gets through (M10).

## Ground rules for the implementer

- Read `Agent.MD`, `README.md` and `frontend/PROJECT_SPEC.md` first. For the Chronus code
  being copied, read `chronus/specs/web-offline-mode.md` (the "As built" notes especially)
  and `chronus/frontend/AGENTS.md` → "Offline mode".
- **Leave all changes uncommitted.** The user manages git and commits files themselves.
- **The IndexedDB database is named `omega-offline`. Never rename it** once an app has
  shipped with it: renaming orphans the data and queued changes already on devices. Schema
  changes are additive only: bump the version and add stores, never change existing key
  paths.
- **Copied files stay recognizable** (D4). Use the same file names, structure and comments
  as Chronus, so a later shared library can diff the two. Change what Omega needs and
  nothing else. Every deliberate difference goes in `src/offline/README.md`.
- Match the surrounding code. Omega's UI is MUI: build the copied UI pieces (setup form,
  sync badge, relogin dialog) with MUI components and the theme, not Chronus's shadcn
  components. No hardcoded hex.
- **Tooling baseline, as of 2026-10-22 (`android-app` branch):**
  - `npx tsc -p tsconfig.app.json --noEmit` reports **0 errors**. `npm run build` runs
    `tsc` first, so it must stay at 0.
  - **There's no test runner.** Phase 0 adds Vitest, as Chronus has.
  - `npm run lint` doesn't run: ESLint 9 finds no `eslint.config.*`. Not part of this plan.
- **This machine can't build Android.** It's aarch64 Linux, and Google ships the Android
  SDK/NDK for x86-64 Linux only. APKs come from CI. The Rust side can still be checked
  locally without the NDK:
  `CC_aarch64_linux_android=clang CFLAGS_aarch64_linux_android=--target=aarch64-linux-android24 cargo check --target aarch64-linux-android`.
- **Never run two desktop builds at once** (debug, release, AppImage). They share one data
  directory, and with it the queue of unsynced changes.
- For checks against a backend, use a throwaway Postgres container on its own port, never
  the user's own database. The backend is Postgres
  (`backend/src/typeorm/data-source.ts`). The README still says SQLite; fix it in Phase 6.

## How it works today (map for the implementer)

| File | Role |
|---|---|
| `frontend/src/main.tsx` | Plain `QueryClient`. Capacitor `StatusBar` setup. |
| `frontend/src/App.tsx` | `ServerConfigGate` wraps the app (branch). Routes: landing, login, register, calendar, settings. |
| `frontend/src/api/axios.interceptor.ts` | Shared axios instance: relative `/api`, JWT from `localStorage['jwt_token']`. A 401 drops the token and goes to `/login`, except for the login request itself. `configureApiForNative` sets the base URL and Access headers (branch). |
| `frontend/src/native/` | Capacitor setup: server URL + Access token in `@capacitor/preferences`, checked against `/api/healthz` (branch). |
| `frontend/src/auth/useAuth.ts` | Login, logout, register; decodes the JWT (`sub`, `username`). Sign-out is called from `components/Header/Header.tsx` and `pages/SettingsPage/SettingsPage.tsx`. `useUpdateUsername` logs out to force a re-login. |
| `frontend/src/pages/CalendarPage/hooks/` | React Query. `useCalendarEvents(start, end)` keys on the range, with `staleTime: 0` and `keepPreviousData`. Mutations invalidate `calendarEventKeys.all`. |
| `frontend/src/pages/CalendarPage/CalendarPage.tsx` | Each view asks for its own range: month (about 5 weeks), day (±1 day), timeline (grows as you scroll; `DAYS_TO_LOAD` is 30). |
| `frontend/src/theme.ts` | `createMuiTheme(mode)` for light and dark. |
| `frontend/src/index.css` | Global styles: Tailwind and `tw-animate-css`. |
| `frontend/vite.config.ts` | PWA, disabled for `--mode android`. |
| `.github/workflows/android-build.yml` | Capacitor debug APK. |
| Backend | Global `/api` prefix. `GET /api/healthz` → `{ status: 'ok' }`. Rate limit 100 requests/min. |

Backend behavior the offline layer must mirror:

- `GET /calendar-events?startDate&endDate` returns every event in the caller's calendars,
  shared ones included, that overlaps the range. The overlap rule is
  `start_date <= endDate AND end_date >= startDate`
  (`calendar-event.repository.ts:91-107`). The range may not exceed 365 days. Events come
  sorted by start date.
- **Repeat occurrences are created on read.** Fetching a range creates and saves a
  `calendar_events` row, with `recurringEventId` set, for each occurrence in it
  (`generate-event-instances.transaction.script.ts`). So every occurrence the device has
  seen has a real id.
- `PUT /calendar-events/:id` replaces title, description, color, start and end. Moving the
  start resets its reminders' `sentAt`.
- `DELETE /calendar-events/:id` on an occurrence also records an exception, so it isn't
  generated again. `DELETE /calendar-events/recurring/:id` deletes the series.
- `POST /calendar-events/recurring` returns the series (`RecurringEventResponseDto`), not
  its occurrences.
- Reminders are emailed by the server's cron.

## Design decisions

### D1. Tauri replaces Capacitor

**Remove:**
- `frontend/android/` and `capacitor.config.ts`;
- `@capacitor/*` from `package.json`, and the `android:sync` and `android:open` scripts;
- `src/native/`, and the `StatusBar` call in `main.tsx`;
- the Capacitor half of `scripts/generate-icons.mjs` (the `android/app/src/main/res`
  loop);
- `.github/workflows/android-build.yml`.

**Add, copied from Chronus `frontend/`:**

| Chronus file | Omega changes |
|---|---|
| `src-tauri/` (`Cargo.toml`, `build.rs`, `tauri.conf.json`, `tauri.android.conf.json`, `capabilities/default.json`, `src/{main,lib,config}.rs`) | Package `omega-desktop`, product "Omega", identifiers per Q1. Leave `tray.rs` out until Phase 5. Window title "Omega". |
| `src-tauri/gen/android/` (from `tauri android init`) | Re-generate for Omega's identifier rather than copying; then copy Chronus's `MainActivity.kt` body (padding for system bars, cutout and keyboard) and the `ci-debug.keystore` signing block in `app/build.gradle.kts`. |
| `src/tauri/api-config.ts`, `connection-check.ts`, `connection-settings.ts`, `with-request-signal.ts`, `TauriConfigGate.tsx` | `not-chronus` → `not-omega`, copy says Omega. The gate's form is rebuilt in MUI. |
| `.github/workflows/tauri-android-build.yml` | Artifact `omega-android-debug-apk`. Keep the fixed-key restore and the signature check exactly. |
| `.github/workflows/desktop-build.yml` | Manual only, as in Chronus. |
| `package.json` scripts `desktop:dev`, `desktop:build`, `tauri` | Same. **`"tauri": "tauri"` is required:** Tauri's Gradle hook runs `npm run -- tauri …`. |

Lessons from Chronus's first Android builds, all already fixed in the copied files. Don't
undo them:

- `setup-android` must be given `packages:`. Its default list includes `tools`, which
  Google removed.
- `--` inside an XML comment breaks Android's resource merging.
- Gradle quietly falls back to a throwaway key if it doesn't find the fixed one. Writing
  `~/.android/debug.keystore` on the runner did **not** work. Sign explicitly from
  `gen/android/ci-debug.keystore`, and keep the CI step that fails the build when the APK's
  certificate doesn't match. Without the fixed key, every update needs an uninstall, which
  wipes the device's stored calendar and unsynced changes.
- Phone keyboards capitalize, autocorrect and add spaces, so the setup fields are verbatim
  and trimmed (`VERBATIM_INPUT`, `trimConfig`).

**Keep from the Capacitor work:**
- Prefill the server address from `VITE_DEFAULT_SERVER_URL`. CI sets it from the
  `ANDROID_SERVER_URL` repo variable, in both workflows.
- Keep "Server settings" on the login screen. It calls `openConnectionSettings()`.
- Keep the README's warning: the token is entered on the device, never built in.

**The service worker.** The packaged app ships its own files, so a service worker caching
them only risks serving stale ones. That's why the Capacitor build disabled the PWA. Keep
that: `vite build --mode tauri`, with `disable: mode === 'tauri'` in `vite.config.ts`, and
`beforeBuildCommand` set to that build. (Chronus doesn't do this yet; note it in
`src/offline/README.md` as a candidate fix there.)

**The HTTP plugin's scope** (`capabilities/default.json`) allows `https://*`,
`http://localhost:*` and `http://127.0.0.1:*`. Add whatever pattern the plain-HTTP dev
server needs (Q7), and test that it matches (M10).

### D2. Connection settings and Cloudflare Access

Copy Chronus's flow as it is:

- **Storage.** `config.rs` stores `{ apiBaseUrl, cfAccessClientId, cfAccessClientSecret }`
  in the app's config directory, readable by the owner only (`0600`, tightened on
  rewrite).
- **Check before saving.** `/api/healthz` with `maxRedirections: 0`, a 10 s connect timeout
  and a 15 s total timeout. It reports `invalid-url`, `unreachable`, `access-denied`,
  `backend-down` or `not-omega`, and offers "Save anyway" for setting up while the server is
  down.
- **The transport.** `configureApiForTauri` sets the base URL, the Access headers, the
  `fetch` adapter and Tauri's `fetch` (wrapped in `withRequestSignal`, or timeouts never
  reach the Rust side). It replaces `configureApiForNative` in `axios.interceptor.ts`.
- **`setUnauthorizedHandler`.** Add Chronus's seam to `axios.interceptor.ts`, keeping
  Omega's exception for the login request. Until Phase 3 the Tauri app keeps the default
  handler. From Phase 3, `applyApiConfig` replaces it, as in Chronus.
- **Reopening the settings.** They open from the login screen and from Settings (a
  "Connection settings" button, Tauri only). In Chronus the form couldn't be reopened at
  first, and clearing the app's storage was the only way back to it.

`isTauri()` (true on desktop and Android) and `isTauriAndroid()` (Android only, for leaving
out the tray) come from `api-config.ts` unchanged.

### D3. Animations off in the apps

Copy `src/tauri/motion.ts` and call `applyMotionSetting()` first thing in `main.tsx`. On
top of Chronus's version, Omega needs three things:

1. **The CSS rule** goes at the end of `src/index.css`, outside any `@layer`, with
   `!important`, so it beats Tailwind utilities, CSS modules and MUI's inline styles. It
   turns off `animation`, `transition` and `scroll-behavior` under
   `:root[data-motion='off']`.
2. **Spinners keep turning.** A still spinner looks frozen. Exempt them from the rule:
   - `.MuiCircularProgress-root` and its descendants: the indeterminate one spins the root
     and animates the circle's stroke;
   - `.MuiLinearProgress-root` descendants;
   - `.animate-spin`, if anything uses it.

   In a headless browser, check the computed `animation-name` on each.
3. **MUI's own motion**, set in `createMuiTheme` when `isMotionOff()`:
   - `components.MuiButtonBase.defaultProps.disableRipple = true`. With CSS animations off,
     the ripple would show as a static grey circle instead of disappearing.
   - Every `transitions.duration` set to `0`. MUI's transition components (Dialog, Drawer,
     Menu, Popover, Tooltip, Snackbar, Fade) wait that long before unmounting. With the CSS
     transition gone, a closing dialog would turn invisible at once but keep its backdrop
     for the default 195–225 ms, catching clicks.
   - `transitions.create` returning `'none'`.

Also check `CalendarView.module.css` and any `scrollTo` / `scrollIntoView` calls that pass
`behavior: 'smooth'`. Make them use `'auto'` when `isMotionOff()`, as Chronus's
`AddTagForm` does. Leave the web app exactly as it is.

### D4. Copying the offline layer

Copy from Chronus `frontend/src/offline/`, recording the source commit in
`src/offline/README.md`, together with the list of deliberate differences.

| Chronus file | Omega |
|---|---|
| `offline-store.ts` | Copy. Name `omega-offline`. Phase 4 adds the `events` store (D5). |
| `offline-adapter.ts`, `outbox-flusher.ts`, `temp-ids.ts`, `locks.ts`, `offline-channel.ts`, `offline-errors.ts`, `sync-scheduler.ts`, `sync-status.ts`, `query-client-defaults.ts` | Copy as is. Lock names `omega-offline-flush` and `omega-offline-prefetch`; channel `omega-offline`. |
| `offline-transport.ts` | Copy, `createWebTransport` included. It's used only by the offline-check build (Phase 3). |
| `install-offline-support.ts` | Copy. The prefetch becomes `prefetch-calendar.ts`. |
| `offline-routes.ts` | Keep the machinery (route type, `matchOfflineRoute`, `apiPathOf`, `isBackgroundWrite`). The routes themselves are Omega's (D7). |
| `offline-reads.ts` | Keep the `deriveOfflineResponse` seam. The contents are Omega's (D5). |
| `prefetch-notes.ts` | Becomes `prefetch-calendar.ts` (D6): same schedule, outcomes and spacing. |
| `components/SyncStatusIndicator.tsx`, `components/ReloginDialog.tsx` | Rebuilt in MUI. Same states and copy, Tauri copy only. |
| `web-offline.ts`, `cloudflare-reauth.ts`, `storage-persistence.ts` | **Not copied:** browser only. |
| `src/auth/sign-out.ts`, `useSignOut.tsx`, `login-errors.ts` | Copied. Rebuilt in MUI where they render. |
| `src/tauri/tauri-transport.ts` | Copied in Phase 3: the Tauri app installs the layer through it. |
| `src/tauri/DesktopTray.tsx`, `tray-messages.ts`, `src-tauri/src/tray.rs` | Copied in Phase 5. |
| Tests next to each file | Copy. The ones written against Chronus's note routes are rewritten against Omega's routes in Phase 4. |

Chronus reads the token through `STORAGE_KEYS.AUTH.JWT_TOKEN`. Add a small
`src/constants/storage.ts` with that one key (`'jwt_token'`, Omega's existing key), and
point `axios.interceptor.ts` and `useAuth.ts` at it.

### D5. Events are stored per event, not per URL

Chronus stores each GET response under its URL and replays it verbatim offline. That works
for notes but not for a calendar:

- the views ask for whatever range is on screen, and the timeline's range grows while you
  scroll, so an offline request almost never matches a stored URL exactly;
- one event appears in many stored responses, so an offline edit would have to be applied
  to every copy, and any copy that was missed would show the old version.

**Design.** Add an `events` object store (schema version bump, `keyPath: 'id'`). It holds
one record per event or occurrence: the `CalendarEventResponseDto` as the server sent it,
plus a `placeholder` flag (D8). It is the only stored copy of event data. The three event
GETs below go through **read routes** instead of the generic per-URL `responses` store.

Add the read-route seam to the copied adapter. Name it in `src/offline/README.md` as a
generalization candidate for the shared library.

```ts
type OfflineReadRoute = {
  /** Path below /api, like write routes. */
  pattern: string;
  /** After a successful GET: fold the response into the store. */
  store: (ctx: OfflineReadContext, query: URLSearchParams, data: unknown) => Promise<void>;
  /** Backend unreachable: answer from the store, or undefined for "not available". */
  answer: (ctx: OfflineReadContext, query: URLSearchParams) => Promise<unknown>;
};
```

- A GET matching a read route is never put in `responses`. Offline, the adapter calls
  `answer` instead of looking for a stored copy. Everything else about GETs is unchanged:
  network first, the probe while unreachable, and the "Not available until synced" error.
- **Event list**, `GET /calendar-events?startDate&endDate`:
  - *store:* in one transaction, upsert every event in the response. Delete stored events
    that overlap the range but aren't in the response: they were deleted elsewhere. Then
    add the range to `eventCoverage` in `meta`, merging touching intervals.
  - *answer:* stored events that overlap the range, sorted by `startDate`.
  - Both use **exactly the backend's overlap rule and date parsing**
    (`start <= endDate && end >= startDate`, with the query dates parsed the way
    `fetch-calendar-events.action.ts` parses them). Test it at the edges: an event ending
    exactly at the range start, all-day events, and a range crossing a DST change. The
    frontend builds the range with `toISOString().split('T')[0]`, which is a UTC date, and
    the stored side must agree.
- **One event**, `GET /calendar-events/:id`: *store* upserts it; *answer* returns it, or
  undefined.
- **Its reminders**, `GET /calendar-events/:id/reminders`: *answer* returns the stored
  event's `reminders`. Check that the list endpoint includes them (its action imports
  `EventReminderResponseDto`). If it doesn't, this route stays generic per-URL.
- **Local changes outrank the server's copy.** A merge must not overwrite or delete an
  event that a queued write references: its URL id, a temp id in the URL or body (Chronus's
  `tempIdsIn`), or a series id for series routes. Temp-id events are never deleted by a
  merge. While the backend is reachable the queue drains within seconds, so this mostly
  matters on a flaky connection. Chronus accepted that window for notes, but a calendar
  refetches on every view change, so close it here.
- **Ids that sync.** When `recordId(temp, real)` runs, Chronus rewrites stored responses.
  Extend it to rewrite the `events` store too: the record's `id`, `recurringEventId`,
  `calendarId`, and each reminder's `id` and `calendarEventId`.
- **Detail views of events outside the stored window** fall back to "Not available until
  synced", like an unstored note in Chronus.

Everything else (`/calendars`, `/users/profile`, `/calendar-invitations`,
`/calendars/:id/members`, `/calendar-events/search?query=…`) stays generic per-URL: stored
when fetched, replayed verbatim offline. A search never run online fails offline with the
app's normal error.

### D6. The stored window (prefetch)

`prefetch-calendar.ts` keeps Chronus's schedule:
- every 30 minutes;
- a 60 s delay per launch, so the screens opened at startup get the rate-limit budget;
- `nextPrefetchAt` in `meta`;
- the prefetch lock;
- 2.5 s between requests, for the 100 requests/min limit;
- the same outcomes, including `paused` while writes are queued.

One run fetches:
1. `GET /calendars`, `GET /users/profile` and `GET /calendar-invitations`.
2. `GET /calendar-events` one calendar month at a time, across the window (Q2). That's
   15 requests, about 40 s. Month-sized requests stay far under the 365-day limit and keep
   each request's occurrence generation small.
3. At the end of a complete run, drop stored events that end before the window start,
   unless a queued write references them, and trim `eventCoverage` to match.

**Side effect:** each run makes the server create every repeat occurrence up to 12 months
ahead. That already happens when someone browses that far, so it's not new behavior, but a
daily series with no end date gains about 365 rows the first time. Note it in the README.

### D7. Writes offline

Routes in `offline-routes.ts`, all under `/api`. *Mirror* means what `applyLocally` does
to the `events` store or to stored per-URL responses.

| Write | Offline | Mirror | Flags |
|---|---|---|---|
| `POST /calendar-events` | yes | Add an event with a temp id. The calendar is the body's `calendarId`, or the stored `/calendars` entry with `isPersonal` (check that's what the server picks when it's omitted). `userId` comes from the JWT `sub`. Reminders come from `reminderMinutes`, each with a temp id. | `createsEntity` |
| `PUT /calendar-events/:id` | yes | Replace the five fields. If the start moved, clear each reminder's `sentAt` (the server does). | `coalesce` |
| `DELETE /calendar-events/:id` | yes | Remove the event. A temp id never reached the server: `skipQueue`, and discard queued writes that reference it, as Chronus does for notes. | |
| `POST /calendar-events/recurring` | yes | D8 | `createsEntity` |
| `DELETE /calendar-events/recurring/:id` | yes | Remove every stored event with that `recurringEventId`, placeholder included. A temp series id: `skipQueue` and discard. | |
| `PUT /calendar-events/:id/reminders` | yes | Replace the event's reminders (temp ids for new ones). | `coalesce` |
| `POST`, `PUT`, `DELETE` on `/calendar-events/:id/reminders/:rid` | no | The app never calls them: the details dialog saves the whole set (as built, 2026-10-22). | |
| `PATCH /calendars/:id` | yes (Q4) | Update the stored `/calendars` list. | `coalesce` |
| `POST /calendars`, `DELETE /calendars/:id`, sharing, invitations, members, `PUT /users/*`, auth | no (Q4) | | |

Notes:
- **`coalesce` on full-replacement PUTs** means the last body wins. Dragging an event around
  offline queues a single move.
- **Edits to an event created offline** use its temp id. They queue behind the create, and
  the flusher swaps in the real id at replay, as in Chronus.
- **Writes that need a connection** fail with a network error, and the existing UI shows its
  normal message. Check that the calendar manager's create and delete errors read sensibly
  offline.
- Nothing in Omega sends writes on its own, so no route is `background`.

### D8. Repeating events created offline (Q3)

`POST /calendar-events/recurring` offline:

- The series gets a temp id. **One placeholder** goes in the `events` store: its first
  occurrence, from the request's `startDate`/`endDate`, with its own temp id,
  `recurringEventId` set to the series' temp id, `isRecurring: true` and
  `placeholder: true`.
- **The placeholder is read-only.** `PUT` on a placeholder id, and reminder writes for it,
  are refused locally with "Available once this repeating event syncs". Never queue them:
  the placeholder's id never maps to a server id, so the replay would fail forever. The
  details view disables its edit controls for placeholders.
- **Deleting it** (`DELETE /calendar-events/:placeholderId` or
  `DELETE /calendar-events/recurring/:tempSeriesId`) removes the placeholder and discards
  the queued create. Nothing reaches the server.
- **After the series syncs,** `recordId` maps the series id. The next merge of a range
  covering the placeholder drops it, because its series id is now real, and the server's
  real occurrences take its place. Invalidate `calendarEventKeys.all` after a sync that
  created a series, so that refetch happens straight away.
- For now, the other occurrences appear once the series syncs, per the user's decision.

**Later: occurrences generated on the device.** The user wants this eventually, so build
Step 1 so it can be added without reworking anything:

- **Key every rule on the `placeholder` flag, never on "the first occurrence".** Being
  read-only, removed when the series is deleted, and dropped on the first merge after the
  series syncs should all apply to any number of placeholders. Generating occurrences then
  just means adding more of them.
- **Generate them the way the backend does.** Port `generateInstanceDates` from
  `backend/src/calendar-events/domain/utils/rrule-pattern.utils.ts` to the frontend, which
  already depends on `rrule`. Keep its UTC start-of-day handling, the duration taken from
  the first occurrence, and the end date or no-end rule. Cover it with one set of test
  cases run against both copies, so they can't drift apart.
- **Generate them when a range is read, not all at once.** A series with no end date has
  no last occurrence. Fill in occurrences for the requested range, as the server does on
  read.
- **Editing a single occurrence of a series that hasn't synced** stays out even then. The
  server has no id for it until the series syncs and the occurrence is generated. Lifting
  that needs a way to name an occurrence by series and date, which the backend doesn't
  have.

### D9. User scoping, sign-out and an expired session

Copy Chronus's D5 "as built" behavior:

- **Claiming the data.** `claimOfflineData(sub)` runs in `useAuth.login` before the token
  is stored, and on install when a JWT is present. A different user's data is wiped before
  the first read.
- **Sign-out.** `useSignOut` sits behind both sign-out buttons (`Header.tsx`,
  `SettingsPage.tsx`). With unsynced changes it asks first ("N changes haven't synced.
  Signing out discards them."). Then it drops the token, goes to the login page, runs
  `clearOfflineData()` and `queryClient.clear()`.
- **`useAuth.logout()` keeps the data,** which is what `useUpdateUsername`'s forced re-login
  needs.
- **An expired session.** `ReloginDialog` logs back in where you are. The badge says "Log in
  to sync" until then, and stored data and queued changes stay usable.
- **Install order.** `applyApiConfig` installs the offline layer and replaces the 401
  handler, as in Chronus.

### D10. Status, Settings and the tray

- **The badge.** `SyncStatusIndicator`, in MUI, mounted in the Header. It renders nothing
  while everything is synced and reachable. Its states are Chronus's: "Offline · N
  pending", "Syncing N changes", "Log in to sync", "Connection rejected" (opens connection
  settings), "N changes not saved".
- **Settings → "Offline"** (Tauri only):
  - the stored window ("Events stored on this device: 1,240, Jul 1, 2026 – Oct 31, 2027");
  - pending and failed counts;
  - **Sync now** (disabled while nothing is pending; Android has no tray);
  - **Connection settings**.
- **Desktop tray.** Copy `tray.rs`, `DesktopTray.tsx`, `tray-messages.ts` and the
  notification plugin. The tray has the status line, "Sync now", "Show Omega" and "Quit".
  Linux tray icons show no tooltip, so the menu's first line carries the status.
- **As built (2026-10-22).**
  - Omega's desktop layout has no header, only the sidebar rail, so on desktop the badge is
    a compact icon in the rail. Its count is in a bubble, and the full text is its tooltip and
    accessible name. On phones it's a chip in the header, as planned. Both open the relogin
    dialog or the connection settings, as in Chronus.
  - On desktop, sign-out is only in Settings; it, the header button and the phone sidebar
    all go through `useSignOut`.
  - Settings → Offline shows the stored event count and the dates covered
    (`getOfflineSummary`), pending and rejected counts, **Sync now** and **Connection
    settings**.
  - `useRefreshAfterSync` (the calendar page) refetches the calendar once the queue drains,
    so a synced series' occurrences replace its placeholder straight away (D8).

## Phases

Each phase leaves the web app working, the tests green and `tsc` at 0. Phases 1–2 can ship
on their own: the apps then work online only, like the Capacitor app.

### Phase 0: Branch and tooling

- Branch per Q5.
- Add `vitest`, `fake-indexeddb` and `idb` (Chronus's versions), and a `"test": "vitest
  run"` script. Tests run in the `node` environment with `fake-indexeddb/auto`, as in
  Chronus.
- Add one smoke test so the runner is proven.
- **Accept:** `npx vitest run` passes; `tsc` 0; `npm run build` passes.

### Phase 1: The Tauri shell (D1, D2)

- Remove Capacitor, and add `src-tauri`, `src/tauri` and both workflows.
- Generate icons with `npx tauri icon` from the existing mark.
- Set up the connection settings gate, "Server settings" on the login screen, and
  "Connection settings" in Settings.
- Add `configureApiForTauri` and `setUnauthorizedHandler`.
- Make the `tauri` build mode disable the PWA.
- Update the README's Android section: Tauri, CI APK, signing secret, install steps.
- **Tests:** `connection-check` (copy Chronus's cases), `with-request-signal`, and
  `cargo test` for `config.rs`'s file permissions.
- **Accept:**
  - The desktop build runs on the user's machine: setup, check, login, calendar.
  - The Android cargo check passes locally. CI builds an APK signed with the fixed key.
  - The web build is unchanged: no Tauri code in its bundle. Check that `dist/` has no
    `@tauri-apps` chunk loaded at startup; the dynamic imports keep it out.

### Phase 2: Animations off (D3)

- **Tests:** `applyMotionSetting` sets the attribute only in Tauri, and the theme factory
  turns off ripple and transitions only when motion is off.
- **Accept:** in headless Chromium against the built app, once pretending to be Tauri
  (`window.__TAURI_INTERNALS__` set before load) and once as a normal browser:
  - Tauri: `data-motion="off"`; a button, a Dialog and a Skeleton have no animation or
    transition; the ripple is off; CircularProgress still spins.
  - Browser: all unchanged.
  - A Dialog opened and closed with clicks unmounts its backdrop at once, and a click right
    after closing reaches the page.

### Phase 3: The offline layer, generic part (D4, D9's plumbing)

- Copy the files in D4's table (not the calendar-specific ones yet), with Omega's names.
  The route table is empty, `deriveOfflineResponse` answers nothing, and the prefetch
  fetches only step 1 of D6.
- `applyApiConfig` installs it. Add React Query's `offlineQueryDefaults` when `isTauri()`.
- **The offline-check build.** When the build-time variable `VITE_OFFLINE_IN_BROWSER=1` is
  set, `main.tsx` installs the layer in the browser with `createWebTransport`. It exists
  only so the manual checks can run headless (Phase 6). Production builds never set it, and
  its code path stays out of normal bundles (`import.meta.env` check plus a dynamic
  import).
- **Tests:** the copied generic tests, adapted only for names. Tests tied to note routes
  move to Phase 4.
- **Accept:**
  - Tests green; `tsc` 0.
  - In the desktop app, anything viewed online still shows after the server goes away
    (generic per-URL storage), and nothing is queued yet.
  - The web build behaves exactly as before: XHR adapter, 401 → `/login`.

### Phase 4: Calendar data offline (D5–D8)

- The `events` store and its schema bump, read routes, the merge rules and `eventCoverage`.
- `prefetch-calendar.ts`.
- The write routes, the placeholder, and `recordId` rewriting events.
- **Tests:**
  - Overlap rule: answers match what the backend would return for edge ranges. Feed the same
    events to the backend's rule as a fixture, and to `answer`.
  - Merge: drops events deleted elsewhere within the range only; keeps events referenced by
    queued writes; never drops temp ids; merges coverage.
  - Each write route: offline mirror plus queue; online send then mirror; temp-id delete
    skips the queue and discards dependants; `coalesce` on repeated PUTs.
  - Create offline → edit → set reminders → sync: one create, with the edits replayed
    against the real id.
  - The placeholder: shown in its range; edits refused and not queued; deleting it discards
    the create; dropped on the first merge after the series syncs.
  - `recordId` rewrites ids inside `events`, reminders included.
  - Prefetch: 15 month requests spaced as configured, paused while writes are queued, and
    pruning at the end.
- **Accept:** tests green; `tsc` 0; M2–M6 pass headless (Phase 6's harness can be built
  here).

### Phase 5: User scoping, status UI, Settings and tray (D9, D10)

- `claimOfflineData`, `clearOfflineData`, `useSignOut` and its confirm dialog,
  `ReloginDialog`, `SyncStatusIndicator`, the Settings "Offline" section, and the desktop
  tray.
- **Tests:** Chronus's `sign-out`, `install-offline-support` (claim and clear) and
  `tray-messages` tests, adapted.
- **Accept:** tests green; M7–M9 pass headless; the tray's "Sync now" works on the user's
  desktop.

### Phase 6: Docs and verification

- README:
  - "Desktop and Android apps": build, install, signing secret, first launch;
  - "Offline mode": what works offline, the stored window, sign-out discarding unsynced
    changes, never renaming `omega-offline`, and that **queued writes outlive deploys** (a
    backend change to an offline-routed endpoint must accept requests queued by older
    builds for as long as a device might be offline);
  - fix the SQLite line.
- `src/offline/README.md`: the source commit, the deliberate differences, and the
  candidates for the shared library.
- Run M1–M9 headless. **The user** runs M10–M12 on their devices.

## Manual verification

**Headless setup (M1–M9).** Same approach as Chronus's 2026-10-21 run:
- a throwaway Postgres in Docker, and the backend on its own port with its own
  `JWT_SECRET`;
- `VITE_OFFLINE_IN_BROWSER=1 npm run build`;
- a small Node server that serves `dist/` and proxies `/api`, and can refuse API
  connections, hang them, or refuse everything;
- headless `/usr/bin/chromium` driven over the DevTools protocol, with
  `Network.emulateNetworkConditions` for offline.

Seed users through `POST /api/users/register`, and keep the login rate limit in mind.

- **M1. Connection settings.** A wrong token reads "Cloudflare Access rejected…". A wrong
  address reads "Couldn't reach…". A non-Omega server reads "isn't the Omega backend".
  (Desktop app; the error cases can be faked with the test server.)
- **M2. Cold offline.** Stay online until the prefetch finishes (about 100 s after launch),
  then go offline and reload. Month view this month and 6 months out, the day view and the
  timeline all show events. An event's details open with its reminders.
- **M3. Offline edits sync.** Offline:
  - create a one-time event with two reminders;
  - drag another to a new time;
  - rename a third;
  - delete one occurrence of a series;
  - delete a one-time event;
  - change a calendar's color.

  Each shows up in every view. The badge reads "Offline · N pending". Back online, it
  syncs within 30 s, and the server has each change exactly once. Check through the API or
  the web app.
- **M4. Create, then edit, offline.** Create an event, edit it, set its reminders, then
  delete a different event created offline. Online: one new event with the final values,
  and nothing for the deleted one.
- **M5. Repeating event offline.** Create a weekly series. Its first occurrence shows as a
  placeholder, and editing it is refused with the message. Online: the real occurrences
  appear and the placeholder is gone. Separately, create one and delete its placeholder
  offline: nothing reaches the server.
- **M6. Rejected write.** Edit an event offline, delete it through the API as the same
  user, then go online. The badge reads "1 change not saved" and the rest of the queue
  syncs.
- **M7. Expired session.** Swap in an expired JWT. The badge reads "Log in to sync".
  Logging in again in place syncs the queue.
- **M8. Sign-out.** With unsynced changes, Sign out warns first. Without them, the
  `omega-offline` database is empty afterwards. Logging in as another user shows none of
  the first user's events, online or offline.
- **M9. Backend down or hanging.** Same behavior as offline, with no multi-minute hangs.
- **M10 (user). Android APK from CI.**
  - First launch with the Cloudflare token; the plain-HTTP dev server too (Q7).
  - Airplane-mode edits sync once the connection is back.
  - Installing the next CI build over it keeps the stored calendar and unsynced changes
    (the fixed signing key).
- **M11 (user). Desktop app.**
  - Offline for a day: edits sync after reconnecting.
  - Tray "Sync now".
  - Connection settings reopen from Settings and from the login screen.
  - Signing out and back in as the same user re-prefetches (about 100 s, then offline
    views work).
- **M12 (user). Animations, on desktop and Android.** Dialogs, menus, drawers and the
  bottom sheet open and close at once. There's no ripple, spinners spin, and nothing
  blinks.

### Results (2026-10-22)

**M2–M9 pass** (39 checks, no uncaught exceptions). They ran in headless Chromium against
the offline-check build and the real backend on a throwaway Postgres, driving the real UI:
creating, renaming and deleting events through their dialogs, a repeating event through the
create dialog, re-login through the badge, sign-out through Settings.

- **Offline** was the API refusing connections (or hanging, for M9) while the app's own
  files stayed reachable, which is the Tauri app's situation. Cutting the browser off
  entirely relied on the service worker to serve the app, which was flaky headless and
  isn't part of the apps.
- Measured: the prefetch stored a year ahead (57 events, the weekly series included) about
  105 s after launch; a hanging backend fell back to stored data after 15.4 s; a repeating
  event created offline turned into the server's occurrences after syncing, with no
  placeholder left.
- **Not run:** M1 (connection settings) needs the Tauri app's own HTTP client, so it's part
  of M11. M10–M12 are the user's.

**Findings:**
- The desktop layout has no header, so the badge planned for it was invisible on desktop.
  Fixed: it's in the sidebar rail (D10 "As built").
- Not from this work: `PUT /calendar-events/:id/reminders` saves the whole set, but its
  response lists only the reminders that existed before the call. Right after saving, the
  details dialog can show fewer reminders until the next fetch. Offline, the app answers
  with the full set.

## Risks and notes

- **Shared calendars.** If two members edit the same event, whichever change syncs last
  wins, silently. Other members' changes show up on the next fetch or prefetch. Step 2's
  conflict detection would fix it.
- **Reminders for events created offline** exist on the server only once they sync. Check
  what the reminder cron does with a reminder that's already past due when it arrives (sent
  late, or never), and say so in the README.
- **Occurrence generation on read** (D6): the prefetch creates occurrence rows 12 months
  ahead for every series.
- **Rate limit.** Each app runs one prefetch per 30 minutes, 18 requests spaced 2.5 s
  apart. Several devices behind one proxy share the 100 requests/min budget, as in Chronus.
- **Storage.** A year of events is small (well under 5 MB). The apps' storage isn't the
  browser's to evict. Uninstalling the Android app wipes it, which is why the fixed signing
  key matters.
- **WebKitGTK on Asahi** was slow for Chronus. A particle animation was the main cost there.
  Omega has none, but watch for `backdrop-filter` blur flicker; it's the next suspect in
  Chronus too.

## Out of scope (Step 2 and later)

- **Idempotency keys.** A replayed write whose reply was lost gets replayed again, which can
  mean a duplicate event.
- **Conflict detection.** Send the base `updatedAt`, have the server answer 409 on a
  mismatch, and add a resolution UI.
- **Generating occurrences on the device** for series created offline. Wanted later (user,
  2026-10-22); D8's "Later" note says how Step 1 keeps the way open.
- **Local reminder notifications in the apps.** Reminders stay server emails.
- **Offline search.** It would filter the `events` store. Creating and deleting calendars,
  and sharing, offline.
- A UI to review, retry or discard rejected changes.
- Browser offline mode, and iOS.
- Extracting the offline layer into a library shared with Chronus.

## Definition of done

- Phases 0–6 are complete, and each phase's acceptance criteria are met.
- `npx vitest run` passes, with new tests covering D5–D9. `tsc` reports 0 errors.
- The web app behaves as before.
- M1–M9 pass headless. The user has run M10–M12.
- Changes are left uncommitted for the user.
