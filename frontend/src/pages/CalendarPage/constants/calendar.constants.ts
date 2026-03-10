/**
 * Calendar view constants
 * Centralizes all magic numbers used throughout the calendar components
 */

export const CALENDAR_CONSTANTS = {
  /** Height of each hour slot in pixels */
  SLOT_HEIGHT: 60,
  
  /** Height of day column header on desktop */
  HEADER_HEIGHT: 60,
  
  /** Height of day column header on mobile */
  MOBILE_HEADER_HEIGHT: 55,
  
  /** Width of each day column on desktop */
  DAY_WIDTH: 150,
  
  /** Width of each day column on mobile */
  MOBILE_DAY_WIDTH: 100,
  
  /** Width of time column on desktop */
  TIME_COLUMN_WIDTH: 100,
  
  /** Width of time column on mobile */
  MOBILE_TIME_COLUMN_WIDTH: 50,
  
  /** Number of hours in a day */
  HOURS_PER_DAY: 24,
  
  /** Number of days to load when extending the range */
  DAYS_TO_LOAD: 30,
  
  /** Number of days from edge to trigger infinite scroll loading */
  SCROLL_THRESHOLD: 20, // Increased significantly to prevent too-aggressive loading
  
  /** Interval for updating current time indicator (1 minute) */
  TIME_UPDATE_INTERVAL: 60000,
  
  /** Delay for scroll animations on desktop (ms) */
  SCROLL_DELAY_DESKTOP: 150,
  
  /** Delay for scroll animations on mobile (ms) */
  SCROLL_DELAY_MOBILE: 300,
  
  /** Number of retry attempts for finding elements during scroll */
  SCROLL_RETRY_ATTEMPTS: 5,
  
  /** Snap interval for drag and drop in minutes */
  DRAG_SNAP_INTERVAL: 15,
  
  /** Number of extra columns to render on each side during virtualization */
  VIRTUALIZATION_OVERSCAN: 2,
  
  /** Number of hours to show before current time when scrolling to now */
  SCROLL_TO_NOW_OFFSET_HOURS: 2,
} as const;

export type CalendarConstants = typeof CALENDAR_CONSTANTS;

export const EVENT_COLORS = {
  indigo: { name: 'Indigo', value: '#6366f1', light: '#818cf8' },
  emerald: { name: 'Emerald', value: '#10b981', light: '#34d399' },
  rose: { name: 'Rose', value: '#f43f5e', light: '#fb7185' },
  amber: { name: 'Amber', value: '#f59e0b', light: '#fbbf24' },
  sky: { name: 'Sky', value: '#0ea5e9', light: '#38bdf8' },
  violet: { name: 'Violet', value: '#8b5cf6', light: '#a78bfa' },
  orange: { name: 'Orange', value: '#f97316', light: '#fb923c' },
  teal: { name: 'Teal', value: '#14b8a6', light: '#2dd4bf' },
  pink: { name: 'Pink', value: '#ec4899', light: '#f472b6' },
  slate: { name: 'Slate', value: '#64748b', light: '#94a3b8' },
} as const;

export type EventColorKey = keyof typeof EVENT_COLORS;
export type EventColor = typeof EVENT_COLORS[EventColorKey];

export const DEFAULT_EVENT_COLOR_KEY: EventColorKey = 'indigo';
