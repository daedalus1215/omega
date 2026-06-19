import { CalendarMemberProjection } from '../../../domain/transaction-scripts/fetch-members-TS/calendar-member.projection';
import { CalendarRole } from '../../../domain/entities/calendar-role.type';

/**
 * Response shape for a calendar member.
 */
export class CalendarMemberResponseDto {
  userId: number;
  username: string;
  role: CalendarRole;

  constructor(projection: CalendarMemberProjection) {
    this.userId = projection.userId;
    this.username = projection.username;
    this.role = projection.role;
  }
}
