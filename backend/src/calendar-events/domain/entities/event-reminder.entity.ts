/**
 * Domain entity for EventReminder.
 * Pure TypeScript type with no TypeORM dependencies.
 * Represents a reminder for a calendar event.
 */
export type EventReminder = {
  id: number;
  calendarEventId: number;
  reminderMinutes: number; // Minutes before event start
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};
