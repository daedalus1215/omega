import { Modifier } from '@dnd-kit/core';
import { CALENDAR_CONSTANTS } from '../constants/calendar.constants';
import { snapToInterval, minutesToPixels } from './scroll.utils';

/**
 * Modifier that snaps drag position to time slot intervals
 * Ensures events align to 15-minute increments when dragging
 */
export const snapToTimeSlot: Modifier = ({ transform }) => {
  const snapPixels = minutesToPixels(CALENDAR_CONSTANTS.DRAG_SNAP_INTERVAL);

  return {
    ...transform,
    x: transform.x, // Keep horizontal movement as-is
    y: snapToInterval(transform.y, snapPixels), // Snap vertical movement
    scaleX: 1,
    scaleY: 1,
  };
};
