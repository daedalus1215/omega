import React, { useEffect, useRef, useState } from 'react';

const HIDDEN_CALENDARS_KEY_PREFIX = 'omega_calendar_hidden_ids_';

const readHiddenCalendarIds = (storageKey: string | null): number[] => {
  if (!storageKey) {
    return [];
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((id): id is number => typeof id === 'number');
  } catch {
    return [];
  }
};

/**
 * Hook to track the IDs of calendars the user has toggled off, persisting
 * the choice in localStorage so it survives page refreshes.
 * Storage is scoped per signed-in user so accounts do not share the choice.
 *
 * @param userId - The signed-in user's ID, or null when signed out
 */
export const usePersistentHiddenCalendarIds = (
  userId: string | null
): {
  hiddenCalendarIds: number[];
  setHiddenCalendarIds: React.Dispatch<React.SetStateAction<number[]>>;
} => {
  const storageKey = userId ? `${HIDDEN_CALENDARS_KEY_PREFIX}${userId}` : null;
  const isFirstRun = useRef(true);
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<number[]>(() =>
    readHiddenCalendarIds(storageKey)
  );

  // Re-read the stored list when a different user signs in.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    setHiddenCalendarIds(readHiddenCalendarIds(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }
    try {
      localStorage.setItem(storageKey, JSON.stringify(hiddenCalendarIds));
    } catch {
      // Storage may be unavailable (e.g. private mode); stay in-memory.
    }
  }, [hiddenCalendarIds, storageKey]);

  return { hiddenCalendarIds, setHiddenCalendarIds };
};
