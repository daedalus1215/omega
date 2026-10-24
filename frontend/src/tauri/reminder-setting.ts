import { useSyncExternalStore } from 'react';

/**
 * Whether this phone shows reminder notifications (Settings → Reminders).
 * On unless turned off, and per device, so it lives in localStorage.
 *
 * ⚠️ The keys are STABLE STORAGE KEYS: never rename them.
 */
const ENABLED_KEY = 'omega.reminder-notifications';
/** Set once the app has asked Android for permission on its own. */
const ASKED_KEY = 'omega.reminder-permission-asked';

const listeners = new Set<() => void>();

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Could not save ${key}:`, error);
  }
};

export const areRemindersEnabled = (): boolean => read(ENABLED_KEY) !== 'off';

export const setRemindersEnabled = (enabled: boolean): void => {
  write(ENABLED_KEY, enabled ? 'on' : 'off');
  listeners.forEach(listener => listener());
};

export const useRemindersEnabled = (): boolean =>
  useSyncExternalStore(listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }, areRemindersEnabled);

export const wasPermissionAsked = (): boolean => read(ASKED_KEY) === '1';

export const markPermissionAsked = (): void => write(ASKED_KEY, '1');
