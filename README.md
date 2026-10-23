# Omega Calendar

A standalone calendar management application built with React + NestJS.

## Tech Stack

- **Frontend**: React, Vite, MUI, TanStack Query, date-fns, dnd-kit
- **Backend**: NestJS, TypeORM, SQLite, JWT auth, Passport
- **Architecture**: DDD with layered architecture (Transaction Scripts pattern)

## Features

- User registration and authentication (JWT)
- Calendar with Timeline, Day, and Month views
- Drag-and-drop event management
- Recurring events (daily, weekly, monthly, yearly)
- Email reminders via cron scheduler
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

CI (`.github/workflows/tauri-android-build.yml`) builds a debug APK (arm64) on
every frontend change; download the `omega-android-debug-apk` artifact and
install it with `adb install -r`. `desktop-build.yml` builds Linux and macOS
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
│       ├── pages/             # Calendar, Settings, Login, Register
│       └── tauri/             # App-only code: connection settings
└── .cursor/rules/     # Architecture and coding rules
```
