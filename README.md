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

Capacitor wraps the same React build in a native shell under `frontend/android/`.
The APK's WebView loads the live site (`CAPACITOR_SERVER_URL`), so the app is
always the deployed version and needs no separate release for web changes.

```bash
cd frontend
CAPACITOR_SERVER_URL=https://<omega-host> npm run android:sync   # build + sync into android/
npm run android:open                                            # open in Android Studio
npm run icons                                                   # redraw launcher/splash images
```

CI (`.github/workflows/android-build.yml`) builds a debug APK on every frontend
change, pointed at the `ANDROID_SERVER_URL` repository variable. A manual run can
target `ANDROID_SERVER_URL_DEV` instead, which installs alongside as "Omega Dev".

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
