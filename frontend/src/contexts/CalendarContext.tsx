import React, { useState, useCallback } from 'react';

type CalendarContextValue = {
  calendarMonthLabel: string;
  setCalendarMonthLabel: (label: string) => void;
  openCreateEventModal: (() => void) | null;
  setOpenCreateEventModal: (fn: (() => void) | null) => void;
};

const defaultValue: CalendarContextValue = {
  calendarMonthLabel: '',
  setCalendarMonthLabel: () => {},
  openCreateEventModal: null,
  setOpenCreateEventModal: () => {},
};

export const CalendarContext = React.createContext<CalendarContextValue>(defaultValue);

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

  const value: CalendarContextValue = {
    calendarMonthLabel,
    setCalendarMonthLabel,
    openCreateEventModal,
    setOpenCreateEventModal,
  };

  return (
    <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
  );
};
