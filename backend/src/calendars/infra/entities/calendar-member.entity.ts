import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { CalendarRole } from '../../domain/entities/calendar-role.type';

/**
 * Infrastructure entity for CalendarMember.
 * TypeORM entity for database persistence.
 * user_id is a bare integer column (no @ManyToOne to User) to keep the
 * calendars domain decoupled from the users domain.
 */
@Entity({ name: 'calendar_members' })
@Index(['calendarId', 'userId'], { unique: true })
@Index(['userId'])
export class CalendarMemberEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'calendar_id', type: 'int' })
  calendarId: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'role', type: 'varchar', length: 10 })
  role: CalendarRole;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
