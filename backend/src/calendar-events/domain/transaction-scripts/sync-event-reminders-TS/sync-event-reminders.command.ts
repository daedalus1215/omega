import { AuthUser } from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';

export type SyncEventRemindersCommand = {
  calendarEventId: number;
  /** The complete desired set of offsets. An empty array clears all reminders. */
  reminderMinutes: number[];
  user: AuthUser;
};
