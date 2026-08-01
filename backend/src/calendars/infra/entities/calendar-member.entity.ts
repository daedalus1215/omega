import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ForeignKey,
  Index,
} from 'typeorm';
import { CalendarRole } from '../../domain/entities/calendar-role.type';

/**
 * Infrastructure entity for CalendarMember.
 * TypeORM entity for database persistence.
 * user_id is a bare integer column (no @ManyToOne to User) to keep the
 * calendars domain decoupled from the users domain. The foreign keys are
 * declared with @ForeignKey, which targets the table by name and so needs no
 * import of the users entity. Declaring them here is what stops
 * migration:generate from treating the constraints as drift and dropping them.
 */
@Entity({ name: 'calendar_members' })
@Index(['calendarId', 'userId'], { unique: true })
@Index(['userId'])
export class CalendarMemberEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'calendar_id', type: 'int' })
  @ForeignKey('CalendarEntity', { onDelete: 'CASCADE' })
  calendarId: number;

  @Column({ name: 'user_id', type: 'int' })
  @ForeignKey('User', { onDelete: 'CASCADE' })
  userId: number;

  @Column({ name: 'role', type: 'varchar', length: 10 })
  role: CalendarRole;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;
}
