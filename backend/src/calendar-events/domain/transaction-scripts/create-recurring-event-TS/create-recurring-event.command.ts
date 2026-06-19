import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { RecurrencePattern } from '../../entities/recurrence-pattern.value-object';

export type CreateRecurringEventCommand = {
  title: string;
  description?: string;
  color?: string;
  startDate: Date;
  endDate: Date;
  recurrencePattern: RecurrencePattern;
  recurrenceEndDate?: Date;
  noEndDate: boolean;
  reminderMinutes?: number;
  user: AuthUser;
  // Target calendar. Optional on the wire; the service defaults it to the
  // user's personal calendar when omitted.
  calendarId?: number;
};
