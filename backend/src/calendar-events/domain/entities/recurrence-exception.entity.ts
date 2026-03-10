/**
 * Domain entity for RecurrenceException.
 * Pure TypeScript type with no TypeORM dependencies.
 */
export type RecurrenceException = {
  id: number;
  recurringEventId: number;
  exceptionDate: Date; // Date of the skipped/deleted instance
  createdAt: Date;
};
