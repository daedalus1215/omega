# Reminder Fan-Out to Calendar Members — Technical Specification

Status: Approved — implementing
Author: design session (2026-09-21)
Branch: `fan-out-notifications` (off `main`)

---

## 1. Problem

Reminders are delivered to the event's **creator** (`calendar_events.user_id`),
not to the calendar's members. `ReminderScheduler.resolveUserEmail(event)`
resolves `event.userId` → username → email and sends a single mail.

Consequences on shared calendars (full co-ownership, v1):

- A human member adds a reminder to an event another member created → only the
  creator is notified.
- A non-human account (e.g. an assistant bot) that owns events on a shared
  calendar is a dead end: its username is not an email address, so the reminder
  is skipped with a warning and nobody is notified.

## 2. Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Unit of delivery | **The calendar's members.** Every member of the event's calendar receives the reminder. The owner is always a member row, so creator delivery is subsumed — no special case. |
| 2 | Who resolves who | The calendars module exposes member *user ids* (`CalendarAccessAggregator.getMemberUserIds`); calendar-events resolves ids → usernames via the existing `UserAggregator` and keeps the username-is-email rule. **No new module wiring**: `CalendarsModule` already exports the aggregator and `CalendarEventsModule` already imports it (`forwardRef`). |
| 3 | Members without a usable address | Skipped with a warning (existing `isValidEmail` rule). A bot account whose username is not an email is skipped, not an error. |
| 4 | Zero usable recipients | The reminder is not retired early; it stays a candidate until the grace period expires — exactly the existing semantics when no user/email can be resolved. |
| 5 | Partial send failure | The reminder is marked sent only when **every** recipient succeeded. Any failure leaves it unsent so the next tick retries (existing at-least-once semantics). Known cost: recipients already delivered in a partially-failed tick get a duplicate on retry. Bounded by the grace period; accepted for v1. Per-recipient sent-tracking is a v2 refinement. |
| 6 | Query shape | One membership query per event (existing `findByCalendarId`), then one `findUsernameById` per member. Member counts are small (1–5); no batching in v1. |

## 3. Behavior (post-change)

For each due reminder the scheduler:

1. Loads the event (existing, unchanged).
2. Resolves `event.calendarId` → member user ids → usernames → valid emails.
3. Sends the reminder email to each address.
4. Marks the reminder sent **iff** every send succeeded.
5. Logs one summary line with the recipient count (replaces the single-address line).

## 4. File-by-file

### 4.1 UPDATED `calendars/domain/aggregators/calendar-access.aggregator.ts`

New method:

```ts
async getMemberUserIds(calendarId: number): Promise<number[]>
```

Maps the existing `CalendarMemberRepository.findByCalendarId(calendarId)` to
`userId` values. **No repository change** — `findByCalendarId` already returns
the full membership list.

### 4.2 UPDATED `calendar-events/apps/schedulers/reminder-scheduler/reminder.scheduler.ts`

- Constructor gains `CalendarAccessAggregator` (injected between `userAggregator` and `emailService`).
- `resolveUserEmail(event): Promise<string | null>` is replaced by
  `resolveMemberEmails(event): Promise<string[]>` — member ids → usernames →
  valid emails, with a warning per skipped member.
- Cron loop: `userEmail` (singular) → `memberEmails` (array); per-recipient
  send in a loop; `markAsSent` only when all delivered; summary log with the
  recipient count and the existing late-delivery suffix.
- `isValidEmail` and the grace/retire logic are unchanged.

### 4.3 UPDATED `calendar-events/apps/schedulers/reminder-scheduler/__specs__/reminder.scheduler.spec.ts`

- New mock: `CalendarAccessAggregator`, defaulting to
  `getMemberUserIds → [USER_ID]` so every existing case keeps its meaning.
- The existing "skip non-email username" and "user not found" cases now run
  through the member path; their assertions are unchanged.
- New `fan-out` describe block:
  - delivers to every member whose username is a valid email (2 humans → 2 sends, 1 `markAsSent`);
  - skips a bot-like member (non-email username) while delivering to the human member;
  - does not mark sent when one of several recipients fails (retry on next tick);
  - sends nothing and marks nothing when no member has a usable address.

## 5. Invariants

- **F1** No reminder email is ever sent to a non-member of the event's calendar.
- **F2** `markAsSent` is called exactly when (a) all resolved recipients were
  delivered, or (b) the reminder is past the grace period (existing retire
  path). Otherwise it stays unsent for the next tick.
- **F3** Delivery never consults `event.userId` directly — membership is the
  only source of recipients. `created_by` remains a label, per shared-calendars
  decision #5.
- **F4** No schema change, no migration, no new module dependency or cycle.

## 6. Verification

- `reminder.scheduler.spec.ts` green (existing + new fan-out cases).
- `tsc` clean.
- Deploy to dev, then watch `docker logs` for the scheduler: with dev's
  deliberately unroutable SMTP, a due reminder on a shared calendar logs one
  **per-recipient** line — that is the observable proof the fan-out targets the
  right members. Real mail delivery is only observable on prod2 (real SMTP).

## 7. Out of scope (v2)

- Per-recipient sent tracking (`reminder_recipients` join) to avoid duplicates
  on partial failure.
- Batching `findUsernameById` into one query.
- Recipient caps for large calendars.
