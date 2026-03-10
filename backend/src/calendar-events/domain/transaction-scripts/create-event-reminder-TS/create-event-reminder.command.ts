import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type CreateEventReminderCommand = {
  calendarEventId: number;
  reminderMinutes: number;
  user: AuthUser;
};
