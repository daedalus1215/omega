import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type CreateCalendarEventCommand = {
  title: string;
  description?: string;
  color?: string;
  startDate: Date;
  endDate: Date;
  user: AuthUser;
  reminderMinutes?: number;
};
