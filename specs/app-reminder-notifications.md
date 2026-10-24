# Reminder Notifications in the Android App

Status: built 2026-10-23, waiting on a check on a real phone (see Manual verification)
Branch: `android-app-2`

The server emails every reminder. This adds the same reminders as notifications on the
Android app, scheduled on the phone itself. It's Step 2's "local reminder notifications"
from `specs/offline-apps.md`.

## Why on the phone, not push

The user wants notifications but not Firebase (2026-10-15). Push needs a Firebase
project, `google-services.json` and a server credential. The parked `push-notifications`
branch did that for the old Capacitor app.

The phone already holds what it needs. Offline mode stores every event from 3 months
back to 12 months ahead, each with its `reminders` (the list endpoint returns them), and
refreshes every 30 minutes. `tauri-plugin-notification` (already installed) can schedule
a notification for a set time on Android. The scheduled notifications survive the app
being closed, and the phone restarting.

## Decisions

### D1. What's scheduled

Every reminder on the stored events that falls due in the next 14 days, soonest first,
at most 200 (Android allows an app 500 pending alarms). Reminders due in under 10 seconds
are left to the email. Text: the event's title, then e.g. "In 30 minutes · 3:00 PM",
"In 1 day · Tomorrow, 3:00 PM", "Starting now · 3:00 PM".

Each notification's id is the reminder's server id. A reminder created offline has a
negative temp id and gets one from `[1.5e9, 2.1e9)` instead, so the ids never collide.
Its `extra` carries the event id, start date, and a signature of the time and wording.

All events count, the user's own and shared calendars' alike, hidden or not. That
matches who gets the email (`specs/reminder-fanout.md`).

### D2. When it reschedules

A pass reads the stored events, plans, and reconciles with Android's pending list:
- it cancels a notification whose reminder is gone, or whose signature changed;
- it schedules what's due in the window but missing;
- it leaves everything else alone.

A pending notification that still matches its reminder is kept, whatever its time. One
due in the next 10 seconds, or due but not yet shown, isn't in the window any more.
Cancelling it would lose it, and the plugin's cancel also clears a shown notification.

On Android the app schedules nothing but reminders, so every pending notification is one.

Passes run:
- at launch, with reminders on and someone logged in;
- every 5 minutes while the app runs, which picks up the 30-minute prefetch;
- when the app comes back to the foreground;
- a second after a mutation succeeds;
- a second after a calendar-event query refetches. This catches new events, because the
  offline layer only stores a create made online once the list is fetched again.

Passes run one at a time. Calls made before a pass starts share it.

The offline layer is Chronus's copy and stays untouched (D4 there). The reminders code
reads the `omega-offline` database through its own read-only `createOfflineStore()`.

### D3. Delivery

- **Channel:** `reminders`, high importance.
- **Status bar icon:** `ic_stat_omega` (white mark on transparent, from `npm run icons`).
  Without it, Android shows a generic "i".
- **Doze:** scheduled with `allowWhileIdle`, so they fire while the phone is idle.
- **Exact alarms:** `AndroidManifest.xml` asks for `USE_EXACT_ALARM` (granted at install
  on Android 13+; the app is sideloaded, and calendar apps qualify on Play anyway) and
  `SCHEDULE_EXACT_ALARM` up to API 32 (granted by default on 12 and 12L). Without them,
  the plugin falls back to inexact alarms, which Android can deliver minutes late.

### D4. Permission, the setting, and signing out

- **Permission:** Android 13+ asks for notification permission once, at the first launch
  with reminders on. After a no, Settings → Reminders shows a button to ask again, and
  points to Android's settings once Android stops asking.
- **The setting:** Settings → Reminders has an on/off switch, on by default, per device
  (localStorage `omega.reminder-notifications`). Off cancels everything.
- **Signing out** cancels everything, so another user's reminders never fire.

### D5. Tapping a notification

It opens the calendar on the event's details, the way picking a search result does. The
route state (`CalendarRouteState`) is cleared once used.

## Limits

- **Other people's changes arrive late.** Changes made elsewhere (the website, another
  member of a shared calendar) reach the phone only when it syncs. A reminder for an
  event someone else added or moved isn't scheduled, or moved, until then. An event
  deleted elsewhere can still fire.
- **Email still goes out**, so a reminder arrives twice: once on the phone, once by email.
- **Android only.** On desktop, the plugin shows a "scheduled" notification immediately.
  Desktop reminders would need timers while the app runs.
- **Taps after a cold start.** If Android had closed the app, a tap only opens it, not
  the event. The plugin reports the tap while it loads, before anything listens.

## Plugin quirks (tauri-plugin-notification 2.7.0)

- **Fractional seconds.** The time goes from JS to Rust to Kotlin as text. Rust writes
  nine decimal places; Kotlin's `yyyy-MM-dd'T'HH:mm:ss.SSS'Z'` reads all of them as
  milliseconds. So `.500` would become 500,000,000 ms, about 6 days. Times are always
  whole seconds (`planReminders`).
- **Missing type.** `pending()` returns each notification's `extra` on Android, though
  its TypeScript type leaves it out.

## Files

- `frontend/src/tauri/reminder-notifications.ts`: planning, wording, reconciling (pure,
  tested).
- `frontend/src/tauri/reminder-device.ts`: the plugin, the store, and the queue (tested
  with the plugin mocked).
- `frontend/src/tauri/ReminderNotifications.tsx`: when passes run, the permission ask,
  and taps. Mounted in `App.tsx` on Android only, as its own chunk.
- `frontend/src/tauri/reminder-setting.ts`: the on/off setting.
- `frontend/src/pages/SettingsPage/components/ReminderSettings/`: the Settings section.
- `frontend/src/pages/CalendarPage/calendar-route-state.ts`: tap to open an event.
- `frontend/src-tauri/gen/android/app/src/main/AndroidManifest.xml` and
  `res/drawable-*/ic_stat_omega.png`.

## Manual verification (on the phone)

1. **Install** the CI APK over the current one. On first launch after login, Android 13+
   asks to allow notifications. Allow.
2. **Schedule.** Create an event starting in 20 minutes, with a 15-minute reminder.
   Settings → Reminders counts it.
3. **Fires.** Lock the phone and wait. The notification arrives on time, with the Omega
   icon, the title, and "In 15 minutes · <time>".
4. **Tap.** With the app in the background, tapping it opens the event's details.
5. **Moves.** Move an event that has a reminder. Only the moved time fires.
6. **Delete.** Delete an event that has a reminder. Nothing fires.
7. **Turn off.** Turn reminders off in Settings. The count disappears, and nothing fires.
8. **Restart.** Restart the phone with a reminder pending. It still fires.
