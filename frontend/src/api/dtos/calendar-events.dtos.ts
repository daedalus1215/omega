export type EventReminderResponseDto = {
  id: number;
  calendarEventId: number;
  reminderMinutes: number;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEventResponseDto = {
  id: number;
  calendarId: number;
  userId: number;
  title: string;
  description?: string;
  color?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  isRecurring?: boolean;
  recurringEventId?: number;
  reminders?: EventReminderResponseDto[];
};

export type CreateEventReminderRequest = {
  reminderMinutes: number;
};

export type UpdateEventReminderRequest = {
  reminderMinutes: number;
};

/** Replaces an event's whole reminder set. An empty array clears them all. */
export type SyncEventRemindersRequest = {
  reminderMinutes: number[];
};

export type CreateCalendarEventRequest = {
  title: string;
  description?: string;
  color?: string;
  startDate: string;
  endDate: string;
  reminderMinutes?: number[];
  calendarId?: number;
};

export type UpdateCalendarEventRequest = {
  title: string;
  description?: string;
  color?: string;
  startDate: string;
  endDate: string;
};

export type RecurrencePatternDto = {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
};

export type CreateRecurringEventRequest = {
  title: string;
  description?: string;
  color?: string;
  startDate: string;
  endDate: string;
  recurrencePattern: RecurrencePatternDto;
  recurrenceEndDate?: string;
  noEndDate: boolean;
  reminderMinutes?: number;
  calendarId?: number;
};

export type RecurringEventResponseDto = {
  id: number;
  userId: number;
  title: string;
  description?: string;
  color?: string;
  startDate: string;
  endDate: string;
  recurrencePattern: RecurrencePatternDto;
  recurrenceEndDate?: string;
  noEndDate: boolean;
  reminderMinutes?: number;
  createdAt: string;
  updatedAt: string;
};
