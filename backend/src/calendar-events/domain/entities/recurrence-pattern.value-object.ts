/**
 * Value object for recurrence pattern.
 * Pure TypeScript type with no TypeORM dependencies.
 */
export type RecurrencePattern = {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number; // For MVP: must be 1. For future: every N days/weeks/months/years
  daysOfWeek?: number[]; // For WEEKLY type: [1,3,5] for Mon,Wed,Fri (1=Monday, 7=Sunday)
  dayOfMonth?: number; // For MONTHLY type: day of month (1-31). Note: "Same day of week" patterns (e.g., first Monday) are post-MVP
  monthOfYear?: number; // For YEARLY type: month (1-12)
};
