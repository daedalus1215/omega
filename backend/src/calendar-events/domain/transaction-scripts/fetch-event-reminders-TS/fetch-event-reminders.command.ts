import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type FetchEventRemindersCommand = {
  calendarEventId: number;
  user: AuthUser;
};
