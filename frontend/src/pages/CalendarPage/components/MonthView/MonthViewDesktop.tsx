import React, { useCallback, useMemo, useState } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import {
  addDays,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CalendarEventResponseDto } from '../../../../api/dtos/calendar-events.dtos';
import { EventDetailsModal } from '../EventDetailsModal/EventDetailsModal';
import { MonthViewProps } from './MonthView.types';
import { EVENT_COLORS, DEFAULT_EVENT_COLOR_KEY } from '../../constants/calendar.constants';
import styles from './MonthViewDesktop.module.css';

const MAX_EVENTS_PER_DAY = 4;
const WEEKDAYS_DESKTOP = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getEventColor = (event: CalendarEventResponseDto): string => {
  if (event.color) return event.color;
  return EVENT_COLORS[DEFAULT_EVENT_COLOR_KEY].value;
};

export const MonthViewDesktop: React.FC<MonthViewProps> = ({
  currentDate,
  events,
  onDateChange,
  onViewChange,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = addDays(calendarStart, 41);
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const weeksDays = useMemo(() => {
    const grouped: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      grouped.push(calendarDays.slice(i, i + 7));
    }
    return grouped;
  }, [calendarDays]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventResponseDto[]>();
    events.forEach((event) => {
      const dateKey = format(new Date(event.startDate), 'yyyy-MM-dd');
      const dayEvents = map.get(dateKey) ?? [];
      dayEvents.push(event);
      map.set(dateKey, dayEvents);
    });
    return map;
  }, [events, weeksDays, currentDate]);

  const handleDayClick = useCallback(
    (day: Date) => {
      onDateChange(day);
      onViewChange('day');
    },
    [onDateChange, onViewChange]
  );

  const handleEventClick = useCallback(
    (event: CalendarEventResponseDto, mouseEvent: React.MouseEvent) => {
      mouseEvent.stopPropagation();
      setSelectedEventId(event.id);
    },
    []
  );

  const getDayEvents = (day: Date): CalendarEventResponseDto[] => {
    return eventsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
  };

  return (
    <Box className={styles.monthView}>
      <Paper className={styles.calendarContainer}>
        <Box className={styles.weekdayHeaders}>
          {WEEKDAYS_DESKTOP.map((day) => (
            <Typography key={day} variant="caption" className={styles.weekdayHeader}>
              {day}
            </Typography>
          ))}
        </Box>

        <Box className={styles.calendarRows}>
          {weeksDays.map((weekDays) => (
            <Box key={weekDays[0].toISOString()} className={styles.calendarRow}>
              {weekDays.map((day) => {
                const dayEvents = getDayEvents(day);
                const visibleEvents = dayEvents.slice(0, MAX_EVENTS_PER_DAY);
                const hiddenCount = dayEvents.length - MAX_EVENTS_PER_DAY;
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);

                return (
                  <Box
                    key={day.toISOString()}
                    className={`
                      ${styles.dayCell}
                      ${!isCurrentMonth ? styles.otherMonth : ''}
                      ${isTodayDate ? styles.today : ''}
                    `}
                    onClick={() => handleDayClick(day)}
                  >
                    <Typography variant="body2" className={styles.dayNumber}>
                      {format(day, 'd')}
                    </Typography>

                    <Box className={styles.eventsContainer}>
                      {visibleEvents.map((event) => {
                        const timeStr = format(new Date(event.startDate), 'h:mma');
                        return (
                          <Box
                            key={event.id}
                            className={styles.eventItem}
                            onClick={(mouseEvent) => handleEventClick(event, mouseEvent)}
                            title={`${timeStr} ${event.title}`}
                          >
                            <Box
                              className={styles.eventDot}
                              style={{ backgroundColor: getEventColor(event) }}
                            />
                            <Typography className={styles.eventTime}>{timeStr}</Typography>
                            <Typography className={styles.eventTitle} noWrap>
                              {event.title}
                            </Typography>
                          </Box>
                        );
                      })}

                      {hiddenCount > 0 && (
                        <Typography variant="caption" className={styles.moreEvents}>
                          +{hiddenCount} more
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Paper>

      <EventDetailsModal
        isOpen={selectedEventId !== null}
        onClose={() => setSelectedEventId(null)}
        eventId={selectedEventId}
      />
    </Box>
  );
};
