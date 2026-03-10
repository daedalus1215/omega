import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

/**
 * Command for deleting a recurring event.
 */
export type DeleteRecurringEventCommand = {
  recurringEventId: number;
  user: AuthUser;
};
