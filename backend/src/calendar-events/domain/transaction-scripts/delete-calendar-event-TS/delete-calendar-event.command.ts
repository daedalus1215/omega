import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

/**
 * Command for deleting a calendar event.
 */
export type DeleteCalendarEventCommand = {
  eventId: number;
  user: AuthUser;
};
