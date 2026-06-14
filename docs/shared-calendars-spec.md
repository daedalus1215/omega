# Shared Calendars — Technical Specification

Status: Draft for review
Author: design session (2026-06-14)
Branch target: new branch off `main`

---

## 1. Goal & locked decisions

Allow a user to create a **Calendar** as a first-class object and **share it with another omega user**, where both members can fully co-manage every event on it.

Decisions already made (do not relitigate without flagging):

| # | Decision | Choice |
|---|----------|--------|
| 1 | Unit of sharing | A real **Calendar** entity. Events belong to a `calendar_id`. Every user gets an auto-created "Personal" calendar. |
| 2 | Permission model | **Full co-ownership.** Any member can add/edit/delete *any* event on the calendar, regardless of who created it. |
| 3 | Invite flow | **By username, with accept/decline.** Invitee must already have an omega account. |
| 4 | Reminders on shared calendars | **None in v1.** Reminders remain a property of the event creator only; we do not fan out. |
| 5 | Revoke semantics | Events belong to the **calendar**, not the person. Removing a member leaves their events on the calendar. `created_by` is a label only. |
| 6 | Real-time | **Refetch-based.** No websockets in v1; changes appear on the next React Query refetch. |

---

## 2. Architecture constraints (from `.cursor/rules/`)

This spec obeys omega's rules. The relevant ones:

- **DDD + hexagonal, three layers per module:** `apps/` (actions, dtos), `domain/` (entities, services, transaction-scripts, aggregators), `infra/` (entities, repositories).
- **Pure domain entities** (no TypeORM) + **TypeORM infra entities** + mapping done inside the repository (`domainToInfrastructure` / `infrastructureToDomain`). (architecture.mdc §"DDD + TypeORM").
- **Transaction Script** = one use case, class ends in `TransactionScript`, public method is `apply`, lives in `domain/transaction-scripts/{name}-TS/`, takes a `*.command.ts` param object. (custom.mdc, backend-structure.mdc).
- **DI hierarchy (strict):** Action → Domain Service → Aggregator (cross-domain only) → Transaction Script → Repository. No same-level injection. Actions never call a TS or repo directly. (architecture.mdc §"Dependency Hierarchy").
- **Cross-domain communication ONLY via Aggregators.** No cross-domain entity references. (architecture.mdc §"No Cross-Domain Pollination").
- **One action per folder** with `{action}.action.ts`, `{action}.swagger.ts`, `dtos/requests/`, `dtos/responses/`, `__specs__/`.
- One export per file, JSDoc on public classes/methods, kebab-case files, PascalCase classes, no blank lines inside functions.

### 2.1 Module decision

Introduce a **new `calendars` module**. It owns calendars, membership, invitations, and the only cross-domain entry point: a `CalendarAccessAggregator`.

`calendar-events` does **not** absorb the Calendar entity — that would violate single-responsibility and bloat an already-large module. Instead:

```
users ─────────────┐                 (users depends on calendars for provisioning)
                   ▼
              calendars  ◄────────────  calendar-events
          (owns Calendar,            (events gain calendar_id;
           Member, Invitation;        resolves access via the
           exports Aggregator)        CalendarAccessAggregator)
```

Dependency graph stays **acyclic**: `users → calendars`, `calendar-events → calendars`, `calendar-events → users`. No cycle.

---

## 3. Data model

### 3.1 New tables

```sql
-- calendars
id           INTEGER PK AUTOINCREMENT
name         VARCHAR(60)  NOT NULL
color        VARCHAR(20)  NULL
owner_id     INTEGER      NOT NULL   -- FK user.id (creator; for display + delete authz)
is_personal  BOOLEAN      NOT NULL DEFAULT 0  -- the auto-created Personal calendar cannot be deleted/shared in v1
created_at   DATETIME     NOT NULL
updated_at   DATETIME     NOT NULL

-- calendar_members  (join: calendar <-> user)
id           INTEGER PK AUTOINCREMENT
calendar_id  INTEGER      NOT NULL   -- FK calendars.id  ON DELETE CASCADE
user_id      INTEGER      NOT NULL   -- FK user.id       ON DELETE CASCADE
role         VARCHAR(10)  NOT NULL   -- 'owner' | 'member'  (v1: both have equal rights; role retained for v2 RBAC)
created_at   DATETIME     NOT NULL
UNIQUE (calendar_id, user_id)

-- calendar_invitations  (Phase 3 only)
id            INTEGER PK AUTOINCREMENT
calendar_id   INTEGER     NOT NULL   -- FK calendars.id ON DELETE CASCADE
inviter_id    INTEGER     NOT NULL   -- FK user.id
invitee_id    INTEGER     NOT NULL   -- FK user.id
status        VARCHAR(10) NOT NULL DEFAULT 'pending'  -- 'pending' | 'accepted' | 'declined'
created_at    DATETIME    NOT NULL
responded_at  DATETIME    NULL
UNIQUE (calendar_id, invitee_id)     -- one outstanding invite per user per calendar
```

### 3.2 Altered tables

```sql
ALTER TABLE calendar_events   ADD COLUMN calendar_id INTEGER NULL;  -- then backfill, then NOT NULL
ALTER TABLE recurring_events  ADD COLUMN calendar_id INTEGER NULL;  -- then backfill, then NOT NULL
```

- `calendar_events.user_id` is **kept** and reinterpreted as `created_by` (semantically), satisfying decision #5 and keeping the reminder scheduler untouched (decision #4).
- Same for `recurring_events.user_id`.
- Add index on `calendar_events.calendar_id` and `recurring_events.calendar_id` (the new hot filter).

### 3.3 The join-entity placement question

architecture.mdc allows join entities that model cross-domain relationships to live in `shared-kernel`. Here `calendar_members` joins calendar↔user. **Decision: keep it inside the `calendars` module** — the `calendars` domain owns membership semantics (roles, invite acceptance write here), so it is not an ownerless join. It references `user_id` as a bare integer FK, never importing the `User` class (no cross-domain entity pollution).

---

## 4. Phase plan (each independently shippable)

| Phase | Outcome | Visible to user? |
|-------|---------|------------------|
| **1** | Calendar entity + membership; every event backfilled into a per-user "Personal" calendar; all event queries switch from `user_id` to calendar-membership. | **No** — behaves identically. This de-risks the migration. |
| **2** | Create/rename/recolor/delete multiple calendars; calendar picker + per-calendar visibility in the UI. Still single-user. | Yes |
| **3** | Invite by username, accept/decline, members list, leave/revoke. | Yes |

The rest of this document specs every class per phase: **NEW** = create, **UPDATED** = modify existing.

---

## 5. PHASE 1 — Calendar entity + migration (invisible)

### 5.1 Database migrations (NEW)

Location: `backend/src/typeorm/migrations/` (numbered after `1777769518082`).

| File | Responsibility |
|------|----------------|
| `1780000000001-create-calendars-table.ts` | Create `calendars`. |
| `1780000000002-create-calendar-members-table.ts` | Create `calendar_members` + unique index `(calendar_id, user_id)`. |
| `1780000000003-add-calendar-id-to-calendar-events.ts` | Add nullable `calendar_id` to `calendar_events`. |
| `1780000000004-add-calendar-id-to-recurring-events.ts` | Add nullable `calendar_id` to `recurring_events`. |
| `1780000000005-backfill-personal-calendars.ts` | **Data migration** (see below). |
| `1780000000006-make-calendar-id-not-null.ts` | SQLite table-rebuild to enforce `NOT NULL` + FK + index on both event tables. |

**Backfill logic (`...005`), raw SQL inside `up()`:**

1. For each distinct `id` in `user`:
   - `INSERT INTO calendars (name, owner_id, is_personal, created_at, updated_at) VALUES ('Personal', :userId, 1, now, now)`.
   - `INSERT INTO calendar_members (calendar_id, user_id, role, created_at) VALUES (:newCalendarId, :userId, 'owner', now)`.
   - `UPDATE calendar_events  SET calendar_id = :newCalendarId WHERE user_id = :userId AND calendar_id IS NULL`.
   - `UPDATE recurring_events SET calendar_id = :newCalendarId WHERE user_id = :userId AND calendar_id IS NULL`.
2. `down()` reverses: null out `calendar_id`, delete members, delete `is_personal` calendars.

> SQLite cannot `ALTER COLUMN ... SET NOT NULL` in place. `...006` follows TypeORM's create-new-table → copy → drop → rename pattern, written explicitly. Run order matters: `001-004` (schema) → `005` (data) → `006` (constraint).

### 5.2 `calendars` module — domain entities (NEW, pure, no TypeORM)

`backend/src/calendars/domain/entities/`

| File | Class | Fields |
|------|-------|--------|
| `calendar.entity.ts` | `Calendar` | `id, name, color?, ownerId, isPersonal, createdAt, updatedAt` |
| `calendar-member.entity.ts` | `CalendarMember` | `id, calendarId, userId, role, createdAt` |
| `calendar-role.type.ts` | `CalendarRole` | `'owner' \| 'member'` (`as const` union) |

### 5.3 `calendars` module — infra entities (NEW, TypeORM)

`backend/src/calendars/infra/entities/`

| File | Class | Notes |
|------|-------|-------|
| `calendar.entity.ts` | `CalendarEntity` | `@Entity({ name: 'calendars' })`, snake_case `@Column` names mirroring §3.1. |
| `calendar-member.entity.ts` | `CalendarMemberEntity` | `@Entity({ name: 'calendar_members' })`, `@Index(['calendarId','userId'], { unique: true })`. Bare `user_id` int column — no `@ManyToOne` to `User` (cross-domain). |

### 5.4 `calendars` module — repositories (NEW)

`backend/src/calendars/infra/repositories/`

**`calendar.repository.ts` → `CalendarRepository`**
- `create(calendar: Partial<Calendar>, manager?): Promise<Calendar>`
- `findById(id: number): Promise<Calendar | null>`
- `findByOwnerId(ownerId: number): Promise<Calendar[]>`
- `findPersonalByUserId(userId: number): Promise<Calendar | null>`
- private `domainToInfrastructure` / `infrastructureToDomain`

**`calendar-member.repository.ts` → `CalendarMemberRepository`**
- `create(member: Partial<CalendarMember>, manager?): Promise<CalendarMember>`
- `findCalendarIdsByUserId(userId: number): Promise<number[]>`  ← the hot path for event queries
- `findByCalendarId(calendarId: number): Promise<CalendarMember[]>`
- `findOne(calendarId: number, userId: number): Promise<CalendarMember | null>`
- `delete(calendarId: number, userId: number): Promise<void>` (Phase 3)

### 5.5 `calendars` module — transaction scripts (NEW, Phase 1 subset)

`backend/src/calendars/domain/transaction-scripts/`

| Folder / file | Class | `apply(command)` does |
|---------------|-------|------------------------|
| `provision-personal-calendar-TS/provision-personal-calendar.transaction.script.ts` | `ProvisionPersonalCalendarTransactionScript` | Given `{ userId }`, if no personal calendar exists, create `Calendar(is_personal=1, owner=userId)` + `CalendarMember(role='owner')` in one transaction; return its id. Idempotent (safety net for migration + new registrations). |
| `provision-personal-calendar-TS/provision-personal-calendar.command.ts` | `ProvisionPersonalCalendarCommand` | `{ userId: number }` |

### 5.6 `calendars` module — Aggregator (NEW — the cross-domain port)

`backend/src/calendars/domain/aggregators/calendar-access.aggregator.ts` → **`CalendarAccessAggregator`**

This is the **only** way `calendar-events` (and `users`) touch calendar internals. Per rules, it injects repositories + transaction scripts, never another domain's service.

```ts
@Injectable()
export class CalendarAccessAggregator {
  constructor(
    private readonly calendarMemberRepository: CalendarMemberRepository,
    private readonly calendarRepository: CalendarRepository,
    private readonly provisionPersonalCalendarTransactionScript:
      ProvisionPersonalCalendarTransactionScript,
  ) {}

  /** Calendar ids the user may read/write. Phase 1: exactly [personalCalendarId]. */
  async getMemberCalendarIds(userId: number): Promise<number[]>;

  /** Throws/false if user is not a member — used to authorize writes to a target calendar. */
  async isMember(userId: number, calendarId: number): Promise<boolean>;

  /** Get-or-create the user's Personal calendar id. Safety net + registration hook. */
  async getOrCreatePersonalCalendarId(userId: number): Promise<number>;
}
```

Exported by `CalendarsModule`.

### 5.7 `calendars.module.ts` (NEW)

Registers `TypeOrmModule.forFeature([CalendarEntity, CalendarMemberEntity])`, providers (2 repos, 1 TS, 1 aggregator), and **exports `CalendarAccessAggregator`** (and the repos if needed). Imported by `CalendarEventsModule` and `UsersModule`.

### 5.8 UPDATED — `calendar-events` wiring to calendars

The migration's payoff: switch every event read/write from `user_id` to `calendar_id IN (...)`.

**Repositories (`infra/repositories/`)**

| File | Change |
|------|--------|
| `calendar-event.repository.ts` → `CalendarEventRepository` | `findByDateRange(userId,…)` → `findByDateRange(calendarIds: number[], start, end)` using `WHERE calendar_id IN (:...calendarIds)`. `findById(id,userId)` → `findById(id, calendarIds)`. `update(id,userId,…)` → `update(id, calendarIds, …)`. `delete(id,userId)` → `delete(id, calendarIds)`. `create` now stamps both `calendarId` + `userId` (creator). Add `calendarId` to both mappers. |
| `recurring-event.repository.ts` → `RecurringEventRepository` | Same treatment: queries by `calendar_id IN (...)`; `create` stamps `calendarId`; `updateReminderMinutes(recurringEventId, userId, …)` keeps `userId` (reminder ownership unchanged). Add `calendarId` to mappers. |

**Domain + infra entities**

| File | Change |
|------|--------|
| `calendar-events/domain/entities/calendar-event.entity.ts` (`CalendarEvent`) | add `calendarId: number` |
| `calendar-events/domain/entities/recurring-event.entity.ts` (`RecurringEvent`) | add `calendarId: number` |
| `calendar-events/infra/entities/calendar-event.entity.ts` (`CalendarEventEntity`) | add `@Column({ name: 'calendar_id', type: 'int' })` + index |
| `calendar-events/infra/entities/recurring-event.entity.ts` (`RecurringEventEntity`) | same |

**Commands (param objects)** — add resolved `calendarIds` / target `calendarId`.

| File | Change |
|------|--------|
| `fetch-calendar-events-TS/fetch-calendar-events.command.ts` | add `calendarIds: number[]` (resolved by service) |
| `fetch-calendar-event-TS/fetch-calendar-event.command.ts` | add `calendarIds: number[]` |
| `create-calendar-event-TS/create-calendar-event.command.ts` | add `calendarId: number` (target) |
| `update-calendar-event-TS/update-calendar-event.command.ts` | add `calendarIds: number[]` |
| `delete-calendar-event-TS/delete-calendar-event.command.ts` | add `calendarIds: number[]` |

**Transaction scripts** — swap the `user_id` filter/auth for calendar scoping. The old `if (command.userId !== command.user.userId)` ownership guard is **replaced** by membership (resolved upstream in the service via the aggregator).

| File | Change |
|------|--------|
| `fetch-calendar-events-TS/...transaction.script.ts` | call `repo.findByDateRange(command.calendarIds, …)`; drop the userId self-check. |
| `fetch-calendar-event-TS/...` | `repo.findById(id, command.calendarIds)` |
| `create-calendar-event-TS/...` | pass `calendarId: command.calendarId` + `userId: command.user.userId` to `repo.create`. |
| `update-calendar-event-TS/...` | `repo.update(id, command.calendarIds, …)` |
| `delete-calendar-event-TS/...` | `repo.delete(id, command.calendarIds)` |
| `fetch-recurring-events-TS/...` | fetch by `calendarIds` instead of `userId`. |
| `generate-event-instances-TS/...` | stamp `calendarId` from the recurring template onto generated instances. |

**Domain service — `CalendarEventService` (the cross-domain seam)**

Inject `CalendarAccessAggregator`. Resolve calendar scope before delegating to TSs:

- `fetchCalendarEvents`: `const calendarIds = await aggregator.getMemberCalendarIds(command.user.userId);` → put on command → pass to `fetchRecurringEventsTransactionScript` and `fetchCalendarEventsTransactionScript`.
- `createCalendarEvent`: default `calendarId = command.calendarId ?? await aggregator.getOrCreatePersonalCalendarId(userId)`; assert `aggregator.isMember(userId, calendarId)`.
- `update` / `delete` / `fetchById`: resolve `calendarIds` and assert membership.

This keeps cross-domain logic in the **service via the aggregator** (rules-compliant) and leaves transaction scripts pure/in-domain.

**Actions** — minimal change in Phase 1. `FetchCalendarEventsAction`, `CreateCalendarEventAction`, etc. still build commands from `@GetAuthUser()`; they do **not** call the aggregator (actions can't). They optionally accept a `calendarId` body/query param (defaulted in the service to the Personal calendar) so Phase 2 is a no-op on the wire.

**Module — `calendar-events.module.ts`**: add `imports: [CalendarsModule]` so `CalendarAccessAggregator` is injectable into `CalendarEventService`.

### 5.9 UPDATED — registration provisioning (`users` module)

New users must get a Personal calendar.

| File | Change |
|------|--------|
| `users/users.module.ts` | `imports: [CalendarsModule]` |
| `users/domain/users.service.ts` | after `register(...)` creates the user, call `calendarAccessAggregator.getOrCreatePersonalCalendarId(newUser.id)`. (Inject the aggregator — service→aggregator is allowed.) |

Existing users are covered by the backfill migration; the get-or-create aggregator is the safety net for any gaps.

### 5.10 Frontend (Phase 1)

**No visible change, no required edits.** Each user sees exactly one Personal calendar, so the existing `GET /calendar-events` returns the same rows. The DTO may gain an optional `calendarId` field (additive, ignored by current UI).

### 5.11 Phase 1 verification gate

- New migrations run clean on a **copy** of the production SQLite DB; `SELECT count(*)` on `calendar_events` unchanged; zero rows with `calendar_id IS NULL`.
- Every user has exactly one `is_personal=1` calendar and a matching `owner` membership row.
- Existing calendar-event unit/integration specs pass with the new signatures (specs in `__specs__/` updated for the `calendarIds` params).
- Reminder scheduler still fires (unchanged code path; reminders still key off `user_id`).

---

## 6. PHASE 2 — Multiple calendars + UI (single-user)

### 6.1 Backend (NEW transaction scripts + actions in `calendars`)

| Use case | TS (`domain/transaction-scripts/`) | Action (`apps/actions/`) | Route |
|----------|-----------------------------------|--------------------------|-------|
| Create calendar | `create-calendar-TS` → `CreateCalendarTransactionScript` | `create-calendar-action` | `POST /calendars` |
| List my calendars | `fetch-calendars-TS` → `FetchCalendarsTransactionScript` | `fetch-calendars-action` | `GET /calendars` |
| Rename / recolor | `update-calendar-TS` → `UpdateCalendarTransactionScript` | `update-calendar-action` | `PATCH /calendars/:id` |
| Delete calendar | `delete-calendar-TS` → `DeleteCalendarTransactionScript` | `delete-calendar-action` | `DELETE /calendars/:id` |

- New **`CalendarService`** (`calendars/domain/services/calendar.service.ts`) orchestrates the above TSs; actions call it.
- Rules: cannot delete `is_personal` calendar; deleting a calendar cascades members + events (FK `ON DELETE CASCADE`), or in v1 blocks delete if it still has events — **decide at build time; recommend block-if-nonempty for safety.**
- `CreateCalendarTransactionScript.apply` creates the calendar **and** an `owner` membership row (transaction).

### 6.2 `calendar-events` changes

- Actions accept an explicit `calendarId` on create (which calendar the event lands in), validated by `CalendarEventService` via `aggregator.isMember`.
- `getMemberCalendarIds` now legitimately returns multiple ids; the fetch already unions them — **no further query change** (the Phase 1 plumbing already handles N calendars).

### 6.3 Frontend (NEW/UPDATED)

| File (approx.) | Change |
|----------------|--------|
| `frontend/src/api/requests/calendars.requests.ts` (NEW) | CRUD calls to `/calendars`. |
| `frontend/src/api/dtos/calendars.dtos.ts` (NEW) | Calendar DTO types. |
| `frontend/src/contexts/CalendarContext.tsx` (UPDATED) | track list of calendars + per-calendar visibility toggles; thread `calendarId` into create. |
| Calendar sidebar/picker component (NEW) | list calendars, toggle visibility, color dots, create/rename/delete. |
| `CalendarPage.tsx` + event-create form (UPDATED) | choose target calendar; color events by calendar. |

---

## 7. PHASE 3 — Sharing (invite / accept / revoke)

### 7.1 Backend — entities & repo (NEW)

- `calendars/domain/entities/calendar-invitation.entity.ts` → `CalendarInvitation` (+ `infra/entities/calendar-invitation.entity.ts`).
- `calendars/infra/repositories/calendar-invitation.repository.ts` → `CalendarInvitationRepository`: `create`, `findPendingByInviteeId`, `findById`, `updateStatus`, `findOutstanding(calendarId, inviteeId)`.

### 7.2 Backend — transaction scripts + actions (NEW)

| Use case | TS | Action | Route |
|----------|----|--------|-------|
| Invite a user by username | `invite-member-TS` → `InviteMemberTransactionScript` | `invite-member-action` | `POST /calendars/:id/invitations` |
| List my pending invitations | `fetch-invitations-TS` | `fetch-invitations-action` | `GET /calendar-invitations` |
| Accept / decline | `respond-to-invitation-TS` → `RespondToInvitationTransactionScript` | `respond-to-invitation-action` | `POST /calendar-invitations/:id/respond` |
| List members | `fetch-members-TS` | `fetch-members-action` | `GET /calendars/:id/members` |
| Remove member / leave | `remove-member-TS` → `RemoveMemberTransactionScript` | `remove-member-action` | `DELETE /calendars/:id/members/:userId` |

Orchestrated by a new **`CalendarSharingService`** (`calendars/domain/services/calendar-sharing.service.ts`).

**Key business rules:**
- Invite resolves username → userId via `UserAggregator` (cross-domain, allowed in a service/aggregator). Reject: self-invite, already-member, duplicate outstanding invite, sharing a `is_personal` calendar (block — personal stays private; user must create a normal calendar to share).
- `RespondToInvitationTransactionScript.apply` on **accept**: set status `accepted`, `responded_at`, and insert `CalendarMember(role='member')` — one transaction. On **decline**: status only.
- **Remove/leave (decision #5):** delete the `calendar_members` row only. Events created by that user **stay** (their `user_id`/`created_by` is now just a historical label; the calendar still owns them). `getMemberCalendarIds` stops returning the calendar for them on next fetch.
- Authz: only an existing member may invite (v1: any member, since co-ownership). Only owner may delete the whole calendar (Phase 2) or remove others; any member may remove themselves (leave).

### 7.3 `UserAggregator` (UPDATED, `users` module)

Add `findUserIdByUsername(username: string): Promise<number | null>` if not present, exposed for `CalendarSharingService` to resolve invites. (Confirm at build time whether an equivalent already exists.)

### 7.4 Frontend (NEW/UPDATED)

| File (approx.) | Change |
|----------------|--------|
| Share modal component (NEW) | enter username → POST invitation; show members + pending invites; remove/leave. |
| Invitations inbox component (NEW) | list pending invites with Accept/Decline. |
| `frontend/src/api/requests/calendar-invitations.requests.ts` (NEW) | invite/respond/list calls. |
| `CalendarContext` (UPDATED) | shared calendars appear in the calendar list after accept; "created by" label on events. |
| Calendar picker (UPDATED) | badge/icon for shared calendars; show member avatars. |

---

## 8. File inventory summary

### NEW — backend `calendars` module
```
calendars/
  apps/actions/
    create-calendar-action/        (P2)
    fetch-calendars-action/        (P2)
    update-calendar-action/        (P2)
    delete-calendar-action/        (P2)
    invite-member-action/          (P3)
    fetch-invitations-action/      (P3)
    respond-to-invitation-action/  (P3)
    fetch-members-action/          (P3)
    remove-member-action/          (P3)
  apps/dtos/responses/
    calendar.response.dto.ts                (P2)
    calendar-invitation.response.dto.ts     (P3)
    calendar-member.response.dto.ts         (P3)
  domain/entities/
    calendar.entity.ts                      (P1)
    calendar-member.entity.ts               (P1)
    calendar-role.type.ts                   (P1)
    calendar-invitation.entity.ts           (P3)
  domain/services/
    calendar.service.ts                     (P2)
    calendar-sharing.service.ts             (P3)
  domain/aggregators/
    calendar-access.aggregator.ts           (P1)
  domain/transaction-scripts/
    provision-personal-calendar-TS/         (P1)
    create-calendar-TS/                     (P2)
    fetch-calendars-TS/                     (P2)
    update-calendar-TS/                     (P2)
    delete-calendar-TS/                     (P2)
    invite-member-TS/                       (P3)
    fetch-invitations-TS/                   (P3)
    respond-to-invitation-TS/               (P3)
    fetch-members-TS/                       (P3)
    remove-member-TS/                       (P3)
  infra/entities/
    calendar.entity.ts                      (P1)
    calendar-member.entity.ts               (P1)
    calendar-invitation.entity.ts           (P3)
  infra/repositories/
    calendar.repository.ts                  (P1)
    calendar-member.repository.ts           (P1)
    calendar-invitation.repository.ts       (P3)
  calendars.module.ts                       (P1)
```

### NEW — migrations (P1)
`1780000000001` … `1780000000006` (see §5.1).

### UPDATED — backend
```
calendar-events/calendar-events.module.ts                 (import CalendarsModule)             P1
calendar-events/domain/services/calendar-event.service.ts (inject CalendarAccessAggregator)    P1
calendar-events/domain/entities/calendar-event.entity.ts  (+calendarId)                        P1
calendar-events/domain/entities/recurring-event.entity.ts (+calendarId)                        P1
calendar-events/infra/entities/calendar-event.entity.ts   (+calendar_id column/index)          P1
calendar-events/infra/entities/recurring-event.entity.ts  (+calendar_id column/index)          P1
calendar-events/infra/repositories/calendar-event.repository.ts   (calendarIds queries)        P1
calendar-events/infra/repositories/recurring-event.repository.ts  (calendarIds queries)        P1
calendar-events/domain/transaction-scripts/*  (5 event TSs + commands + recurring + generate)  P1
calendar-events/apps/actions/*-calendar-event-action/*  (optional calendarId param)            P1/P2
users/users.module.ts                                     (import CalendarsModule)             P1
users/domain/users.service.ts                             (provision personal calendar)        P1
users/domain/aggregators/user.aggregator.ts               (findUserIdByUsername)               P3
calendar-events/.../__specs__/*                           (update for new signatures)          P1
```

### NEW / UPDATED — frontend
```
api/requests/calendars.requests.ts              NEW   P2
api/requests/calendar-invitations.requests.ts   NEW   P3
api/dtos/calendars.dtos.ts                       NEW   P2
contexts/CalendarContext.tsx                     UPD   P2/P3
pages/CalendarPage/* + event form               UPD   P2
calendar picker / sidebar component             NEW   P2
share modal + invitations inbox components      NEW   P3
```

---

## 9. Risks & open build-time decisions

1. **The migration is the whole risk.** `006` (NOT NULL via table rebuild) on SQLite is fiddly; dry-run on a DB copy is mandatory before merge.
2. **Delete-calendar with events** (P2): recommend *block if non-empty* rather than cascade-delete events, to avoid accidental data loss. Confirm when building P2.
3. **Personal calendar is unshareable & undeletable** in v1 — enforced by `is_personal`. Confirm that's the desired guard.
4. **Reminders deliberately not fanned out** (decision #4): a shared event created by user A reminds only A. Revisit in a later phase once a real `email` field replaces the username-as-email hack.
5. **`update_at`/timestamps**: follow the existing `@CreateDateColumn`/`@UpdateDateColumn` convention already used in event entities.
```
```

---

## 10. Recommended first PR

Phase 1 only, on a branch off `main`, in this order: migrations → `calendars` module (entities/repos/aggregator/provision TS) → rewire `calendar-events` repos+service+TSs → users provisioning → update specs → **dry-run migration on a DB copy** → verify gate (§5.11). Nothing user-visible ships, but the data model is now shareable.
