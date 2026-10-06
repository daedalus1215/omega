import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

/** User-selectable appearance mode. `auto` follows the OS setting. */
export type ThemeMode = 'light' | 'dark' | 'auto';

/** Mode actually applied after resolving `auto` against the system setting. */
export type ResolvedThemeMode = 'light' | 'dark';

const THEME_MODE_STORAGE_KEY = 'omega.theme-mode';
const SYSTEM_DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';
const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'auto'];

type ThemeModeContextValue = {
  /** User-selected mode (persisted per browser). */
  mode: ThemeMode;
  /** Mode actually applied after resolving `auto`. */
  resolvedMode: ResolvedThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const isThemeMode = (value: unknown): value is ThemeMode =>
  THEME_MODES.includes(value as ThemeMode);

const readStoredMode = (): ThemeMode => {
  try {
    const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'auto';
  } catch {
    return 'auto';
  }
};

const defaultValue: ThemeModeContextValue = {
  mode: 'auto',
  resolvedMode: 'light',
  setMode: () => {},
};

export const ThemeModeContext =
  createContext<ThemeModeContextValue>(defaultValue);

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() =>
    window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches
  );

  // Track OS-level preference changes so `auto` stays live.
  useEffect(() => {
    const mediaQuery = window.matchMedia(SYSTEM_DARK_MEDIA_QUERY);
    const handleChange = (event: MediaQueryListEvent): void => {
      setSystemPrefersDark(event.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedMode: ResolvedThemeMode =
    mode === 'auto' ? (systemPrefersDark ? 'dark' : 'light') : mode;

  // Mirror the resolved mode onto <html> so the CSS tokens in index.css
  // (`:root` vs `.dark`) and the Tailwind dark variant switch over.
  useEffect(() => {
    const rootElement = document.documentElement;
    if (resolvedMode === 'dark') {
      rootElement.classList.add('dark');
    } else {
      rootElement.classList.remove('dark');
    }
  }, [resolvedMode]);

  const setMode = useCallback((nextMode: ThemeMode): void => {
    setModeState(nextMode);
    try {
      window.localStorage.setItem(THEME_MODE_STORAGE_KEY, nextMode);
    } catch {
      // Storage unavailable (e.g. blocked) — keep the in-memory choice.
    }
  }, []);

  const value = useMemo<ThemeModeContextValue>(
    () => ({ mode, resolvedMode, setMode }),
    [mode, resolvedMode, setMode]
  );

  return (
    <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>
  );
};
