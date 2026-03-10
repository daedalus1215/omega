import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type FetchCalendarEventsCommand = {
  userId: number;
  startDate: Date;
  endDate: Date;
  user: AuthUser;
};
