# Omega Calendar

A standalone calendar management application built with React + NestJS.

## Tech Stack

- **Frontend**: React, Vite, MUI, TanStack Query, date-fns, dnd-kit
- **Backend**: NestJS, TypeORM, PostgreSQL, JWT auth, Passport
- **Architecture**: DDD with layered architecture (Transaction Scripts pattern)

## Features

- User registration and authentication (JWT)
- Calendar with Timeline, Day, and Month views
- Drag-and-drop event management
- Recurring events (daily, weekly, monthly, yearly)
- Email reminders via cron scheduler, plus notifications in the Android app
- Responsive design (mobile + desktop)

## Setup

### Backend

```bash
cd backend
cp .env.sample .env    # Edit .env with your settings
npm install
npm run dev            # Runs migrations + starts server on port 3001
```

### Frontend

```bash
cd frontend
cp vite.env.config.sample.ts vite.env.config.ts   # Edit if needed
npm install
npm run dev            # Starts dev server on port 5174
```

### Desktop and Android apps

Tauri packages the React build into a desktop app (Linux, macOS) and an Android
app, both from `frontend/src-tauri/`. The apps carry their own copy of the UI
and talk to an Omega server over the network. On first launch they ask for the
server's address and, if Cloudflare Access protects the server, an Access
service token: Access's sign-in page is meant for browsers, so the apps get
through with the token instead. Logging in to Omega then works as on the web.
**Server settings** on the login screen, or **Connection settings** in
Settings, changes them later.

```bash
cd frontend
npm run desktop:dev     # desktop app against the Vite dev server
npm run desktop:build   # release build: src-tauri/target/release/omega-desktop,
                        # plus .deb, .rpm and AppImage bundles
npm run icons           # redraw the web, desktop and Android icons
```

Linux builds need WebKitGTK and friends (`libwebkit2gtk-4.1-dev`,
`librsvg2-dev`; on Arch, `webkit2gtk-4.1`). To install the release build for
your user, copy `src-tauri/target/release/omega-desktop` to `~/.local/bin/`.
All builds (debug, release, AppImage) share one data directory
(`~/.local/share/com.omega.app.desktop`), so don't run two at once.

CI (`.github/workflows/tauri-android-build.yml`) builds a release APK (arm64) on
every frontend change; download the `omega-android-apk` artifact and
install it with `adb install -r`. Being a release build, nothing connected over
USB can read what the app stores (`run-as`, the WebView inspector). Local
`tauri android dev` builds are `com.omega.app.debug` and install alongside the
release app (`com.omega.app`). `desktop-build.yml` builds Linux and macOS
bundles when run by hand. The `ANDROID_SERVER_URL` repository variable
prefills the address on the first-launch screen.

The APK must be signed with the same key every time, or Android refuses to
install it over the previous one, and uninstalling first wipes everything the
app has stored. The `ANDROID_DEBUG_KEYSTORE_BASE64` repository secret holds
that key (a debug keystore, alias `androiddebugkey`, password `android`,
base64-encoded); the build fails without it, and checks the APK was signed
with it.

The token is entered on the device, never built into the app: anyone signed in
to GitHub can download this repo's CI artifacts. To make one, create a service
token in Cloudflare Zero Trust, then add a policy to Omega's Access application
with the **Service Auth** action that includes it. Leave both token fields blank
for a server Access doesn't protect, such as a dev server on plain HTTP.

### Offline mode

The desktop and Android apps keep working without a connection, for days if
need be. The web app doesn't: it needs the server.

- **What's stored.** Every 30 minutes (first a minute after launch) the app
  downloads the calendars and every event from 3 months back to 12 months
  ahead, one month per request. Anything viewed outside that window is kept
  too. Settings → Offline shows how much is stored and which dates it covers.
  Because the server creates repeat occurrences as they're read, this also
  creates them up to a year ahead.
- **What works offline.** Viewing the calendar; creating, editing, moving and
  deleting events; changing an event's reminders; deleting a repeating series
  or one of its occurrences; renaming or recolouring a calendar. Changes are
  queued on the device and sent in order once the server is reachable; the
  badge in the header (on desktop, in the sidebar) shows how many are waiting.
- **Repeating events created offline** show their first occurrence until the
  series syncs, then the server's occurrences take its place. That first
  occurrence can be deleted (which cancels the series) but not edited until
  then.
- **What needs a connection.** Creating or deleting calendars, sharing,
  invitations, search terms not searched before, and account settings.
- **Reminders** are emailed by the server, so an event created offline gets
  its emails once it syncs. The Android app's own notifications (below) are
  scheduled straight away.
- **Signing out deletes everything stored on the device,** unsynced changes
  included (it asks first). Logging in as someone else does too.
- **If two people edit the same event,** whichever change syncs last wins.

For whoever changes the code:

- The device's data lives in the IndexedDB database `omega-offline`. **Never
  rename it**: that orphans what's stored on devices, unsynced changes
  included.
- **Queued writes outlive deploys.** They're replayed by whatever app version
  is installed when the connection returns, so a backend change to an endpoint
  the app writes to offline (see `frontend/src/offline/offline-routes.ts`)
  must keep accepting the old request shape for as long as a device might be
  offline.
- The offline layer is a copy of Chronus's; `frontend/src/offline/README.md`
  lists what differs. The plan is `specs/offline-apps.md`.

### Reminder notifications (Android)

The Android app shows event reminders as notifications too, scheduled on the
phone from the events offline mode stores. No push service is involved, and
the server keeps emailing them.

- **What's scheduled:** every reminder due in the next 14 days. The list is
  refreshed at launch, every 5 minutes while the app runs, when it comes back
  to the foreground, and right after a change made in the app.
- **Changes made elsewhere** (the website, someone else on a shared calendar)
  reach the phone when it next syncs. Until then, a moved event's reminder
  fires at the old time, and a deleted event's still fires.
- **Settings → Reminders** turns them off for this phone, counts what's
  scheduled, and asks again for notification permission after a no.
  Signing out cancels them all.
- **Tapping one** opens the event, whether or not the app was running.
- **On time, even when idle:** the manifest asks for Android's exact-alarm
  permission. The alarms are the app's own (`ReminderAlarms.kt`), so they're
  set again after the phone restarts. The desktop app doesn't schedule
  reminders.

The details, and what to check on a phone, are in
`specs/app-reminder-notifications.md`.

## Project Structure

```
omega/
├── backend/           # NestJS API
│   └── src/
│       ├── auth/              # JWT authentication
│       ├── users/             # User management
│       ├── calendar-events/   # Calendar CRUD + reminders
│       ├── security-events/   # Login failure logging
│       ├── shared-kernel/     # Guards, decorators, email
│       └── typeorm/           # Migrations + data source
├── frontend/          # React SPA
│   ├── src-tauri/     # Desktop and Android app shell (Tauri)
│   └── src/
│       ├── api/               # Axios interceptor + requests
│       ├── auth/              # Auth context + hooks
│       ├── components/        # Layout, Header, Sidebar
│       ├── contexts/          # Calendar, Sidebar contexts
│       ├── hooks/             # Shared hooks
│       ├── offline/           # Offline layer (the apps): storage, sync
│       ├── pages/             # Calendar, Settings, Login, Register
│       └── tauri/             # App-only code: connection settings, tray
└── .cursor/rules/     # Architecture and coding rules
```
