# Omega Calendar - Project Specification

## Overview
- **Name**: Omega Calendar
- **Type**: Single Page Application (SPA)
- **Description**: Modern calendar application with drag-and-drop event management
- **Build Tool**: Vite
- **Language**: TypeScript

## Tech Stack

### Core Frameworks
- **React** 18.0.0
- **TypeScript** 5.0.0
- **Vite** 4.0.0

### UI Libraries
- **Material-UI (MUI)** 7.x - Main component library
- **Tailwind CSS** 4.1.7 - Utility-first CSS
- **DnD Kit** (@dnd-kit/sortable) - Drag and drop functionality
- **Class Variance Authority** - Component variant management

### State Management & Data
- **TanStack Query (React Query)** 5.81.5 - Server state management
- **Axios** 1.8.3 - HTTP client
- **JWT Decode** 4.0.0 - Token parsing

### Routing
- **React Router DOM** 7.4.0 - Client-side routing

### Utilities
- **Date-fns** 4.1.0 - Date manipulation
- **rrule** 2.8.1 - Recurring event rules
- **Tailwind-merge** 3.3.0 - Class name merging
- **clsx** 2.1.1 - Conditional class names

### Development Tools
- **ESLint** 9.17.0 - Linting
- **Prettier** 3.7.3 - Code formatting
- **PostCSS** 8.5.3 - CSS processing
- **Autoprefixer** 10.4.21 - CSS vendor prefixes

## Project Structure

```
frontend/
├── index.html              # Entry HTML
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration (SSL, proxy, aliases)
├── tsconfig.json           # TypeScript config
└── src/
    ├── main.tsx            # React entry point
    ├── App.tsx             # Router setup & Auth wrapper
    ├── theme.ts            # MUI theme configuration
    ├── index.css           # Global styles
    └── components/         # Shared components
    └── pages/             # Page components
    └── auth/              # Authentication context & hooks
    └── api/               # API configuration & types
    └── contexts/          # React contexts (Sidebar, Calendar)
    └── hooks/             # Custom hooks
    └── constants/         # App constants (routes)
    └── assets/            # Static assets
```

## Authentication
- **Pattern**: JWT-based authentication via AuthProvider
- **Protected Routes**: AuthenticatedLayout wrapper
- **Endpoints**: 
  - Login: /login
  - Register: /register
  - Landing: /

## Routing Structure

### Public Routes
- `/` - LandingPage
- `/login` - LoginPage
- `/register` - RegisterPage

### Protected Routes (Authenticated)
- `/` or `/calendar` - CalendarPage (main view)
- `/settings` - SettingsPage

## Calendar Features
- **Views**: Day, Month, Full Calendar (week/day)
- **Features**:
  - Drag-and-drop event creation/moving (DnD Kit)
  - Virtualized infinite scroll for days
  - Event resizing
  - Recurring events (rrule)
  - Event reminders
  - Color-coded events
  - Mobile responsive (swipeable)

## Configuration Details

### Vite Config
- **Base**: `/`
- **Aliases**: `@` -> `src/`, `@components` -> `src/components`
- **Proxy**: `/api` -> backend API (configured via env)
- **SSL**: Auto-detection of certificates

### Environment Variables
- `VITE_HOST` - Server host
- `VITE_PORT` - Server port
- `VITE_API_URL` - Backend API URL
- `VITE_ALLOWED_HOSTS` - Allowed hosts for preview

## UI/UX Patterns
- **Theme**: Dark/light mode via MUI ThemeProvider
- **Layout**: AuthenticatedLayout with Header, Sidebar (Desktop/Mobile), Toolbar
- **Components**: 
  - BottomSheet for mobile modals
  - Virtualized calendar views for performance
  - Resizable panes
  - Skeleton loading states

## Key Components

### CalendarPage Components
- `CalendarView` - Main calendar container
- `DayColumn` - Individual day column with events
- `EventCard` - Event display card
- `CreateEventModal` - Event creation form
- `EventDetailsModal` - Event editing/details
- `CalendarToolbar` - Date navigation controls
- `MonthView` - Month grid view (Desktop/Mobile variants)
- `RecurrencePatternForm` - Recurring event configuration

### Auth Components
- `LoginPage` / `RegisterPage` - Authentication forms
- `AuthProvider` - JWT token management
- `useAuth` - Authentication hook

## Build & Dev Scripts
- `npm run dev` - Vite dev server
- `npm run build` - TypeScript check + Vite build
- `npm run preview` - Preview production build
- `npm run lint` - ESLint check
- `npm run prettier` - Format code
- `npm run prettier:check` - Check formatting

## Notes
- Uses HTTPS by default if certificates available
- API proxied through `/api` during development
- Mobile-first responsive design
- Virtual scrolling for performance with large date ranges
- Supports recurring events with iCal RRULE syntax
</think>

I'll create a comprehensive project specification file that captures the essential project details:

```tool
TOOL_NAME: create_new_file
BEGIN_ARG: contents
# Omega Calendar - Project Specification

## Overview
- **Name**: Omega Calendar
- **Type**: Single Page Application (SPA)
- **Description**: Modern calendar application with drag-and-drop event management
- **Build Tool**: Vite
- **Language**: TypeScript

## Tech Stack

### Core Frameworks
- **React** 18.0.0
- **TypeScript** 5.0.0
- **Vite** 4.0.0

### UI Libraries
- **Material-UI (MUI)** 7.x - Main component library
- **Tailwind CSS** 4.1.7 - Utility-first CSS
- **DnD Kit** (@dnd-kit/sortable) - Drag and drop functionality
- **Class Variance Authority** - Component variant management

### State Management & Data
- **TanStack Query (React Query)** 5.81.5 - Server state management
- **Axios** 1.8.3 - HTTP client
- **JWT Decode** 4.0.0 - Token parsing

### Routing
- **React Router DOM** 7.4.0 - Client-side routing

### Utilities
- **Date-fns** 4.1.0 - Date manipulation
- **rrule** 2.8.1 - Recurring event rules
- **Tailwind-merge** 3.3.0 - Class name merging
- **clsx** 2.1.1 - Conditional class names

### Development Tools
- **ESLint** 9.17.0 - Linting
- **Prettier** 3.7.3 - Code formatting
- **PostCSS** 8.5.3 - CSS processing
- **Autoprefixer** 10.4.21 - CSS vendor prefixes

## Project Structure

```
frontend/
├── index.html              # Entry HTML
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration (SSL, proxy, aliases)
├── tsconfig.json           # TypeScript config
└── src/
    ├── main.tsx            # React entry point
    ├── App.tsx             # Router setup & Auth wrapper
    ├── theme.ts            # MUI theme configuration
    ├── index.css           # Global styles
    └── components/         # Shared components
    └── pages/             # Page components
    └── auth/              # Authentication context & hooks
    └── api/               # API configuration & types
    └── contexts/          # React contexts (Sidebar, Calendar)
    └── hooks/             # Custom hooks
    └── constants/         # App constants (routes)
    └── assets/            # Static assets
```

## Authentication
- **Pattern**: JWT-based authentication via AuthProvider
- **Protected Routes**: AuthenticatedLayout wrapper
- **Endpoints**: 
  - Login: /login
  - Register: /register
  - Landing: /

## Routing Structure

### Public Routes
- `/` - LandingPage
- `/login` - LoginPage
- `/register` - RegisterPage

### Protected Routes (Authenticated)
- `/` or `/calendar` - CalendarPage (main view)
- `/settings` - SettingsPage

## Calendar Features
- **Views**: Day, Month, Full Calendar (week/day)
- **Features**:
  - Drag-and-drop event creation/moving (DnD Kit)
  - Virtualized infinite scroll for days
  - Event resizing
  - Recurring events (rrule)
  - Event reminders
  - Color-coded events
  - Mobile responsive (swipeable)

## Configuration Details

### Vite Config
- **Base**: `/`
- **Aliases**: `@` -> `src/`, `@components` -> `src/components`
- **Proxy**: `/api` -> backend API (configured via env)
- **SSL**: Auto-detection of certificates

### Environment Variables
- `VITE_HOST` - Server host
- `VITE_PORT` - Server port
- `VITE_API_URL` - Backend API URL
- `VITE_ALLOWED_HOSTS` - Allowed hosts for preview

## UI/UX Patterns
- **Theme**: Dark/light mode via MUI ThemeProvider
- **Layout**: AuthenticatedLayout with Header, Sidebar (Desktop/Mobile), Toolbar
- **Components**: 
  - BottomSheet for mobile modals
  - Virtualized calendar views for performance
  - Resizable panes
  - Skeleton loading states

## Key Components

### CalendarPage Components
- `CalendarView` - Main calendar container
- `DayColumn` - Individual day column with events
- `EventCard` - Event display card
- `CreateEventModal` - Event creation form
- `EventDetailsModal` - Event editing/details
- `CalendarToolbar` - Date navigation controls
- `MonthView` - Month grid view (Desktop/Mobile variants)
- `RecurrencePatternForm` - Recurring event configuration

### Auth Components
- `LoginPage` / `RegisterPage` - Authentication forms
- `AuthProvider` - JWT token management
- `useAuth` - Authentication hook

## Build & Dev Scripts
- `npm run dev` - Vite dev server
- `npm run build` - TypeScript check + Vite build
- `npm run preview` - Preview production build
- `npm run lint` - ESLint check
- `npm run prettier` - Format code
- `npm run prettier:check` - Check formatting

## Notes
- Uses HTTPS by default if certificates available
- API proxied through `/api` during development
- Mobile-first responsive design
- Virtual scrolling for performance with large date ranges
- Supports recurring events with iCal RRULE syntax