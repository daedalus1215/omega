import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { format } from 'date-fns';
import { ViewDropdown } from '../ViewDropdown/ViewDropdown';
import { CalendarViewMode } from '../../hooks/useCalendarView';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import styles from './CalendarToolbar.module.css';

interface CalendarToolbarProps {
  currentDate: Date;
  currentView: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarViewMode) => void;
}

/**
 * Desktop calendar toolbar with navigation, title, and view switcher
 * Proton Calendar-style top bar
 */
export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  currentDate,
  currentView,
  onDateChange,
  onViewChange,
}) => {
  const isMobile = useIsMobile();

  // Handle navigation based on current view
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    switch (currentView) {
      case 'day':
        newDate.setDate(currentDate.getDate() - 1);
        break;
      case 'month':
        newDate.setMonth(currentDate.getMonth() - 1);
        break;
      case 'timeline':
      default:
        newDate.setDate(currentDate.getDate() - 7);
        break;
    }
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    switch (currentView) {
      case 'day':
        newDate.setDate(currentDate.getDate() + 1);
        break;
      case 'month':
        newDate.setMonth(currentDate.getMonth() + 1);
        break;
      case 'timeline':
      default:
        newDate.setDate(currentDate.getDate() + 7);
        break;
    }
    onDateChange(newDate);
  };

  // Format title based on view
  const getTitle = () => {
    switch (currentView) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy');
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'timeline':
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <Box className={styles.toolbar}>
      <Box className={styles.leftSection}>
        {!(currentView === 'timeline') && (
          <Box className={styles.navigationButtons}>
            <IconButton
              size="small"
              onClick={handlePrev}
              aria-label="Previous"
              className={styles.navButton}
            >
              <ChevronLeft />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleNext}
              aria-label="Next"
              className={styles.navButton}
            >
              <ChevronRight />
            </IconButton>

          </Box>
        )}
        <Typography variant="h6" className={styles.title} sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}>
          {getTitle()}
        </Typography>
      </Box>

      <Box className={styles.rightSection}>
        <ViewDropdown
          size={isMobile ? 'small' : 'medium'}
          currentView={currentView}
          onViewChange={onViewChange}
        />
      </Box>
    </Box>
  );
};
