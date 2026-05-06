import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { useDroppable } from '@dnd-kit/core';
import { format, isToday } from 'date-fns';
import { EventLayoutMap } from '../../../hooks/useEventLayouts';
import { EventCard } from './EventCard/EventCard';
import styles from './DayColumn.module.css';

type DayColumnProps = {
  day: Date;
  layoutMap: EventLayoutMap;
  timeSlots: number[];
  onEventSelect: (eventId: number) => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
  resizePreview?: {
    eventId: number;
    startDate: Date;
    endDate: Date;
    direction: 'top' | 'bottom';
  } | null;
  /** Hide weekday/date header when the page already shows the date (e.g. Day view). */
  hideDayHeader?: boolean;
};

/**
 * Component for rendering a single day column in the calendar.
 * Displays the day header and all events for that day.
 *
 * @param props - Component props
 * @param props.day - The date for this column
 * @param props.layoutMap - Map of event IDs to their layout information
 * @param props.timeSlots - Array of hour indices (0-23)
 * @param props.onEventSelect - Callback when an event is clicked
 * @param props.hideDayHeader - When true, omit the weekday/date header row
 */
export const DayColumn: React.FC<DayColumnProps> = ({
  day,
  layoutMap,
  timeSlots,
  onEventSelect,
  onTimeSlotClick,
  resizePreview,
  hideDayHeader = false,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${day.toISOString()}`,
    data: {
      day,
    },
  });

  const handleTimeSlotClick = (hour: number, event: React.MouseEvent) => {
    // Only trigger if clicking directly on the time slot cell (not on an event)
    // Stop propagation to prevent event selection when clicking on empty space
    event.stopPropagation();
    if (event.target === event.currentTarget && onTimeSlotClick) {
      onTimeSlotClick(day, hour);
    }
  };

  return (
    <Box
      ref={setNodeRef}
      data-day-id={day.toISOString()}
      className={`${styles.dayColumn} ${hideDayHeader ? styles.dayColumnNoDayHeader : ''} ${isOver ? styles.dropOver : ''}`}
    >
      {!hideDayHeader ? (
        <Paper
          className={`${styles.dayHeader} ${isToday(day) ? styles.today : ''}`}
        >
          <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
            {format(day, 'EEE')}
          </Typography>
          <Typography variant="h6" sx={{ lineHeight: 1.2, fontSize: '1.25rem' }}>
            {format(day, 'd')}
          </Typography>
        </Paper>
      ) : null}
      <Box className={styles.dayContent}>
        {timeSlots.map(hour => (
          <Box
            key={`${day.toISOString()}-${hour}`}
            className={styles.timeSlotCell}
            onClick={e => handleTimeSlotClick(hour, e)}
            sx={{ cursor: onTimeSlotClick ? 'pointer' : 'default' }}
          />
        ))}
        {Array.from(layoutMap.values()).map(layout => (
          <EventCard
            key={layout.event.id}
            layout={layout}
            day={day}
            onSelect={onEventSelect}
            resizePreview={
              resizePreview?.eventId === layout.event.id ? resizePreview : null
            }
          />
        ))}
      </Box>
    </Box>
  );
};
