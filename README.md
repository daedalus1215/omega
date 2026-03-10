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

## Project Structure

```
alpha-omega/
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
