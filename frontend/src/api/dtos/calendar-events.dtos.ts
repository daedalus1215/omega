export type EventReminderResponseDto = {
  id: number;
  calendarEventId: number;
  reminderMinutes: number;
  createdAt: string;
  updatedAt: string;
};

export type CalendarEventResponseDto = {
  id: number;
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

export type CreateCalendarEventRequest = {
  title: string;
  description?: string;
  color?: string;
  startDate: string;
  endDate: string;
  reminders?: CreateEventReminderRequest[];
  reminderMinutes?: number;
};

export type UpdateCalendarEventRequest = {
  title: string;
  description?: string;
  color?: string;
  startDate: string;
  endDate: string;
  reminders?: CreateEventReminderRequest[];
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
  createdAt: string;
  updatedAt: string;
};
