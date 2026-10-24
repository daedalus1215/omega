fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new().plugin(
            // The Android reminders plugin (src/reminders.rs), commands in Kotlin.
            "reminders",
            tauri_build::InlinedPlugin::new()
                .commands(&[
                    "schedule",
                    "cancel",
                    "list",
                    "take_tap",
                    "register_listener",
                    "remove_listener",
                ])
                .default_permission(tauri_build::DefaultPermissionRule::AllowAllCommands),
        ),
    )
    .expect("failed to run tauri-build");
}
