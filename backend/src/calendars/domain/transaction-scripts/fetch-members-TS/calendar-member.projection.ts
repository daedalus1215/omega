import { CalendarRole } from '../../entities/calendar-role.type';

/**
 * A calendar member enriched with username for display.
 */
export type CalendarMemberProjection = {
  userId: number;
  username: string;
  role: CalendarRole;
};
