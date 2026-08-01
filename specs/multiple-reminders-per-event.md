# Spec: Multiple Reminders Per Event

---
title: Multiple Reminders Per Event
status: implemented
scope: backend + frontend
---

## Problem

A calendar event can currently have only **one** email reminder, even though the
data model has always supported many. `event_reminders` is a proper 1:N child
table (`event-reminder.entity.ts:17`) with no unique constraint, the repository
returns arrays sorted by `reminderMinutes ASC`, and the scheduler already loops
over reminders independently.

The single-reminder limit is artificial and lives entirely in the client:

1. `EventDetailsModal.tsx:296-302` — on change, if any reminder exists it
   **updates `reminders[0]`** rather than creating a second row. The inline
   comment states the intent: *"This ensures we don't have multiple reminders
   scheduled."*
2. `ReminderField.tsx:185` — a `RadioGroup` bound to a single `number | null`,
   so the UI cannot express more than one offset.

Users want several reminders per event (e.g. 1 day / 1 hour / 15 minutes before)
because each one prompts a different kind of preparation.

## Scope

**In scope**

- Multiple reminders on one-off calendar events.
- Multiple reminders on an **individual instance** of a recurring series
  (per-instance override).
- Fixing the reminder scheduler's missed-delivery and unbounded-scan defects,
  which multiple reminders amplify.

**Out of scope**

- Series-level recurring reminders. `recurring_events.reminder_minutes` stays a
  single nullable `int` (`recurring-event.entity.ts:66`). Creating a series
  still accepts one offset, and `POST /calendar-events/recurring` is unchanged.
- Non-email delivery channels.
- Digesting/batching multiple reminders into one email. Each reminder sends its
  own email, by design — they fire at different times for different purposes.

### The recurring interaction this creates

Per-instance overrides (in scope) collide with series-level generation (out of
scope). `ensureRemindersExist()`
(`generate-event-instances.transaction.script.ts:156`) currently dedupes on
*"does this instance have **any** reminder"*:

```typescript
const instanceIdsWithReminders = new Set(existingReminders.map(r => r.calendarEventId));
for (const instance of instances) {
  if (instanceIdsWithReminders.has(instance.id)) continue;
  await this.eventReminderRepository.create({ calendarEventId: instance.id, reminderMinutes });
}
```

This runs on **every fetch cycle**. If a user deletes all reminders from one
instance of a series, the next calendar fetch silently resurrects the series
reminder. See "Instance customization flag" below for the fix.

## Constants

Defined once in `backend/src/calendar-events/domain/reminder.constants.ts` and
mirrored in `frontend/src/pages/CalendarPage/constants/reminders.ts`.

| Constant | Value | Purpose |
|---|---|---|
| `MAX_REMINDERS_PER_EVENT` | `5` | Cap per event. Matches Google Calendar. |
| `MAX_REMINDER_MINUTES` | `40320` (28 days) | Upper bound per reminder. Also bounds the scheduler's scan window. |
| `LATE_DELIVERY_GRACE_MINUTES` | `60` | How late a missed reminder may still send. |

## Pre-existing defect found in production data

Auditing `backend/db.sqlite` before implementation turned up live corruption
that this feature must clean up first.

```
events with >1 reminder ............ 669   (100% recurring instances)
duplicate (event, offset) groups ... 669   (all of them)
offsets involved ................... 15,15  and  15,15,15
created_at spread within a group ... same second (e.g. 2026-06-12 03:43:44)
sent_at set on any duplicate ....... 0
```

Every one of these is a **duplicate of the same offset on the same event**, not
a genuine multi-reminder. `ensureRemindersExist()` runs on every calendar fetch
and is not atomic: it reads "which instances already have reminders", then
inserts for the rest. Two concurrent fetches both read the empty state and both
insert. Nothing at the storage layer prevents it — `event_reminders` has only
`@Index(['calendarEventId'])`, no uniqueness.

Affected users would receive 2-3 identical emails per instance. The rows are all
future-dated (2027) with `sent_at IS NULL`, so cleanup cannot suppress or
re-trigger an already-delivered reminder.

**Fix:** a unique constraint, which also makes "no duplicate offsets" a storage
invariant rather than something three call sites remember to check.

## Data model

### Unique constraint on `event_reminders`

```typescript
@Unique(['calendarEventId', 'reminderMinutes'])
```

Migration `<ts>-dedupe-and-unique-event-reminders.ts`:

1. Delete duplicates, keeping one row per `(calendar_event_id, reminder_minutes)`.
   Prefer a row with `sent_at IS NOT NULL` so a delivered reminder is never
   resurrected; fall back to `MIN(id)`. (Against current data every group is
   entirely unsent, so this reduces to `MIN(id)` — the preference is there to
   keep the migration correct if it runs against a newer snapshot.)
2. Add the unique index.

Down: drop the index only. The deleted duplicates are not restored — they were
corruption, and re-creating them would re-introduce duplicate email sends.

`ensureRemindersExist()` additionally catches unique-violation errors and treats
them as success, so a losing race becomes a no-op instead of a 500.

### Instance customization flag

New nullable boolean column on `calendar_events`:

```typescript
@Column({ name: 'reminders_customized', type: 'boolean', default: false, nullable: true })
remindersCustomized?: boolean;
```

- Set to `true` whenever the sync endpoint writes reminders for an event.
- `ensureRemindersExist()` **skips** any instance with `remindersCustomized === true`.

This makes "I deleted the reminders on this one instance" stick, and stops the
series offset being re-added alongside a user's custom set. `isModified` is not
reused for this — it tracks title/description overrides and conflating the two
would make either flag unreliable.

Migration: `backend/src/typeorm/migrations/<ts>-add-reminders-customized-to-calendar-events.ts`
(add column, default `false`; down drops it). SQLite — TypeORM handles the
table-rebuild for the boolean default.

## API changes

The frontend is the only consumer, so breaking changes are acceptable.

### 1. Create event takes an array — **breaking**

`POST /calendar-events`, `create-calendar-event.dto.ts:39`

```diff
- reminderMinutes?: number;
+ reminderMinutes?: number[];
```

`CreateCalendarEventCommand` and `calendar-event.service.ts:142-146` change to
loop over the array inside the existing transaction. `reminders?: CreateEventReminderRequest[]`
already exists (unused) on the frontend DTOs at `calendar-events.dtos.ts:39,50`
and is removed in favour of the array form.

### 2. New replace-all sync endpoint

```
PUT /calendar-events/:id/reminders
Body:     { reminderMinutes: number[] }
Response: EventReminderResponseDto[]   // full set, sorted ASC
```

Follows the existing action/transaction-script layout:

```
apps/actions/sync-event-reminders-action/
  sync-event-reminders.action.ts
  sync-event-reminders.swagger.ts
  dtos/requests/sync-event-reminders.dto.ts
  dtos/responses/event-reminder.response.dto.ts
domain/transaction-scripts/sync-event-reminders-TS/
  sync-event-reminders.transaction.script.ts
  sync-event-reminders.command.ts
  __specs__/sync-event-reminders.transaction.script.spec.ts
```

### 3. Unchanged

`GET/POST/PUT/DELETE /calendar-events/:id/reminders[/:reminderId]` all stay.
`POST` additionally enforces `MAX_REMINDERS_PER_EVENT`.

## Sync semantics (diff, not truncate)

Naive replace-all would delete and reinsert every row, discarding `sent_at` and
causing already-delivered reminders to fire a second time. The sync script diffs
by `reminderMinutes` instead.

Given desired set `D` and existing set `E`:

| Set | Action | `sent_at` |
|---|---|---|
| `E ∩ D` | untouched | **preserved** |
| `E \ D` | deleted | — |
| `D \ E` | inserted | `NULL` |

Validation runs before any write; the whole diff is one transaction:

1. Reject non-integers, `< 0`, or `> MAX_REMINDER_MINUTES` → `400`.
2. De-duplicate the incoming array (`[15, 15, 60]` → `[15, 60]`) rather than
   erroring — the UI already blocks duplicates, so this is defence in depth.
3. After dedupe, `length > MAX_REMINDERS_PER_EVENT` → `400`.
4. Event must be visible to the caller via `calendarIds` → `404` otherwise
   (same ownership check as `create-event-reminder.transaction.script.ts`).
5. Set `remindersCustomized = true` on the event.

Empty array is valid and means "remove all reminders".

### Sync does not write back to the series

`calendar-event.service.ts:266` has a `syncReminderToRecurringTemplate` helper:
changing a reminder on one instance through the single-reminder endpoints
propagates the new offset to the **whole recurring series**, so every future
instance inherits it. That is series-level editing wearing per-instance
clothing, and it is the opposite of the per-instance override this feature
adds.

`syncReminders` deliberately does not call it. The template holds one offset, so
given a set of five there is no correct value to write back. The older
create/update/delete endpoints keep their propagation, but the UI no longer
uses them for reminder edits.

**Behaviour change:** editing reminders on a single occurrence used to change
the entire series. It now changes only that occurrence.

## `sent_at` reset rules

`sent_at` is per-row and nothing currently resets it. Invisible with one
reminder; wrong with several.

| Trigger | Effect |
|---|---|
| `PUT /calendar-events/:id` changes `startDate` | reset `sent_at = NULL` for **all** that event's reminders |
| `PUT /:eventId/reminders/:reminderId` changes `reminderMinutes` | reset `sent_at = NULL` for that reminder |
| Sync inserts a new row | starts `NULL` |
| Sync keeps an unchanged row | preserved |
| `PUT /calendar-events/:id` changes only title/description/color | untouched |

A reset whose new reminder time is already older than the grace window is
absorbed by the scheduler's stale path — no burst of backdated email.

New repository method: `resetSentAtByEventId(calendarEventId, manager?)`.

## Scheduler rewrite

Three defects in `reminder.scheduler.ts` / `event-reminder.repository.ts`, all
made worse by N reminders per event:

1. **`findPendingReminders()` (`repository:120`)** selects *every* unsent
   reminder in the database, every 60 seconds, with no date bound. Current
   snapshot: 2,790 unsent rows scanned per minute, of which 2,725 are for events
   more than 28 days out and cannot possibly be due. The bounded query below
   scans roughly **65**.
2. **N+1** — `findByIdOnly` is called per reminder inside the loop
   (`scheduler:37`).
3. **Permanent drops** — `scheduler:64` fires only within
   `[oneMinuteAgo, now]`. A missed tick (deploy, restart, slow query) loses the
   reminder forever.

### New query

`findPendingReminders()` is replaced by `findDueReminders(now)`, which joins the
event and bounds both ends of the window:

```typescript
.createQueryBuilder('reminder')
.innerJoinAndMapOne('reminder.calendarEvent', CalendarEventEntity, 'event',
                    'event.id = reminder.calendar_event_id')
.where('reminder.sent_at IS NULL')
.andWhere('event.start_date >= :lowerBound')   // now - grace
.andWhere('event.start_date <= :upperBound')   // now + MAX_REMINDER_MINUTES
```

Date arithmetic stays in JS (bounds are computed before the query) rather than
SQL, since the datasource is SQLite (`data-source.ts:8`) and `datetime()`
modifiers would not port. The join removes the N+1; the bounds cap the scan at
"events in the next 28 days".

Events that started more than the grace window ago drop out of the query
entirely. Their unsent reminders become inert rows — no email, no repeated
scanning.

### Due determination

For each row, `reminderTime = event.startDate - reminderMinutes`:

| Condition | Action |
|---|---|
| `reminderTime > now` | not yet due — skip, leave unsent |
| `now - grace ≤ reminderTime ≤ now` | **send**, then `markAsSent` |
| `reminderTime < now - grace` | stale — `markAsSent` **without emailing**, log at `warn` |

Sends more than 90 seconds behind schedule pass `isLate: true` to
`EmailService.sendReminderEmail`, which appends a line noting the delay. A
failed send is **not** marked sent, so it retries on the next tick while still
inside the grace window, and non-email usernames are skipped as before.

The explicit orphan branch is dropped. The inner join cannot return a reminder
whose event is gone, so the code was unreachable. The audited database holds 12
such rows; all have `sent_at` set, and `calendar_events` uses `AUTOINCREMENT`
so a future event can never reuse their id and inherit them. They are inert.

## Frontend

### `RemindersField` (replaces `ReminderField`)

`components/EventDetailsModal/RemindersField/` — the `RadioGroup` becomes a list.

```
Reminders                          [ + Add ]
  [ 15 minutes before  v ]            [ x ]
  [ 1 hour before      v ]            [ x ]
  [ Custom  v ] [ 2 ] [ Days v ]      [ x ]
```

```typescript
type RemindersFieldProps = {
  value: number[];
  onChange: (reminderMinutes: number[]) => void;
  isEditing: boolean;
};
```

- Each row: a preset `Select` (15 min / 1 hour / 1 day / Custom) plus the
  existing number + unit inputs when Custom. The preset table and
  `convertToMinutes` / `formatReminderText` helpers carry over unchanged.
- `+ Add` appends a row, defaulting to the first preset not already used.
  Disabled at `MAX_REMINDERS_PER_EVENT`, with helper text stating the cap.
- `x` removes a row. Zero rows is a valid state ("No reminders").
- Duplicate offsets mark the offending rows with `error` and inline helper text,
  and disable Save. The server also dedupes.
- View mode keeps today's read-only list (`ReminderField.tsx:162-175`),
  sorted ascending.

### `EventDetailsModal`

Reminder edits become **draft state applied on Save**, replacing today's
fire-immediately-per-change behaviour.

- `draftReminderMinutes: number[]`, seeded from `reminders` when `eventId`
  changes or edit mode opens.
- Cancel discards the draft.
- Save issues one `PUT /calendar-events/:id/reminders` alongside the existing
  event update, then invalidates the `['event-reminders', eventId]` query.
- The `reminders[0]` special-casing at `EventDetailsModal.tsx:286-308` is
  deleted outright.

### `CreateEventModal`

`reminderMinutes` state becomes `number[]`, sent as an array in the create
payload. Recurring creation still submits a single offset — when the recurrence
toggle is on, the field collapses to one row with a caption explaining that
recurring events support one reminder for now.

### API layer

- `syncEventReminders(eventId, reminderMinutes)` added to
  `api/requests/calendar-events.requests.ts`.
- `useEventReminders` gains `syncReminders` + `isSyncing`; the per-row
  create/update/delete mutations remain for any other caller.

## Testing

| Area | Cases |
|---|---|
| `sync-event-reminders` TS | diff preserves `sent_at` on unchanged rows; deletes removed; inserts added with `sent_at` null; empty array clears; dedupes input; rejects `> 5`, negative, `> MAX_REMINDER_MINUTES`; 404 on foreign event; sets `remindersCustomized` |
| Scheduler | not-yet-due skipped; due sends; late-but-within-grace sends with `isLate`; stale marked sent without email; orphan handling unchanged; failed send not marked sent |
| `findDueReminders` | excludes sent; excludes events outside bounds; returns joined event (no N+1) |
| `generate-event-instances` | skips instances with `remindersCustomized`; existing dedupe specs still pass |
| Update event | `startDate` change resets `sent_at`; title-only change does not |
| Create event | array creates N reminders in one transaction; cap enforced |

## Files

**New**

- `backend/src/calendar-events/domain/reminder.constants.ts`
- `backend/src/calendar-events/apps/actions/sync-event-reminders-action/` (4 files)
- `backend/src/calendar-events/domain/transaction-scripts/sync-event-reminders-TS/` (3 files + spec)
- `backend/src/typeorm/migrations/<ts>-add-reminders-customized-to-calendar-events.ts`
- `backend/src/typeorm/migrations/<ts>-dedupe-and-unique-event-reminders.ts`
- `frontend/src/pages/CalendarPage/components/EventDetailsModal/RemindersField/RemindersField.tsx`
- `frontend/src/pages/CalendarPage/constants/reminders.ts`

**Modified**

- `backend/src/calendar-events/apps/schedulers/reminder-scheduler/reminder.scheduler.ts`
- `backend/src/calendar-events/infra/repositories/event-reminder.repository.ts`
- `backend/src/calendar-events/infra/entities/event-reminder.entity.ts`
- `backend/src/calendar-events/infra/entities/calendar-event.entity.ts`
- `backend/src/calendar-events/domain/entities/calendar-event.entity.ts`
- `backend/src/calendar-events/domain/services/calendar-event.service.ts`
- `backend/src/calendar-events/domain/transaction-scripts/create-calendar-event-TS/create-calendar-event.command.ts`
- `backend/src/calendar-events/domain/transaction-scripts/create-event-reminder-TS/create-event-reminder.transaction.script.ts`
- `backend/src/calendar-events/domain/transaction-scripts/update-event-reminder-TS/update-event-reminder.transaction.script.ts`
- `backend/src/calendar-events/domain/transaction-scripts/update-calendar-event-TS/update-calendar-event.transaction.script.ts`
- `backend/src/calendar-events/domain/transaction-scripts/generate-event-instances-TS/generate-event-instances.transaction.script.ts`
- `backend/src/calendar-events/apps/actions/create-calendar-event-action/dtos/requests/create-calendar-event.dto.ts`
- `backend/src/calendar-events/calendar-events.module.ts`
- `backend/src/shared-kernel/domain/services/email.service.ts`
- `frontend/src/pages/CalendarPage/components/EventDetailsModal/EventDetailsModal.tsx`
- `frontend/src/pages/CalendarPage/components/CreateEventModal/CreateEventModal.tsx`
- `frontend/src/pages/CalendarPage/hooks/useEventReminders.ts`
- `frontend/src/api/requests/calendar-events.requests.ts`
- `frontend/src/api/dtos/calendar-events.dtos.ts`

**Deleted**

- `frontend/src/pages/CalendarPage/components/EventDetailsModal/ReminderField/ReminderField.tsx`

## Build order

0. **Dedupe migration + unique constraint.** Cleans the 669 corrupt groups and
   closes the race. Ships on its own — it is a bug fix, not part of the feature.
1. Constants + migration + `remindersCustomized` on both entities.
2. Repository: `findDueReminders`, `resetSentAtByEventId`.
3. Scheduler rewrite + specs.
4. Sync transaction script + action + specs; wire into module.
5. `sent_at` reset in update paths; cap in create-reminder TS.
6. Create-event array support.
7. `ensureRemindersExist` respects `remindersCustomized`; unique-violation
   tolerance.
8. Frontend: constants, requests/DTOs, `useEventReminders`, `RemindersField`,
   `EventDetailsModal`, `CreateEventModal`.

Backend stages 0-7 are independently shippable; the frontend continues to work
against the existing endpoints throughout.

## Open risks

- **Instances already carrying series reminders** predate `remindersCustomized`
  and default to `false`, so `ensureRemindersExist` keeps its current behaviour
  for them. No backfill needed.
- **Grace-window semantics change delivery**: a reminder up to 60 minutes late
  now sends where it previously vanished. This is the intended fix, but it will
  surface reminders that used to fail silently.
- **28-day scan bound** means a reminder with an offset longer than
  `MAX_REMINDER_MINUTES` could never fire. Verified against the current snapshot:
  the largest existing offset is 1440 (1 day), so no row is stranded. The
  validation cap prevents new ones.
- **The dedupe migration deletes rows.** 669 groups, all unsent and future-dated
  in the audited snapshot, but the migration re-checks `sent_at` at run time
  rather than trusting that. Take a DB backup before running it.
- **Users on affected recurring series will notice fewer emails** — that is the
  duplicates being removed, not reminders going missing.
