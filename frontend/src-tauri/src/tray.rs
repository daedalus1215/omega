use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{App, AppHandle, Emitter, Manager, State, Wry};

/// Tells the frontend to sync straight away; it owns the outbox.
const SYNC_NOW_EVENT: &str = "tray-sync-now";

/// The menu's disabled first line, which the frontend keeps describing the
/// sync state. Linux tray icons show no tooltip, so the menu is the only
/// place for it.
pub struct TrayStatus(MenuItem<Wry>);

pub fn create(app: &App) -> tauri::Result<()> {
    let status = MenuItem::with_id(app, "status", "Starting…", false, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &status,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "sync-now", "Sync now", true, None::<&str>)?,
            &MenuItem::with_id(app, "show", "Show Omega", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?,
        ],
    )?;

    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("Omega")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "sync-now" => {
                if let Err(e) = app.emit(SYNC_NOW_EVENT, ()) {
                    log::error!("could not request a sync: {e}");
                }
            }
            "show" => show_main_window(app.clone()),
            // Queued changes are already on disk; they sync on the next launch.
            "quit" => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;

    app.manage(TrayStatus(status));
    Ok(())
}

#[tauri::command]
pub fn set_tray_status(status: State<'_, TrayStatus>, text: String) -> Result<(), String> {
    status
        .0
        .set_text(text)
        .map_err(|e| format!("could not update tray status: {e}"))
}

/// Brings the window forward, from the tray menu or a clicked notification.
#[tauri::command]
pub fn show_main_window(app: AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let shown = window
        .unminimize()
        .and_then(|()| window.show())
        .and_then(|()| window.set_focus());
    if let Err(e) = shown {
        log::error!("could not show the main window: {e}");
    }
}
