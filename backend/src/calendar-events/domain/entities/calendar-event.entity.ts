/**
 * Domain entity for CalendarEvent.
 * Pure TypeScript type with no TypeORM dependencies.
 * Consolidates both one-time events and recurring event instances.
 * - If recurringEventId is undefined: one-time event
 * - If recurringEventId is defined: instance of a recurring event
 */
export type CalendarEvent = {
  id: number;
  calendarId: number; // Calendar this event belongs to
  userId: number; // Creator of the event (created_by label)
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
  remindersCustomized?: boolean; // True if the user set this event's reminders explicitly
  createdAt: Date;
  updatedAt: Date;
};
