import React, { useState, useCallback, useEffect } from 'react';
import { useCalendars } from '../pages/CalendarPage/hooks/useCalendars';
import { CalendarResponseDto } from '../api/dtos/calendars.dtos';

type CalendarContextValue = {
  calendarMonthLabel: string;
  setCalendarMonthLabel: (label: string) => void;
  openCreateEventModal: (() => void) | null;
  setOpenCreateEventModal: (fn: (() => void) | null) => void;
  // Calendars (Phase 2)
  calendars: CalendarResponseDto[];
  isLoadingCalendars: boolean;
  isCalendarVisible: (calendarId: number) => boolean;
  toggleCalendarVisibility: (calendarId: number) => void;
  selectedCalendarId: number | null;
  setSelectedCalendarId: (id: number | null) => void;
};

const defaultValue: CalendarContextValue = {
  calendarMonthLabel: '',
  setCalendarMonthLabel: () => {},
  openCreateEventModal: null,
  setOpenCreateEventModal: () => {},
  calendars: [],
  isLoadingCalendars: false,
  isCalendarVisible: () => true,
  toggleCalendarVisibility: () => {},
  selectedCalendarId: null,
  setSelectedCalendarId: () => {},
};

export const CalendarContext =
  React.createContext<CalendarContextValue>(defaultValue);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [calendarMonthLabel, setCalendarMonthLabel] = useState('');
  const [openCreateEventModal, setOpenCreateEventModalState] = useState<
    (() => void) | null
  >(null);

  const setOpenCreateEventModal = useCallback(
    (fn: (() => void) | null) => setOpenCreateEventModalState(() => fn),
    []
  );

  const { calendars, isLoading: isLoadingCalendars } = useCalendars();
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<number[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<number | null>(
    null
  );

  // Default the create target to the personal calendar once calendars load.
  useEffect(() => {
    if (selectedCalendarId !== null || calendars.length === 0) {
      return;
    }
    const personal = calendars.find(calendar => calendar.isPersonal);
    setSelectedCalendarId(personal ? personal.id : calendars[0].id);
  }, [calendars, selectedCalendarId]);

  const isCalendarVisible = useCallback(
    (calendarId: number) => !hiddenCalendarIds.includes(calendarId),
    [hiddenCalendarIds]
  );

  const toggleCalendarVisibility = useCallback((calendarId: number) => {
    setHiddenCalendarIds(prev =>
      prev.includes(calendarId)
        ? prev.filter(id => id !== calendarId)
        : [...prev, calendarId]
    );
  }, []);

  const value: CalendarContextValue = {
    calendarMonthLabel,
    setCalendarMonthLabel,
    openCreateEventModal,
    setOpenCreateEventModal,
    calendars,
    isLoadingCalendars,
    isCalendarVisible,
    toggleCalendarVisibility,
    selectedCalendarId,
    setSelectedCalendarId,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};
