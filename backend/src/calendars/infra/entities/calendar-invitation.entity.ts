import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { InvitationStatus } from '../../domain/entities/invitation-status.type';

/**
 * Infrastructure entity for CalendarInvitation.
 * TypeORM entity for database persistence. References user ids as bare
 * integers to keep the calendars domain decoupled from the users domain.
 */
@Entity({ name: 'calendar_invitations' })
@Index(['inviteeId'])
export class CalendarInvitationEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'calendar_id', type: 'int' })
  calendarId: number;

  @Column({ name: 'inviter_id', type: 'int' })
  inviterId: number;

  @Column({ name: 'invitee_id', type: 'int' })
  inviteeId: number;

  @Column({ name: 'status', type: 'varchar', length: 10, default: 'pending' })
  status: InvitationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'responded_at', type: 'datetime', nullable: true })
  respondedAt?: Date;
}
