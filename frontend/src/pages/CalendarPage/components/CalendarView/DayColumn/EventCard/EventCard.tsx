import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { Repeat as RepeatIcon } from '@mui/icons-material';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { startOfDay } from 'date-fns';
import { EventLayout } from '../../../../hooks/useEventLayouts';
import { CALENDAR_CONSTANTS, EVENT_COLORS, DEFAULT_EVENT_COLOR_KEY } from '../../../../constants/calendar.constants';
import styles from './EventCard.module.css';

type EventCardProps = {
  layout: EventLayout;
  day: Date;
  onSelect: (eventId: number) => void;
  onResizeStart?: (eventId: number, direction: 'top' | 'bottom') => void;
  resizePreview?: {
    eventId: number;
    startDate: Date;
    endDate: Date;
    direction: 'top' | 'bottom';
  } | null;
};

/**
 * Component for rendering a single calendar event card.
 * Handles positioning, sizing, and styling based on layout calculations.
 * Supports drag and drop functionality.
 *
 * @param props - Component props
 * @param props.layout - Event layout information (position, size, column info)
 * @param props.onSelect - Callback when event is clicked
 */
export const EventCard: React.FC<EventCardProps> = ({
  layout,
  day,
  onSelect,
  onResizeStart,
  resizePreview,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `event-${layout.event.id}`,
      data: {
        event: layout.event,
        type: 'move',
      },
    });

  // Resize handles - separate draggables for top and bottom
  const {
    attributes: topResizeAttributes,
    listeners: topResizeListeners,
    setNodeRef: topResizeRef,
  } = useDraggable({
    id: `event-resize-top-${layout.event.id}`,
    data: {
      event: layout.event,
      type: 'resize',
      direction: 'top',
    },
  });

  const {
    attributes: bottomResizeAttributes,
    listeners: bottomResizeListeners,
    setNodeRef: bottomResizeRef,
  } = useDraggable({
    id: `event-resize-bottom-${layout.event.id}`,
    data: {
      event: layout.event,
      type: 'resize',
      direction: 'bottom',
    },
  });

  const widthPercent = 100 / layout.columnCount;
  const leftPercent = (layout.columnIndex * 100) / layout.columnCount;

  const eventColor = layout.event.color || EVENT_COLORS[DEFAULT_EVENT_COLOR_KEY].value;
  const getColorData = (colorValue: string) => {
    const entry = Object.entries(EVENT_COLORS).find(([_, c]) => c.value === colorValue);
    return entry ? entry[1] : EVENT_COLORS[DEFAULT_EVENT_COLOR_KEY];
  };
  const colorData = getColorData(eventColor);

  // Calculate dimensions - use preview if available during resize
  let topPixels: number;
  let heightPixels: number;

  if (resizePreview && resizePreview.eventId === layout.event.id) {
    // Calculate preview dimensions from preview dates
    const dayStart = startOfDay(day);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    // Clamp preview dates to day boundaries
    const previewStart = new Date(resizePreview.startDate);
    const previewEnd = new Date(resizePreview.endDate);
    const clampedStart = previewStart < dayStart ? dayStart : previewStart;
    const clampedEnd = previewEnd > dayEnd ? dayEnd : previewEnd;

    // Calculate position and height
    const startHours = clampedStart.getHours() + clampedStart.getMinutes() / 60;
    const endHours = clampedEnd.getHours() + clampedEnd.getMinutes() / 60;
    const startOffset = clampedStart.getMinutes() % 60 / 60;

    // Ensure end is after start
    const validEndHours = Math.max(startHours, endHours);

    topPixels = startHours * CALENDAR_CONSTANTS.SLOT_HEIGHT + startOffset * CALENDAR_CONSTANTS.SLOT_HEIGHT;
    heightPixels = Math.max(
      CALENDAR_CONSTANTS.DRAG_SNAP_INTERVAL / 60 * CALENDAR_CONSTANTS.SLOT_HEIGHT, // Minimum 15 minutes
      (validEndHours - startHours) * CALENDAR_CONSTANTS.SLOT_HEIGHT
    );

    // Clamp top to stay within day bounds (0 to 1440px)
    topPixels = Math.max(0, Math.min(1440, topPixels));

    // Clamp height to not extend beyond day
    const maxHeight = 1440 - topPixels;
    heightPixels = Math.min(heightPixels, maxHeight);
  } else {
    // Use normal layout dimensions
    topPixels = layout.startSlot * CALENDAR_CONSTANTS.SLOT_HEIGHT + layout.startOffset * CALENDAR_CONSTANTS.SLOT_HEIGHT;
    heightPixels = layout.duration * CALENDAR_CONSTANTS.SLOT_HEIGHT;
  }

  const style = {
    width: `calc(${widthPercent}% - 4px)`,
    left: `calc(${leftPercent}% + 2px)`,
    top: `${topPixels}px`,
    height: `${heightPixels}px`,
    zIndex: isDragging ? 1000 : layout.columnIndex + 1,
    opacity: isDragging ? 0 : 1,
    transform: CSS.Translate.toString(transform),
    backgroundColor: eventColor,
    '--event-color': eventColor,
    '--event-color-light': colorData.light,
  } as React.CSSProperties;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      onSelect(layout.event.id);
    }
  };

  // Only show resize handles if event is tall enough, not dragging, and not currently being resized
  const isResizing = resizePreview?.eventId === layout.event.id;
  const showResizeHandles = heightPixels >= 40 && !isDragging && !isResizing;

  return (
    <Paper
      ref={setNodeRef}
      className={`${styles.eventCard} ${isDragging ? styles.dragging : ''} ${isResizing ? styles.resizing : ''} ${layout.event.isRecurring ? styles.recurring : ''}`}
      onClick={handleClick}
      style={style}
      {...listeners}
      {...attributes}
    >
      {/* Top resize handle */}
      {showResizeHandles && (
        <Box
          ref={topResizeRef}
          className={styles.resizeHandle}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            cursor: 'ns-resize',
            zIndex: 10,
          }}
          {...topResizeListeners}
          {...topResizeAttributes}
          onClick={e => {
            e.stopPropagation();
          }}
          onMouseDown={e => {
            e.stopPropagation();
            onResizeStart?.(layout.event.id, 'top');
          }}
          title="Resize event (drag to change start time)"
        />
      )}

      <Box className={styles.eventContent}>
        {layout.event.isRecurring && (
          <RepeatIcon
            className={styles.recurringIcon}
            fontSize="inherit"
            titleAccess="Recurring event"
          />
        )}
        <Typography variant="caption" className={styles.eventTitle}>
          {layout.event.title}
        </Typography>
      </Box>
      {layout.event.description && heightPixels > 30 && (
        <Typography variant="caption" className={styles.eventDescription}>
          {layout.event.description}
        </Typography>
      )}

      {/* Bottom resize handle */}
      {showResizeHandles && (
        <Box
          ref={bottomResizeRef}
          className={styles.resizeHandle}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            cursor: 'ns-resize',
            zIndex: 10,
          }}
          {...bottomResizeListeners}
          {...bottomResizeAttributes}
          onClick={e => {
            e.stopPropagation();
          }}
          onMouseDown={e => {
            e.stopPropagation();
            onResizeStart?.(layout.event.id, 'bottom');
          }}
          title="Resize event (drag to change end time)"
        />
      )}
    </Paper>
  );
};
