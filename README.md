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

### Android

Capacitor packages the React build into an Android app under `frontend/android/`.
The app carries its own copy of the UI and talks to an Omega server over the
network. On first launch it asks for the server's address and, if Cloudflare
Access protects the server, an Access service token: Access's sign-in page is
meant for browsers, so the app gets through with the token instead. Logging in
to Omega then works as on the web. **Server settings** on the login screen
changes them later.

```bash
cd frontend
npm run android:sync   # build + sync into android/
npm run android:open   # open in Android Studio
npm run icons          # redraw launcher/splash images
```

CI (`.github/workflows/android-build.yml`) builds a debug APK on every frontend
change. The `ANDROID_SERVER_URL` repository variable prefills the address on the
first-launch screen. A manual run can build the dev app instead, which
installs alongside as "Omega Dev" and prefills `ANDROID_SERVER_URL_DEV`.

The token is entered on the device, never built into the APK: anyone signed in
to GitHub can download this repo's CI artifacts. To make one, create a service
token in Cloudflare Zero Trust, then add a policy to Omega's Access application
with the **Service Auth** action that includes it. Leave both token fields blank
for a server Access doesn't protect.

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
│   └── src/
│       ├── api/               # Axios interceptor + requests
│       ├── auth/              # Auth context + hooks
│       ├── components/        # Layout, Header, Sidebar
│       ├── contexts/          # Calendar, Sidebar contexts
│       ├── hooks/             # Shared hooks
│       └── pages/             # Calendar, Settings, Login, Register
└── .cursor/rules/     # Architecture and coding rules
```
