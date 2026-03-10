import { RecurrencePattern } from './recurrence-pattern.value-object';

/**
 * Domain entity for RecurringEvent.
 * Pure TypeScript type with no TypeORM dependencies.
 */
export type RecurringEvent = {
  id: number;
  userId: number;
  title: string;
  description?: string;
  color?: string;
  startDate: Date; // First occurrence start date/time
  endDate: Date; // First occurrence end date/time
  recurrencePattern: RecurrencePattern; // Value object
  recurrenceEndDate?: Date; // Optional end date for series
  noEndDate: boolean; // Flag for infinite series
  createdAt: Date;
  updatedAt: Date;
};
