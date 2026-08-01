import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type CreateCalendarEventCommand = {
  title: string;
  description?: string;
  color?: string;
  startDate: Date;
  endDate: Date;
  user: AuthUser;
  reminderMinutes?: number[];
  // Target calendar. Optional on the wire; the service defaults it to the
  // user's personal calendar when omitted.
  calendarId?: number;
};
