import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type UpdateEventReminderCommand = {
  reminderId: number;
  reminderMinutes: number;
  user: AuthUser;
};
