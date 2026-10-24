// Deliberately free of Tauri imports, like sync-status: the header badge,
// the login page and Settings can ask for it on any platform, and only the
// Tauri app's TauriConfigGate listens.
const listeners = new Set<() => void>();

/** Shows the connection settings (backend URL and Cloudflare Access token). */
export const openConnectionSettings = (): void => {
  listeners.forEach(listener => listener());
};

export const onOpenConnectionSettings = (
  listener: () => void
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
