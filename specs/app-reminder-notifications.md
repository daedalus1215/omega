# Reminder Notifications in the Android App

Status: built 2026-10-23 and in use. Reworked 2026-10-24 (branch `reminder-alarms`) after
reminders were lost on a restart: the app now sets its own alarms (D6). Waiting on a check
on a real phone (see Manual verification).

The server emails every reminder. This adds the same reminders as notifications on the
Android app, scheduled on the phone itself. It's Step 2's "local reminder notifications"
from `specs/offline-apps.md`.

## Why on the phone, not push

The user wants notifications but not Firebase (2026-10-15). Push needs a Firebase
project, `google-services.json` and a server credential. The parked `push-notifications`
branch did that for the old Capacitor app.

The phone already holds what it needs. Offline mode stores every event from 3 months
back to 12 months ahead, each with its `reminders` (the list endpoint returns them), and
refreshes every 30 minutes. The phone sets an alarm for each reminder, and shows the
notification when it goes off. The alarms survive the app being closed; after a restart
they're set again (D6).

## Decisions

### D1. What's scheduled

Every reminder on the stored events that falls due in the next 14 days, soonest first,
at most 200 (Android allows an app 500 pending alarms). Reminders due in under 10 seconds
are left to the email. Text: the event's title, then e.g. "In 30 minutes · 3:00 PM",
"In 1 day · Tomorrow, 3:00 PM", "Starting now · 3:00 PM".

Each notification's id is the reminder's server id. A reminder created offline has a
negative temp id and gets one from `[1.5e9, 2.1e9)` instead, so the ids never collide.
The phone keeps each one's event id, start date, and a signature of the time and wording.

All events count, the user's own and shared calendars' alike, hidden or not. That
matches who gets the email (`specs/reminder-fanout.md`).

### D2. When it reschedules

A pass reads the stored events, plans, and reconciles with the reminders the phone has
scheduled that haven't shown yet:
- it cancels a notification whose reminder is gone, or whose signature changed;
- it schedules what's due in the window but missing;
- it leaves everything else alone.

A scheduled reminder that still matches is kept, whatever its time. One due in the next
10 seconds, or due but not yet shown, isn't in the window any more. Cancelling it would
lose it.

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

- **Channel:** `reminders`, high importance, created by the app's Android code.
- **Status bar icon:** `ic_stat_omega` (white mark on transparent, from `npm run icons`).
- **Doze:** the alarms are `setExactAndAllowWhileIdle`, so they go off while the phone is
  idle.
- **Exact alarms:** `AndroidManifest.xml` asks for `USE_EXACT_ALARM` (granted at install
  on Android 13+; the app is sideloaded, and calendar apps qualify on Play anyway) and
  `SCHEDULE_EXACT_ALARM` up to API 32 (granted by default on 12 and 12L). Without them,
  the alarms fall back to inexact ones, which Android can deliver minutes late.

### D4. Permission, the setting, and signing out

- **Permission:** Android 13+ asks for notification permission once, at the first launch
  with reminders on (through the notification plugin, still used for this). After a no,
  Settings → Reminders shows a button to ask again, and points to Android's settings once
  Android stops asking.
- **The setting:** Settings → Reminders has an on/off switch, on by default, per device
  (localStorage `omega.reminder-notifications`). Off cancels everything.
- **Signing out** cancels everything, so another user's reminders never fire.

### D5. Tapping a notification

It opens the calendar on the event's details, the way picking a search result does. The
route state (`CalendarRouteState`) is cleared once used.

This works whether or not the app was running. Android keeps the tap (RemindersPlugin)
until the web app takes it: at startup for a tap that started the app, and on a `tapped`
event for one while it runs.

### D6. The app's own alarms, not the plugin's

The first build scheduled through `tauri-plugin-notification` (2.7.0, the latest, and
upstream's main branch is the same). On Android, its `show` command, which
`sendNotification` reaches, schedules the alarm but never saves the notification. And the
`sourceJson` field it saves and hands to taps is never set. So:
- after a restart, its boot receiver had nothing to restore, and the reminders were lost
  (seen on a phone, 2026-10-24);
- `pending()` was always empty, so a deleted event's reminder was never cancelled, nor
  were any on sign-out or with reminders turned off, and Settings counted 0;
- a tap reported no notification, so it only opened the app.

Patching the plugin would mean carrying a copy of it. Its saved notifications are also
read back with a JSON mapper that rejects fields the plugin doesn't know, in the receiver
that shows them, so a fix there could stop them showing at all. Instead the app has a
small plugin of its own (`RemindersPlugin`, registered in `src/reminders.rs`):
- `schedule`, `cancel`, `list` and `take_tap` commands, plus a `tapped` event;
- each reminder saved in SharedPreferences, with an alarm per reminder;
- on a restart (and an app update), the alarms are set again. One due while the phone was
  off shows straight away, unless its event has started.

The notification plugin stays for the permission. The first pass after updating cancels
the old build's alarms once (localStorage `omega.reminder-plugin-alarms-cleared`), or they
would go off alongside the new ones until the next restart.

## Limits

- **Other people's changes arrive late.** Changes made elsewhere (the website, another
  member of a shared calendar) reach the phone only when it syncs. A reminder for an
  event someone else added or moved isn't scheduled, or moved, until then. An event
  deleted elsewhere can still fire.
- **Email still goes out**, so a reminder arrives twice: once on the phone, once by email.
- **Android only.** Desktop reminders would need timers while the app runs.
- **Missed while off.** A reminder that came due while the phone was off shows after the
  restart, with its original wording ("In 30 minutes"), if its event hasn't started.

## Files

- `frontend/src/tauri/reminder-notifications.ts`: planning, wording, reconciling (pure,
  tested).
- `frontend/src/tauri/reminder-device.ts`: the reminders plugin, the permission, the
  store, and the queue (tested with the plugins mocked).
- `frontend/src/tauri/ReminderNotifications.tsx`: when passes run, the permission ask,
  and taps. Mounted in `App.tsx` on Android only, as its own chunk.
- `frontend/src/tauri/reminder-setting.ts`: the on/off setting.
- `frontend/src/pages/SettingsPage/components/ReminderSettings/`: the Settings section.
- `frontend/src/pages/CalendarPage/calendar-route-state.ts`: tap to open an event.
- `frontend/src-tauri/gen/android/app/src/main/java/com/omega/app/`:
  `RemindersPlugin.kt` (the commands, taps) and `ReminderAlarms.kt` (saving, alarms,
  showing, restoring after a restart).
- `frontend/src-tauri/src/reminders.rs`, `build.rs` and `capabilities/default.json`:
  registering the plugin and allowing its commands.
- `frontend/src-tauri/gen/android/app/src/main/AndroidManifest.xml` (permissions, the two
  receivers) and `res/drawable-*/ic_stat_omega.png`.

## Manual verification (on the phone)

1. **Install** the CI APK over the current one. On first launch after login, Android 13+
   asks to allow notifications. Allow.
2. **Schedule.** Create an event starting in 20 minutes, with a 15-minute reminder.
   Settings → Reminders counts it.
3. **Fires.** Lock the phone and wait. The notification arrives on time, with the Omega
   icon, the title, and "In 15 minutes · <time>".
4. **Tap.** With the app in the background, tapping it opens the event's details. Then
   close the app (swipe it away) and tap another: the app starts on that event.
5. **Moves.** Move an event that has a reminder. Only the moved time fires.
6. **Delete.** Delete an event that has a reminder. Nothing fires.
7. **Turn off.** Turn reminders off in Settings. The count disappears, and nothing fires.
8. **Restart.** Restart the phone with a reminder pending, and don't open the app. It
   still fires.
