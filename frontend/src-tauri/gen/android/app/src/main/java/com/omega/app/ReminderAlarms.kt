package com.omega.app

import android.annotation.SuppressLint
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONObject

/**
 * A reminder notification, as the web app plans it
 * (src/tauri/reminder-notifications.ts).
 */
data class Reminder(
  val id: Int,
  /** When to show it, in ms since the epoch. */
  val at: Long,
  /** When the event starts. One missed while the phone was off still shows until then. */
  val start: Long,
  val title: String,
  val body: String,
  /** Its time and wording; the web app compares them to find what changed. */
  val signature: String,
  /** Handed back to the web app when it's tapped. */
  val data: String,
) {
  fun toJson(): JSONObject = JSONObject()
    .put("id", id)
    .put("at", at)
    .put("start", start)
    .put("title", title)
    .put("body", body)
    .put("signature", signature)
    .put("data", data)

  companion object {
    fun fromJson(json: JSONObject) = Reminder(
      id = json.getInt("id"),
      at = json.getLong("at"),
      start = json.getLong("start"),
      title = json.getString("title"),
      body = json.getString("body"),
      signature = json.getString("signature"),
      data = json.getString("data"),
    )
  }
}

/**
 * Scheduled reminders that haven't shown yet. Alarms don't survive a
 * restart; these are set again from here (ReminderBootReceiver).
 */
class ReminderStore(context: Context) {
  private val prefs = context.getSharedPreferences("reminders", Context.MODE_PRIVATE)

  fun all(): List<Reminder> = prefs.all.keys.mapNotNull { get(it) }

  fun get(id: Int): Reminder? = get(id.toString())

  private fun get(key: String): Reminder? = try {
    prefs.getString(key, null)?.let { Reminder.fromJson(JSONObject(it)) }
  } catch (e: Exception) {
    null
  }

  // commit, not apply: a receiver's process can end as soon as it returns.
  fun put(reminders: List<Reminder>) {
    val editor = prefs.edit()
    reminders.forEach { editor.putString(it.id.toString(), it.toJson().toString()) }
    editor.commit()
  }

  fun remove(ids: List<Int>) {
    val editor = prefs.edit()
    ids.forEach { editor.remove(it.toString()) }
    editor.commit()
  }
}

/**
 * Event reminders as notifications, each on its own alarm
 * (specs/app-reminder-notifications.md).
 */
object ReminderAlarms {
  private const val CHANNEL_ID = "reminders"
  const val ACTION_TAPPED = "com.omega.app.REMINDER_TAPPED"
  const val EXTRA_DATA = "com.omega.app.REMINDER_DATA"
  const val EXTRA_ID = "com.omega.app.REMINDER_ID"

  fun createChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Event reminders",
      NotificationManager.IMPORTANCE_HIGH
    )
    channel.description = "The reminders set on your events"
    channel.lockscreenVisibility = Notification.VISIBILITY_PRIVATE
    channel.enableVibration(true)
    (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
      .createNotificationChannel(channel)
  }

  fun schedule(context: Context, reminders: List<Reminder>) {
    ReminderStore(context).put(reminders)
    reminders.forEach { setAlarm(context, it.id, it.at) }
  }

  fun cancel(context: Context, ids: List<Int>) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    ids.forEach { alarmManager.cancel(alarmIntent(context, it)) }
    ReminderStore(context).remove(ids)
  }

  /** Sets the alarms again after a restart, which clears them. */
  fun restore(context: Context) {
    val store = ReminderStore(context)
    val now = System.currentTimeMillis()
    val over = mutableListOf<Int>()
    for (reminder in store.all()) {
      when {
        reminder.at > now -> setAlarm(context, reminder.id, reminder.at)
        // Due while the phone was off: show it now, unless the event has started.
        reminder.start > now -> setAlarm(context, reminder.id, now)
        else -> over.add(reminder.id)
      }
    }
    store.remove(over)
  }

  @SuppressLint("MissingPermission")
  fun show(context: Context, reminder: Reminder) {
    createChannel(context)
    val tap = Intent(context, MainActivity::class.java)
      .setAction(ACTION_TAPPED)
      .putExtra(EXTRA_DATA, reminder.data)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_omega)
      .setContentTitle(reminder.title)
      .setContentText(reminder.body)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setPriority(NotificationCompat.PRIORITY_HIGH)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .setAutoCancel(true)
      .setContentIntent(
        PendingIntent.getActivity(
          context,
          reminder.id,
          tap,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      )
      .build()
    try {
      NotificationManagerCompat.from(context).notify(reminder.id, notification)
    } catch (e: SecurityException) {
      // Notifications aren't allowed. The server's email still goes out.
    }
  }

  private fun setAlarm(context: Context, id: Int, at: Long) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val intent = alarmIntent(context, id)
    // Exact, even in Doze, with the permission from AndroidManifest.xml.
    // Without it, Android can deliver it minutes late.
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
      alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent)
    } else {
      alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent)
    }
  }

  // One per reminder: the request code tells them apart (extras don't).
  private fun alarmIntent(context: Context, id: Int): PendingIntent = PendingIntent.getBroadcast(
    context,
    id,
    Intent(context, ReminderAlarmReceiver::class.java).putExtra(EXTRA_ID, id),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  )
}

/** A reminder's alarm went off. */
class ReminderAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getIntExtra(ReminderAlarms.EXTRA_ID, 0)
    val store = ReminderStore(context)
    // Gone if it was cancelled after the alarm was set.
    val reminder = store.get(id) ?: return
    ReminderAlarms.show(context, reminder)
    store.remove(listOf(id))
  }
}

/** The phone restarted, or the app was updated. */
class ReminderBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED ->
        ReminderAlarms.restore(context)
    }
  }
}
