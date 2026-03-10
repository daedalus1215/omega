import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type DeleteEventReminderCommand = {
  reminderId: number;
  user: AuthUser;
};
