import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type UpdateCalendarEventCommand = {
  eventId: number;
  title: string;
  description?: string;
  color?: string;
  startDate: Date;
  endDate: Date;
  user: AuthUser;
};
