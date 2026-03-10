import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Fab } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { CalendarView } from './components/CalendarView/CalendarView';
import { DayView } from './components/DayView/DayView';
import { MonthView } from './components/MonthView/MonthView';
import { CalendarToolbar } from './components/CalendarToolbar/CalendarToolbar';
import { CreateEventModal } from './components/CreateEventModal/CreateEventModal';
import { useCalendarEvents } from './hooks/useCalendarEvents';
import { useCalendarView } from './hooks/useCalendarView';
import { subDays, addDays, startOfDay, endOfDay, format } from 'date-fns';
import { CALENDAR_CONSTANTS } from './constants/calendar.constants';
import { useIsMobile } from '../../hooks/useIsMobile';
import { CalendarContext } from '../../contexts/CalendarContext';
import styles from './CalendarPage.module.css';

type DayRange = {
  startDate: Date;
  endDate: Date;
};

/**
 * Main calendar page component.
 * Displays a calendar with multiple view modes (Timeline, Day, Week, Month) and provides functionality to create new events.
 * Handles day range management, view switching, and event creation through a modal.
 */
export const CalendarPage: React.FC = () => {
  const today = new Date();
  const initialStartDate = subDays(today, CALENDAR_CONSTANTS.DAYS_TO_LOAD);
  const initialEndDate = addDays(today, CALENDAR_CONSTANTS.DAYS_TO_LOAD);

  const [dayRange, setDayRange] = useState<DayRange>({
    startDate: initialStartDate,
    endDate: initialEndDate,
  });
  const [currentDate, setCurrentDate] = useState<Date>(today);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEventDate, setCreateEventDate] = useState<Date | undefined>(
    undefined
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { setCalendarMonthLabel, setOpenCreateEventModal } =
    React.useContext(CalendarContext);

  const { currentView, setView } = useCalendarView();

  useEffect(() => {
    setCalendarMonthLabel(format(currentDate, 'MMMM'));
  }, [currentDate, setCalendarMonthLabel]);

  useEffect(() => {
    const openModal = () => {
      setCreateEventDate(undefined);
      setIsCreateModalOpen(true);
    };
    setOpenCreateEventModal(openModal);
    return () => setOpenCreateEventModal(null);
  }, [setOpenCreateEventModal]);

  // Fetch events based on current view.
  // Day view: request previous and next calendar day so UTC-bound backend still returns
  // evening events (e.g. 8pm PST on the 15th is 4am UTC on the 16th); DayView filters by local day.
  const getStartDate = () => {
    switch (currentView) {
      case 'month':
        return startOfDay(subDays(currentDate, 31));
      case 'day':
        return startOfDay(subDays(currentDate, 1));
      case 'timeline':
      default:
        return dayRange.startDate;
    }
  };

  const getEndDate = () => {
    switch (currentView) {
      case 'month':
        return endOfDay(addDays(currentDate, 31));
      case 'day':
        return endOfDay(addDays(currentDate, 1));
      case 'timeline':
      default:
        return dayRange.endDate;
    }
  };

  const { events, isLoading, error, refetch } = useCalendarEvents(
    getStartDate(),
    getEndDate()
  );

  // Simple handler - just update the date range
  // CalendarView handles scroll position adjustment via useLayoutEffect
  const handleLoadMoreDays = useCallback((direction: 'left' | 'right') => {
    if (direction === 'left') {
      setDayRange(prev => ({
        ...prev,
        startDate: subDays(prev.startDate, CALENDAR_CONSTANTS.DAYS_TO_LOAD),
      }));
    } else {
      setDayRange(prev => ({
        ...prev,
        endDate: addDays(prev.endDate, CALENDAR_CONSTANTS.DAYS_TO_LOAD),
      }));
    }
  }, []);

  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  const handleViewChange = useCallback((view: 'day') => {
    setView(view);
  }, [setView]);

  const handleCreateEvent = () => {
    setCreateEventDate(undefined);
    setIsCreateModalOpen(true);
  };

  const handleTimeSlotClick = (date: Date, hour: number) => {
    // Create a date with the clicked hour
    const clickedDate = new Date(date);
    clickedDate.setHours(hour, 0, 0, 0);
    setCreateEventDate(clickedDate);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setCreateEventDate(undefined);
    refetch();
  };

  if (error) {
    return (
      <Box className={styles.calendarPage}>
        <Box className={styles.errorMessage}>
          Error loading calendar events: {error.message}
        </Box>
      </Box>
    );
  }

  const renderCalendarView = () => {
    switch (currentView) {
      case 'day':
        return (
          <DayView
            currentDate={currentDate}
            events={events}
            isLoading={isLoading}
            onDateChange={handleDateChange}
            onTimeSlotClick={handleTimeSlotClick}
          />
        );
      case 'month':
        return (
          <MonthView
            currentDate={currentDate}
            events={events}
            isLoading={isLoading}
            onDateChange={handleDateChange}
            onViewChange={handleViewChange}
          />
        );
      case 'timeline':
      default:
        return (
          <CalendarView
            startDate={dayRange.startDate}
            endDate={dayRange.endDate}
            events={events}
            isLoading={isLoading}
            onLoadMoreDays={handleLoadMoreDays}
            onTimeSlotClick={handleTimeSlotClick}
            scrollContainerRef={scrollContainerRef}
            onVisibleDateChange={handleDateChange}
          />
        );
    }
  };

  return (
    <Box className={styles.calendarPage}>
      {/* Desktop: Show CalendarToolbar / Mobile: ViewToggle is in Header */}

      <CalendarToolbar
        currentDate={currentDate}
        currentView={currentView}
        onDateChange={handleDateChange}
        onViewChange={setView}
      />


      <Box className={styles.calendarContent}>
        {renderCalendarView()}
      </Box>

      {!isMobile && (
        <Fab
          color="primary"
          aria-label="create event"
          onClick={handleCreateEvent}
          sx={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 1000,
          }}
        >
          <AddIcon />
        </Fab>
      )}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        defaultDate={createEventDate || new Date()}
      />
    </Box>
  );
};
