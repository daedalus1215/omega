import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { Box, Typography } from '@mui/material';
import {
  addDays,
  subDays,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  isSameDay,
} from 'date-fns';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
} from '@dnd-kit/core';
import { differenceInMinutes } from 'date-fns';
import { CalendarEventResponseDto } from '../../../../api/dtos/calendar-events.dtos';
import { useEventLayouts } from '../../hooks/useEventLayouts';
import { useUpdateCalendarEvent } from '../../hooks/useUpdateCalendarEvent';
import { DayColumn } from '../CalendarView/DayColumn/DayColumn';
import { TimeColumn } from '../CalendarView/TimeColumn/TimeColumn';
import { CurrentTimeIndicator } from '../CalendarView/CurrentTimeIndicator/CurrentTimeIndicator';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { useCurrentTimeIndicator } from '../../hooks/useCurrentTimeIndicator';
import {
  calculateDropPosition,
  calculateNewEventTimes,
} from '../../utils/event-drag.utils';
import {
  calculateResizePosition,
  calculateResizeFromTop,
  calculateResizeFromBottom,
  ResizeDirection,
} from '../../utils/event-resize.utils';
import { snapToTimeSlot } from '../../utils/drag-modifiers.utils';
import { CALENDAR_CONSTANTS } from '../../constants/calendar.constants';
import { EventDetailsModal } from '../EventDetailsModal/EventDetailsModal';
import styles from './DayView.module.css';

type DayViewProps = {
  currentDate: Date;
  events: CalendarEventResponseDto[];
  isLoading: boolean;
  onDateChange: (date: Date) => void;
  onToday?: () => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
};

const SWIPE_THRESHOLD = 50;

/**
 * Day view component showing a single day with swipe navigation
 * Supports horizontal swiping to navigate between days
 */
export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onDateChange,
  onTimeSlotClick,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [draggedEvent, setDraggedEvent] =
    useState<CalendarEventResponseDto | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{
    event: CalendarEventResponseDto;
    direction: ResizeDirection;
  } | null>(null);
  const [movePreview, setMovePreview] = useState<{
    eventId: number;
    startDate: Date;
    endDate: Date;
  } | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    eventId: number;
    startDate: Date;
    endDate: Date;
    direction: ResizeDirection;
  } | null>(null);

  // Swipe handling refs
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();
  const updateMutation = useUpdateCalendarEvent();

  // Create a single-day range for the event layout hook
  const dayRange = useMemo(() => {
    const start = startOfDay(currentDate);
    const end = endOfDay(currentDate);
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Filter events to only show those for the current day
  const dayEvents = useMemo(() => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      return isSameDay(eventStart, currentDate);
    });
  }, [events, currentDate]);

  const displayEvents = useMemo(() => {
    if (!movePreview) {
      return dayEvents;
    }
    return dayEvents.map(eventItem => {
      if (eventItem.id !== movePreview.eventId) {
        return eventItem;
      }
      return {
        ...eventItem,
        startDate: movePreview.startDate.toISOString(),
        endDate: movePreview.endDate.toISOString(),
      };
    });
  }, [dayEvents, movePreview]);

  const dayLayoutMaps = useEventLayouts(
    startOfDay(currentDate),
    endOfDay(currentDate),
    displayEvents
  );

  const timeSlots = useMemo(
    () => Array.from({ length: CALENDAR_CONSTANTS.HOURS_PER_DAY }, (_, i) => i),
    []
  );

  // Current time indicator
  const { currentTimePosition } = useCurrentTimeIndicator({
    days: dayRange,
    isMobile,
  });

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    touchStartX.current = clientX;
    touchStartY.current = clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

      const diffX = touchStartX.current - clientX;
      const diffY = touchStartY.current - clientY;

      // Only handle horizontal swipes (ignore vertical scrolling)
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > SWIPE_THRESHOLD) {
        if (diffX > 0) {
          // Swipe left - next day
          onDateChange(addDays(currentDate, 1));
        } else {
          // Swipe right - previous day
          onDateChange(subDays(currentDate, 1));
        }
      }

      touchStartX.current = null;
      touchStartY.current = null;
    },
    [currentDate, onDateChange]
  );

  // Mouse drag handlers for desktop swipe
  const [isMouseDown, setIsMouseDown] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsMouseDown(true);
    handleTouchStart(e);
  }, [handleTouchStart]);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isMouseDown) {
        handleTouchEnd(e);
        setIsMouseDown(false);
      }
    },
    [isMouseDown, handleTouchEnd]
  );

  const handleMouseLeave = useCallback(() => {
    setIsMouseDown(false);
    touchStartX.current = null;
    touchStartY.current = null;
  }, []);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isMobile
        ? { delay: 100, tolerance: 8 }
        : { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    })
  );

  // Drag handlers (similar to CalendarView)
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    const eventData = data?.event as CalendarEventResponseDto | undefined;
    const dragType = data?.type as string | undefined;

    if (eventData) {
      if (dragType === 'resize') {
        const direction = data?.direction as ResizeDirection;
        setResizingEvent({ event: eventData, direction });
      } else {
        setDraggedEvent(eventData);
      }
    }
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (!resizingEvent) return;

    const { active } = event;
    const activeData = active.data.current;
    if (!activeData?.event) return;

    const eventToResize = activeData.event as CalendarEventResponseDto;
    const eventStart = new Date(eventToResize.startDate);
    const eventDay = startOfDay(eventStart);

    const dayElement = document.querySelector(
      `[data-day-id="${eventDay.toISOString()}"]`
    ) as HTMLElement;
    if (!dayElement) return;

    const activeRect = active.rect.current.translated ?? active.rect.current.initial;
    if (!activeRect) return;

    const resizeY =
      resizingEvent.direction === 'top'
        ? activeRect.top
        : activeRect.top + activeRect.height;

    const resizePosition = calculateResizePosition(resizeY, dayElement, eventDay);
    if (!resizePosition) return;

    const { startDate, endDate } =
      resizingEvent.direction === 'top'
        ? calculateResizeFromTop(eventToResize, resizePosition)
        : calculateResizeFromBottom(eventToResize, resizePosition);

    const dayStart = startOfDay(eventDay);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const clampedStartDate =
      startDate < dayStart ? dayStart : startDate > dayEnd ? dayEnd : startDate;
    const clampedEndDate =
      endDate < dayStart ? dayStart : endDate > dayEnd ? dayEnd : endDate;

    setResizePreview({
      eventId: eventToResize.id,
      startDate: clampedStartDate,
      endDate: clampedEndDate,
      direction: resizingEvent.direction,
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const activeData = active.data.current;
    const dragType = activeData?.type as string | undefined;

    // Handle resize operations
    if (dragType === 'resize' && resizingEvent) {
      setResizingEvent(null);
      setResizePreview(null);

      if (!activeData?.event) return;

      const eventToResize = activeData.event as CalendarEventResponseDto;
      const eventStart = new Date(eventToResize.startDate);
      const eventDay = startOfDay(eventStart);

      const dayElement = document.querySelector(
        `[data-day-id="${eventDay.toISOString()}"]`
      ) as HTMLElement;
      if (!dayElement) return;

      const activeRect = active.rect.current.translated ?? active.rect.current.initial;
      if (!activeRect) return;

      const resizeY =
        resizingEvent.direction === 'top'
          ? activeRect.top
          : activeRect.top + activeRect.height;

      const resizePosition = calculateResizePosition(resizeY, dayElement, eventDay);
      if (!resizePosition) return;

      let { startDate: newStartDate, endDate: newEndDate } =
        resizingEvent.direction === 'top'
          ? calculateResizeFromTop(eventToResize, resizePosition)
          : calculateResizeFromBottom(eventToResize, resizePosition);

      const dayStart = startOfDay(eventDay);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      if (newStartDate < dayStart) newStartDate = new Date(dayStart);
      if (newStartDate > dayEnd) newStartDate = new Date(dayEnd);
      if (newEndDate < dayStart) newEndDate = new Date(dayStart);
      if (newEndDate > dayEnd) newEndDate = new Date(dayEnd);

      if (newEndDate <= newStartDate) {
        newEndDate = new Date(
          newStartDate.getTime() +
            CALENDAR_CONSTANTS.DRAG_SNAP_INTERVAL * 60 * 1000
        );
      }

      try {
        await updateMutation.mutateAsync({
          id: eventToResize.id,
          event: {
            title: eventToResize.title,
            description: eventToResize.description,
            startDate: newStartDate.toISOString(),
            endDate: newEndDate.toISOString(),
          },
        });
      } catch (error) {
        console.error('Error resizing event:', error);
      }
      return;
    }

    // Handle move operations
    setDraggedEvent(null);
    setResizePreview(null);
    if (!over || !activeData?.event) return;

    const eventToMove = activeData.event as CalendarEventResponseDto;
    const dropDayData = over.data.current;
    if (!dropDayData?.day) return;

    const dropDay = dropDayData.day as Date;
    const dayElement = document.querySelector(
      `[data-day-id="${dropDay.toISOString()}"]`
    ) as HTMLElement;
    if (!dayElement) return;

    const activeRect = active.rect.current.translated ?? active.rect.current.initial;
    if (!activeRect) return;

    const dropTopY = activeRect.top;
    const dropPosition = calculateDropPosition(dropTopY, dayElement, dropDay);
    if (!dropPosition) return;

    const { startDate: newStartDate, endDate: newEndDate } = calculateNewEventTimes(
      eventToMove,
      dropPosition
    );

    setMovePreview({
      eventId: eventToMove.id,
      startDate: newStartDate,
      endDate: newEndDate,
    });

    try {
      await updateMutation.mutateAsync({
        id: eventToMove.id,
        event: {
          title: eventToMove.title,
          description: eventToMove.description,
          startDate: newStartDate.toISOString(),
          endDate: newEndDate.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error moving event:', error);
      setMovePreview(null);
    }
  };

  const handleDragCancel = () => {
    setDraggedEvent(null);
    setResizingEvent(null);
    setMovePreview(null);
    setResizePreview(null);
  };

  // Calculate event height for drag overlay
  const getDragOverlayHeight = (event: CalendarEventResponseDto) => {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    const durationMinutes = differenceInMinutes(endDate, startDate);
    const heightPixels = (durationMinutes / 60) * CALENDAR_CONSTANTS.SLOT_HEIGHT;
    const minHeight =
      (CALENDAR_CONSTANTS.DRAG_SNAP_INTERVAL / 60) * CALENDAR_CONSTANTS.SLOT_HEIGHT;
    return Math.max(minHeight, heightPixels);
  };

  return (
    <Box className={styles.dayView}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={[snapToTimeSlot]}
      >
        <Box
          ref={containerRef}
          className={styles.calendarGrid}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <TimeColumn timeSlots={timeSlots} />

          {currentTimePosition !== null && (
            <CurrentTimeIndicator
              position={currentTimePosition}
              isMobile={isMobile}
            />
          )}

          <Box className={styles.dayColumnContainer}>
            <DayColumn
              day={currentDate}
              layoutMap={dayLayoutMaps.get(startOfDay(currentDate).toISOString()) || new Map()}
              timeSlots={timeSlots}
              onEventSelect={setSelectedEventId}
              onTimeSlotClick={onTimeSlotClick}
              resizePreview={resizePreview}
            />
          </Box>
        </Box>

        <DragOverlay>
          {draggedEvent ? (
            <Box
              sx={{
                padding: '4px 8px',
                backgroundColor: 'var(--color-primary, #6366f1)',
                color: 'var(--color-text, #fff)',
                borderRadius: '4px',
                minWidth: '120px',
                width: isMobile ? 'calc(100vw - 150px)' : '300px',
                height: `${getDragOverlayHeight(draggedEvent)}px`,
                opacity: 0.8,
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                overflow: 'hidden',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {draggedEvent.title}
              </Typography>
              {draggedEvent.description && (
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    opacity: 0.9,
                    marginTop: '4px',
                    display: '-webkit-box',
                    WebkitLineClamp: Math.floor(
                      (getDragOverlayHeight(draggedEvent) - 20) / 16
                    ),
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {draggedEvent.description}
                </Typography>
              )}
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      <EventDetailsModal
        isOpen={selectedEventId !== null}
        onClose={() => setSelectedEventId(null)}
        eventId={selectedEventId}
      />
    </Box>
  );
};
