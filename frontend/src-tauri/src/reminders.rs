use tauri::{
    Runtime,
    plugin::{Builder, TauriPlugin},
};

/// Reminder notifications on Android: alarms set by the app's own Kotlin
/// code (gen/android/app/src/main/java/com/omega/app/RemindersPlugin.kt),
/// which sets them again after a restart. Its commands are listed in
/// build.rs; elsewhere it does nothing.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("reminders")
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            _api.register_android_plugin("com.omega.app", "RemindersPlugin")?;
            Ok(())
        })
        .build()
}
