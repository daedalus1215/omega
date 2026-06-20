import { CalendarRole } from './calendar-role.type';

/**
 * Domain entity for CalendarMember.
 * Pure TypeScript type with no TypeORM dependencies.
 * Join between a calendar and a user. References userId as a bare integer to
 * avoid cross-domain coupling to the User entity.
 */
export type CalendarMember = {
  id: number;
  calendarId: number;
  userId: number;
  role: CalendarRole;
  createdAt: Date;
};
