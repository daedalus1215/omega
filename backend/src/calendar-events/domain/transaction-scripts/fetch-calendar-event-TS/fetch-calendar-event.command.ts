import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type FetchCalendarEventCommand = {
  eventId: number;
  user: AuthUser;
};
