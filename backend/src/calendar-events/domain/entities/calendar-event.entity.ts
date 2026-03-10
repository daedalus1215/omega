/**
 * Domain entity for CalendarEvent.
 * Pure TypeScript type with no TypeORM dependencies.
 * Consolidates both one-time events and recurring event instances.
 * - If recurringEventId is undefined: one-time event
 * - If recurringEventId is defined: instance of a recurring event
 */
export type CalendarEvent = {
  id: number;
  userId: number;
  recurringEventId?: number; // undefined for one-time events
  instanceDate?: Date; // Date of this instance (for recurring events)
  title: string;
  description?: string;
  color?: string;
  startDate: Date;
  endDate: Date;
  isModified?: boolean; // True if this instance has been individually modified
  titleOverride?: string; // Override title for this instance
  descriptionOverride?: string; // Override description for this instance
  createdAt: Date;
  updatedAt: Date;
};
