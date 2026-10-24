package com.omega.app

import android.app.Activity
import android.content.Intent
import android.webkit.WebView
import app.tauri.annotation.Command
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSArray
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin

/**
 * The web app's side of reminder notifications (src/tauri/reminder-device.ts),
 * registered from src/reminders.rs. The notification plugin could schedule
 * them, but it never saves what it schedules that way, so a restart lost them.
 */
@TauriPlugin
class RemindersPlugin(private val activity: Activity) : Plugin(activity) {
  /** A tapped reminder's data, until the web app takes it. */
  private var tapped: String? = null

  override fun load(webView: WebView) {
    super.load(webView)
    ReminderAlarms.createChannel(activity)
    // A tap that started the app: the web app takes it once it's listening.
    activity.intent?.let { keepTap(it) }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    if (keepTap(intent)) trigger("tapped", JSObject())
  }

  private fun keepTap(intent: Intent): Boolean {
    if (intent.action != ReminderAlarms.ACTION_TAPPED) return false
    val data = intent.getStringExtra(ReminderAlarms.EXTRA_DATA) ?: return false
    // The activity keeps its launch intent; don't take this tap twice.
    intent.removeExtra(ReminderAlarms.EXTRA_DATA)
    tapped = data
    return true
  }

  @Command
  fun schedule(invoke: Invoke) {
    val list = invoke.getArgs().getJSONArray("reminders")
    val reminders = (0 until list.length()).map { Reminder.fromJson(list.getJSONObject(it)) }
    ReminderAlarms.schedule(activity, reminders)
    invoke.resolve()
  }

  @Command
  fun cancel(invoke: Invoke) {
    val list = invoke.getArgs().getJSONArray("ids")
    ReminderAlarms.cancel(activity, (0 until list.length()).map { list.getInt(it) })
    invoke.resolve()
  }

  /** The scheduled reminders that haven't shown yet. */
  @Command
  fun list(invoke: Invoke) {
    val reminders = JSArray()
    for (reminder in ReminderStore(activity).all()) {
      val item = JSObject()
      item.put("id", reminder.id)
      item.put("at", reminder.at)
      item.put("signature", reminder.signature)
      reminders.put(item)
    }
    val result = JSObject()
    result.put("reminders", reminders)
    invoke.resolve(result)
  }

  /** The last tapped reminder's data, once. */
  @Command
  fun takeTap(invoke: Invoke) {
    val result = JSObject()
    result.put("data", tapped)
    tapped = null
    invoke.resolve(result)
  }
}
