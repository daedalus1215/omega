# Event Name Search (Fuzzy Lookup)

## Problem

Users cannot look up an event by name. The calendar has no search affordance.
Worse, ~90% of the events table (3,076 of 3,429 rows in production data) are
materialized instances of recurring series — only 353 one-time events exist,
plus 35 recurring series. A name lookup is therefore almost always about a
**recurring series**, which is a separate aggregate (`recurring_events`) that
the current fetch flow only surfaces indirectly through generated instances.

## Decisions (confirmed with user)

1. **Scope**: Search returns one-time events + recurring series, deduped.
   A series is ONE result, never 600 instance rows.
2. **Matching**: Case-insensitive substring (`ILIKE '%query%'`) on
   title + description (one-time) and title (series). Not true fuzzy
   (subsequence/edit distance) — at this data size substring is what
   Google/Apple Calendar do, is SQL-native, and has zero false positives.
3. **UI**: Search box in the desktop `CalendarToolbar`, dropdown of results
   below the input. (Mobile toolbar is out of scope for v1.)
4. **Click behavior**: Calendar navigates to the event's date AND the
   `EventDetailsModal` opens on that event (one click to the thing you wanted).

## API Contract

`GET /calendar-events/search?query=<string>` (JWT-protected, min query length 2 after trim)

Returns a flat array (max 20 series + 20 one-time):

```ts
type SearchCalendarEventsResultDto =
  | {
      kind: 'one-time';
      eventId: number;
      calendarId: number;
      title: string;
      color?: string;
      startDate: string; // ISO
      endDate: string;   // ISO
    }
  | {
      kind: 'recurring-series';
      recurringEventId: number;
      calendarId: number;
      title: string;
      color?: string;
      nextInstanceId?: number; // undefined => series has no upcoming occurrence
      nextInstanceStartDate?: string; // ISO
      nextInstanceEndDate?: string;   // ISO
    };
```

Ordering: series first (by next occurrence asc, no-upcoming last), then
one-time events (by start date asc).

## Backend design (DDD, per repo conventions)

```
apps/actions/search-calendar-events-action/
  search-calendar-events.action.ts
  search-calendar-events.responder.ts   (domain result -> response DTO mapping)
  search-calendar-events.swagger.ts
  dtos/requests/search-calendar-events.dto.ts
  __specs__/search-calendar-events.responder.spec.ts
apps/dtos/responses/search-calendar-events.response.dto.ts
domain/transaction-scripts/search-calendar-events-TS/
  search-calendar-events.command.ts
  search-calendar-events.result.ts        (domain union type)
  search-calendar-events.transaction.script.ts
  __specs__/search-calendar-events.transaction.script.spec.ts
```

Flow:

1. **Action** (`@Get('search')` on `'calendar-events'` controller) validates
   the DTO, builds the command, calls the service, and delegates response
   mapping to the responder. **Route order**: this controller MUST be
   registered BEFORE `FetchCalendarEventAction` (`@Get(':id')`) in the
   module's `controllers` array, otherwise `search` is captured by `:id`.
2. **Responder** (`SearchCalendarEventsResponder`) converts domain search
   results to response DTOs. No business logic, no repositories.
3. **Service** (`CalendarEventService.searchCalendarEvents`):
   - `resolveCalendarIds(user.userId)` (existing private helper)
   - `SearchCalendarEventsTransactionScript.apply(command, calendarIds)`
   - For each series result with a next occurrence date, materialize the
     next instance via `GenerateEventInstancesTransactionScript.apply(series, d, d)`
     (idempotent; skips existing rows, ensures reminders) and attach
     `nextInstanceId` / dates. Mirrors how `fetchCalendarEvents` already
     orchestrates the generator. (A transaction script cannot inject another
     transaction script — orchestration lives in the service.)
4. **Transaction script** (search + next-occurrence computation):
   - trims query; throws on < 2 chars (the action enforces 400 for HTTP)
   - `CalendarEventRepository.searchOneTimeEvents(calendarIds, query)`:
     `calendar_id IN (...) AND recurring_event_id IS NULL AND (title ILIKE :q OR description ILIKE :q)`,
     ordered by `start_date ASC`, limit 20
   - `RecurringEventRepository.searchSeries(calendarIds, query)`:
     `calendar_id IN (...) AND title ILIKE :q`, ordered by `start_date ASC`, limit 20
   - Next occurrence per series: first `generateInstanceDates(...)` result
     within [startOfDayUTC(now), startOfDayUTC(now + 1 year)] using
     `RecurrenceExceptionRepository.findByRecurringEventId` exception dates.
     Pure domain logic, no writes.
   - Injects: `CalendarEventRepository`, `RecurringEventRepository`,
     `RecurrenceExceptionRepository`, `RecurringEventToDomainConverter`
     (existing). No service/TS injection.
5. **Module**: provider + controller + responder added (controller first in
   array).

## Frontend design

```
api/dtos/calendar-events.dtos.ts        (append SearchCalendarEventsResultDto union)
api/requests/calendar-events.requests.ts (append searchCalendarEvents)
pages/CalendarPage/hooks/useSearchCalendarEvents.ts
pages/CalendarPage/components/CalendarToolbar/EventSearchBox/EventSearchBox.tsx
pages/CalendarPage/components/CalendarToolbar/EventSearchBox/EventSearchBox.module.css
```

- `useSearchCalendarEvents(rawQuery)`: `useDebounce` (300ms), `useQuery`
  enabled when trimmed length >= 2, key `['calendarEvents', 'search', q]`,
  `keepPreviousData` while typing.
- `EventSearchBox`: MUI `TextField` (search icon, small) + `Popover`
  listbox with `disableAutoFocus` (MUI's default autofocus steals focus
  from the input when the popover opens, dropping the rest of a fast-typed
  query). Rows: color dot + title + date label + repeat icon for series;
  series rows labeled "Repeats · next: <date>"; series with no upcoming
  occurrence rendered muted/non-clickable ("No upcoming occurrences").
  Keyboard: ArrowUp/Down, Enter, Escape; `role="listbox"` +
  `aria-activedescendant` for a11y. Selecting a result calls
  `onSearchSelect(result)` and clears the box.
- `CalendarToolbar` renders `EventSearchBox` at the right end (before
  ViewDropdown), forwarding `onSearchSelect`.
- `CalendarPage`: new state `searchSelectedEventId: number | null`.
  - one-time → `setCurrentDate(startDate)`, set id to `eventId`
  - series with `nextInstanceId` → `setCurrentDate(nextInstanceStartDate)`, set id
  - series without → no-op (disabled row)
  Renders a page-level `EventDetailsModal`
  (`isOpen={searchSelectedEventId !== null}`) — the per-view modals already
  exist inside CalendarView/DayView/MonthView and only open on card clicks,
  so the page-level instance never conflicts. On close, `refetch()` the
  visible range (search may have materialized a new instance).

## Verification

- Backend: unit specs for the search transaction script and the responder;
  `tsc` clean; live `GET /calendar-events/search?query=...` returns the
  series with a concrete `nextInstanceId`, one-time results, 400 on short
  queries, and `[]` on no match.
- Frontend: `tsc` clean; browser E2E — type a query in the toolbar →
  dropdown shows the matching series/one-time results → click → calendar
  navigates to the event's date and the details modal opens; empty state
  and Escape verified.
