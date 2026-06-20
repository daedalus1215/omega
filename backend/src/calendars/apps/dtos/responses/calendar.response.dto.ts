import { Calendar } from '../../../domain/entities/calendar.entity';
import { CalendarRole } from '../../../domain/entities/calendar-role.type';

/**
 * Response shape for a calendar, optionally carrying the requesting user's role.
 */
export class CalendarResponseDto {
  id: number;
  name: string;
  color?: string;
  ownerId: number;
  isPersonal: boolean;
  role?: CalendarRole;
  createdAt: Date;
  updatedAt: Date;

  constructor(calendar: Calendar & { role?: CalendarRole }) {
    this.id = calendar.id;
    this.name = calendar.name;
    this.color = calendar.color;
    this.ownerId = calendar.ownerId;
    this.isPersonal = calendar.isPersonal;
    this.role = calendar.role;
    this.createdAt = calendar.createdAt;
    this.updatedAt = calendar.updatedAt;
  }
}
