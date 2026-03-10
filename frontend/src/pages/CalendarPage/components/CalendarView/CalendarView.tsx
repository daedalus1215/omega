import React, {
  useRef,
  useState,
  useMemo,
  useLayoutEffect,
  useCallback,
  useEffect,
} from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { eachDayOfInterval, startOfDay, differenceInMinutes } from 'date-fns';
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
import { CalendarEventResponseDto } from '../../../../api/dtos/calendar-events.dtos';
import { EventDetailsModal } from '../EventDetailsModal/EventDetailsModal';
import { useEventLayouts } from '../../hooks/useEventLayouts';
import { DayColumn } from './DayColumn/DayColumn';
import { TimeColumn } from './TimeColumn/TimeColumn';
import { CurrentTimeIndicator } from './CurrentTimeIndicator/CurrentTimeIndicator';
import { SkeletonDayColumn } from './SkeletonDayColumn/SkeletonDayColumn';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import { useUpdateCalendarEvent } from '../../hooks/useUpdateCalendarEvent';
import { useInfiniteScrollDays } from '../../hooks/useInfiniteScrollDays';
import { useScrollToToday } from '../../hooks/useScrollToToday';
import { useCurrentTimeIndicator } from '../../hooks/useCurrentTimeIndicator';
import { useVisibleDateRange } from '../../hooks/useVisibleDateRange';
import { useVirtualizedDays } from '../../hooks/useVirtualizedDays';
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
import styles from './CalendarView.module.css';

type CalendarViewProps = {
  startDate: Date;
  endDate: Date;
  events: CalendarEventResponseDto[];
  isLoading: boolean;
  onLoadMoreDays: (direction: 'left' | 'right') => void;
  onTimeSlotClick?: (date: Date, hour: number) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  onVisibleDateChange?: (date: Date) => void;
};

/**
 * Calendar view component displaying an infinite scrolling calendar grid with hourly time slots.
 * Shows events in their respective time slots and days.
 * Supports clicking events to view/edit details and infinite horizontal scrolling.
 *
 * @param props - Component props
 * @param props.startDate - The start date of the visible range (inclusive)
 * @param props.endDate - The end date of the visible range (inclusive)
 * @param props.events - Array of calendar events to display
 * @param props.isLoading - Whether events are currently loading
 * @param props.onLoadMoreDays - Callback to load more days when scrolling near edges
 */
export const CalendarView: React.FC<CalendarViewProps> = ({
  startDate,
  endDate,
  events,
  isLoading,
  onLoadMoreDays,
  onTimeSlotClick,
  scrollContainerRef: externalRef,
  onVisibleDateChange,
}) => {
  const internalRef = useRef<HTMLDivElement>(null);
  const calendarGridRef = externalRef || internalRef;

  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startDate,
      end: endDate,
    });
  }, [startDate, endDate]);

  const timeSlots = useMemo(
    () => Array.from({ length: CALENDAR_CONSTANTS.HOURS_PER_DAY }, (_, i) => i),
    []
  );

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error'>(
    'success'
  );

  const displayEvents = useMemo(() => {
    if (!movePreview) {
      return events;
    }
    return events.map(eventItem => {
      if (eventItem.id !== movePreview.eventId) {
        return eventItem;
      }
      return {
        ...eventItem,
        startDate: movePreview.startDate.toISOString(),
        endDate: movePreview.endDate.toISOString(),
      };
    });
  }, [events, movePreview]);
  const dayLayoutMaps = useEventLayouts(startDate, endDate, displayEvents);
  const isMobile = useIsMobile();
  const updateMutation = useUpdateCalendarEvent();
  useEffect(() => {
    if (!movePreview) {
      return;
    }
    const matchingEvent = events.find(eventItem => eventItem.id === movePreview.eventId);
    if (!matchingEvent) {
      setMovePreview(null);
      return;
    }
    if (
      matchingEvent.startDate === movePreview.startDate.toISOString() &&
      matchingEvent.endDate === movePreview.endDate.toISOString()
    ) {
      setMovePreview(null);
    }
  }, [events, movePreview]);

  // Virtualization for day columns with consistent fixed widths
  const virtualizer = useVirtualizedDays({
    containerRef: calendarGridRef,
    dayCount: days.length,
    isMobile,
  });

  // Track when days are loaded to prevent interference
  const lastLoadTimeRef = useRef<number>(0);
  
  // Track previous startDate to detect prepending (scrolling backwards)
  const prevStartDateRef = useRef<Date>(startDate);
  const scrollAdjustmentRef = useRef<number>(0);
  
  // Detect prepending: when startDate moves to an earlier date
  // This runs during render to capture state before useLayoutEffect
  const prevStartTime = prevStartDateRef.current.getTime();
  const currentStartTime = startDate.getTime();
  
  if (currentStartTime < prevStartTime) {
    // Days were prepended - calculate how many days were added
    // The difference in milliseconds / ms per day = days prepended
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysPrepended = Math.round((prevStartTime - currentStartTime) / msPerDay);
    
    if (daysPrepended > 0) {
      // Calculate the total width of prepended days
      let addedWidth = 0;
      for (let i = 0; i < daysPrepended; i++) {
        addedWidth += CALENDAR_CONSTANTS.DAY_WIDTH;
      }
      scrollAdjustmentRef.current = addedWidth;
    }
  }
  
  // Update ref after calculation (so next render can compare)
  prevStartDateRef.current = startDate;
  
  // Apply scroll adjustment synchronously after React updates DOM but before paint
  // When days are prepended, all content shifts right - we shift scroll to compensate
  useLayoutEffect(() => {
    const container = calendarGridRef.current;
    const adjustment = scrollAdjustmentRef.current;
    
    if (container && adjustment > 0) {
      // Immediately adjust scroll position (no animation, no delay)
      // This must happen before the browser paints
      container.scrollLeft += adjustment;
      scrollAdjustmentRef.current = 0;
      lastLoadTimeRef.current = Date.now();
    }
  }, [startDate, calendarGridRef]);
  
  const wrappedOnLoadMoreDays = useCallback((direction: 'left' | 'right') => {
    lastLoadTimeRef.current = Date.now();
    onLoadMoreDays(direction);
  }, [onLoadMoreDays]);

  // Infinite scrolling with loading indicators
  // Pass virtualizer's total size for accurate boundary detection
  const { isLoadingLeft, isLoadingRight } = useInfiniteScrollDays({
    containerRef: calendarGridRef,
    onLoadMoreDays: wrappedOnLoadMoreDays,
    totalContentWidth: virtualizer.getTotalSize(),
  });

  // Current time indicator
  const { currentTimePosition } = useCurrentTimeIndicator({
    days,
    isMobile,
  });
  
  // Auto-scroll to today on mount
  useScrollToToday({
    containerRef: calendarGridRef,
    days,
    isMobile,
    autoScrollOnMount: true,
    scrollToCurrentTime: true,
  });

  // Track currently centered date in the horizontal viewport
  const { visibleDate } = useVisibleDateRange({
    containerRef: calendarGridRef,
    days,
    isMobile,
  });

  useEffect(() => {
    if (!onVisibleDateChange) {
      return;
    }
    onVisibleDateChange(visibleDate);
  }, [onVisibleDateChange, visibleDate]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isMobile
        ? {
            delay: 100,
            tolerance: 8,
          }
        : {
            distance: 8,
          },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 8,
      },
    })
  );

  // Drag and drop handlers
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
    // Only handle resize preview updates
    if (!resizingEvent) {
      return;
    }

    const { active } = event;
    const activeData = active.data.current;
    
    if (!activeData?.event) {
      return;
    }

    const eventToResize = activeData.event as CalendarEventResponseDto;
    
    // Always use the event's original day - constrain resize to same day
    const eventStart = new Date(eventToResize.startDate);
    const eventDay = startOfDay(eventStart);
    
    // Find the day element for the event's day
    const dayElement = document.querySelector(
      `[data-day-id="${eventDay.toISOString()}"]`
    ) as HTMLElement;

    if (!dayElement) {
      return;
    }

    const activeRect =
      active.rect.current.translated ?? active.rect.current.initial;
    if (!activeRect) {
      return;
    }

    // Calculate resize position - constrain to the event's day
    const resizeY = resizingEvent.direction === 'top' 
      ? activeRect.top 
      : activeRect.top + activeRect.height;

    const resizePosition = calculateResizePosition(
      resizeY,
      dayElement,
      eventDay
    );

    if (!resizePosition) {
      return;
    }

    // Calculate preview times - but clamp to stay within the same day
    const { startDate, endDate } =
      resizingEvent.direction === 'top'
        ? calculateResizeFromTop(eventToResize, resizePosition)
        : calculateResizeFromBottom(eventToResize, resizePosition);

    // Clamp preview dates to the event's day boundaries
    const dayStart = startOfDay(eventDay);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const clampedStartDate = startDate < dayStart ? dayStart : 
                            startDate > dayEnd ? dayEnd : startDate;
    const clampedEndDate = endDate < dayStart ? dayStart : 
                          endDate > dayEnd ? dayEnd : endDate;

    // Update preview state with clamped dates
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
      
      if (!activeData?.event) {
        return;
      }

      const eventToResize = activeData.event as CalendarEventResponseDto;
      
      // Always use the event's original day - constrain resize to same day
      const eventStart = new Date(eventToResize.startDate);
      const eventDay = startOfDay(eventStart);
      
      // Find the day element for the event's day
      const dayElement = document.querySelector(
        `[data-day-id="${eventDay.toISOString()}"]`
      ) as HTMLElement;

      if (!dayElement) {
        return;
      }

      const activeRect =
        active.rect.current.translated ?? active.rect.current.initial;
      if (!activeRect) {
        return;
      }

      // Use the center Y of the resize handle for more accurate positioning
      const resizeY = resizingEvent.direction === 'top' 
        ? activeRect.top 
        : activeRect.top + activeRect.height;

      const resizePosition = calculateResizePosition(
        resizeY,
        dayElement,
        eventDay
      );

      if (!resizePosition) {
        return;
      }

      let { startDate: newStartDate, endDate: newEndDate } =
        resizingEvent.direction === 'top'
          ? calculateResizeFromTop(eventToResize, resizePosition)
          : calculateResizeFromBottom(eventToResize, resizePosition);

      // Clamp to day boundaries to prevent cross-day resizing
      const dayStart = startOfDay(eventDay);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      if (newStartDate < dayStart) {
        newStartDate = new Date(dayStart);
      }
      if (newStartDate > dayEnd) {
        newStartDate = new Date(dayEnd);
      }
      if (newEndDate < dayStart) {
        newEndDate = new Date(dayStart);
      }
      if (newEndDate > dayEnd) {
        newEndDate = new Date(dayEnd);
      }

      // Ensure end is still after start
      if (newEndDate <= newStartDate) {
        newEndDate = new Date(newStartDate.getTime() + CALENDAR_CONSTANTS.DRAG_SNAP_INTERVAL * 60 * 1000);
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
        setToastSeverity('success');
        setToastMessage('Event resized successfully');
      } catch (error) {
        console.error('Error resizing calendar event:', error);
        setToastSeverity('error');
        setToastMessage(
          error instanceof Error
            ? error.message || 'Failed to resize event'
            : 'Failed to resize event'
        );
      }
      return;
    }

    // Handle move operations (existing logic)
    setDraggedEvent(null);
    setResizePreview(null);
    if (!over || !activeData?.event) {
      return;
    }
    const eventToMove = activeData.event as CalendarEventResponseDto;
    const dropDayData = over.data.current;
    if (!dropDayData?.day) {
      return;
    }
    const dropDay = dropDayData.day as Date;
    const dayElement = document.querySelector(
      `[data-day-id="${dropDay.toISOString()}"]`
    ) as HTMLElement;
    if (!dayElement) {
      return;
    }
    const activeRect =
      active.rect.current.translated ?? active.rect.current.initial;
    if (!activeRect) {
      return;
    }
    const dropTopY = activeRect.top;
    const dropPosition = calculateDropPosition(dropTopY, dayElement, dropDay);
    if (!dropPosition) {
      return;
    }
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
      console.error('Error moving calendar event:', error);
      setMovePreview(null);
      setToastSeverity('error');
      setToastMessage(
        error instanceof Error
          ? error.message || 'Failed to move event'
          : 'Failed to move event'
      );
    }
  };

  const handleDragCancel = () => {
    // Clear all drag/resize state on cancel
    setDraggedEvent(null);
    setResizingEvent(null);
    setMovePreview(null);
    setResizePreview(null);
  };

  return (
    <Box className={styles.calendarView}>
      {/* Loading overlay - shows spinner but keeps calendar visible */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            pointerEvents: 'none', // Allow scrolling through overlay
          }}
        >
          <CircularProgress size={48} />
        </Box>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={[snapToTimeSlot]}
      >
        <Box className={styles.calendarGrid} ref={calendarGridRef}>
          <TimeColumn timeSlots={timeSlots} />
          
          {currentTimePosition !== null && (
            <CurrentTimeIndicator
              position={currentTimePosition}
              isMobile={isMobile}
            />
          )}

          {/* Virtualized day columns container */}
          <Box
            className={styles.virtualizedContainer}
            style={{
              width: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
              height: '100%',
            }}
          >
            {/* Loading skeletons on the left - positioned before the virtualized content */}
            {isLoadingLeft &&
              Array.from({ length: 3 }).map((_, i) => {
                // Use default width for skeletons (we don't know which days they represent)
                const skeletonWidth = isMobile
                  ? CALENDAR_CONSTANTS.MOBILE_DAY_WIDTH
                  : CALENDAR_CONSTANTS.DAY_WIDTH;
                const leftOffset = -skeletonWidth * (3 - i);
                return (
                  <Box
                    key={`skeleton-left-${i}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: `${leftOffset}px`,
                      width: `${skeletonWidth}px`,
                      height: '100%',
                    }}
                  >
                    <SkeletonDayColumn timeSlots={timeSlots} />
                  </Box>
                );
              })}

            {/* Virtualized day columns - only render visible ones */}
            {virtualizer.getVirtualItems().map(virtualItem => {
              const day = days[virtualItem.index];
              if (!day) return null;

              // Use consistent fixed width for all columns
              const dayWidth = isMobile
                ? CALENDAR_CONSTANTS.MOBILE_DAY_WIDTH
                : CALENDAR_CONSTANTS.DAY_WIDTH;

              return (
                <Box
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  data-virtual-key={virtualItem.key}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `${virtualItem.start}px`,
                    width: `${dayWidth}px`,
                    height: '100%',
                  }}
                >
                  <DayColumn
                    day={day}
                    layoutMap={dayLayoutMaps.get(day.toISOString()) || new Map()}
                    timeSlots={timeSlots}
                    onEventSelect={setSelectedEventId}
                    onTimeSlotClick={onTimeSlotClick}
                    resizePreview={resizePreview}
                  />
                </Box>
              );
            })}

            {/* Loading skeletons on the right - positioned after the virtualized content */}
            {isLoadingRight &&
              Array.from({ length: 3 }).map((_, i) => {
                // Use default width for skeletons (we don't know which days they represent)
                const skeletonWidth = isMobile
                  ? CALENDAR_CONSTANTS.MOBILE_DAY_WIDTH
                  : CALENDAR_CONSTANTS.DAY_WIDTH;
                const leftOffset = virtualizer.getTotalSize() + skeletonWidth * i;
                return (
                  <Box
                    key={`skeleton-right-${i}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: `${leftOffset}px`,
                      width: `${skeletonWidth}px`,
                      height: '100%',
                    }}
                  >
                    <SkeletonDayColumn timeSlots={timeSlots} />
                  </Box>
                );
              })}
          </Box>
        </Box>
        <DragOverlay>
          {draggedEvent ? (() => {
            // Calculate event height based on duration
            const startDate = new Date(draggedEvent.startDate);
            const endDate = new Date(draggedEvent.endDate);
            const durationMinutes = differenceInMinutes(endDate, startDate);
            const heightPixels = (durationMinutes / 60) * CALENDAR_CONSTANTS.SLOT_HEIGHT;
            const minHeight = (CALENDAR_CONSTANTS.DRAG_SNAP_INTERVAL / 60) * CALENDAR_CONSTANTS.SLOT_HEIGHT;
            
            return (
              <Box
                sx={{
                  padding: '4px 8px',
                  backgroundColor: 'var(--color-primary, #6366f1)',
                  color: 'var(--color-text, #fff)',
                  borderRadius: '4px',
                  minWidth: '120px',
                  width: '150px',
                  height: `${Math.max(minHeight, heightPixels)}px`,
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
                  sx={{ fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
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
                      WebkitLineClamp: Math.floor((Math.max(minHeight, heightPixels) - 20) / 16),
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {draggedEvent.description}
                  </Typography>
                )}
              </Box>
            );
          })() : null}
        </DragOverlay>
      </DndContext>
      <EventDetailsModal
        isOpen={selectedEventId !== null}
        onClose={() => setSelectedEventId(null)}
        eventId={selectedEventId}
        onDeleteSuccess={() => {
          setToastSeverity('success');
          setToastMessage('Event deleted successfully');
        }}
        onDeleteError={error => {
          setToastSeverity('error');
          setToastMessage(error.message || 'Failed to delete event');
        }}
      />
      <Snackbar
        open={toastMessage !== null}
        autoHideDuration={6000}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToastMessage(null)}
          severity={toastSeverity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
