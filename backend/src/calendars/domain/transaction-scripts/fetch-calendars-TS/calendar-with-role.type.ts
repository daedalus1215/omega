import { Calendar } from '../../entities/calendar.entity';
import { CalendarRole } from '../../entities/calendar-role.type';

/**
 * A calendar paired with the requesting user's role on it.
 */
export type CalendarWithRole = Calendar & {
  role: CalendarRole;
};
