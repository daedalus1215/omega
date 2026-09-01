import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type SearchCalendarEventsCommand = {
  query: string;
  user: AuthUser;
};
