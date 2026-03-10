import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { RecurrencePattern } from '../../entities/recurrence-pattern.value-object';

export type CreateRecurringEventCommand = {
  title: string;
  description?: string;
  color?: string;
  startDate: Date;
  endDate: Date;
  recurrencePattern: RecurrencePattern;
  recurrenceEndDate?: Date;
  noEndDate: boolean;
  user: AuthUser;
};
