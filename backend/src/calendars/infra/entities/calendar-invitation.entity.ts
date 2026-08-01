import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ForeignKey,
  Index,
} from 'typeorm';
import { InvitationStatus } from '../../domain/entities/invitation-status.type';

/**
 * Infrastructure entity for CalendarInvitation.
 * TypeORM entity for database persistence. References user ids as bare
 * integers to keep the calendars domain decoupled from the users domain;
 * @ForeignKey targets tables by name, so the constraints exist without an
 * import of the users entity.
 *
 * The partial unique index allows only one pending invitation per calendar and
 * invitee, while leaving any number of accepted or declined rows in the
 * history. Declaring it here is what stops migration:generate from dropping
 * it as drift.
 */
@Entity({ name: 'calendar_invitations' })
@Index(['calendarId', 'inviteeId'], {
  unique: true,
  where: "status = 'pending'",
})
@Index(['inviteeId'])
export class CalendarInvitationEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'calendar_id', type: 'int' })
  @ForeignKey('CalendarEntity', { onDelete: 'CASCADE' })
  calendarId: number;

  @Column({ name: 'inviter_id', type: 'int' })
  @ForeignKey('User', { onDelete: 'CASCADE' })
  inviterId: number;

  @Column({ name: 'invitee_id', type: 'int' })
  @ForeignKey('User', { onDelete: 'CASCADE' })
  inviteeId: number;

  @Column({ name: 'status', type: 'varchar', length: 10, default: 'pending' })
  status: InvitationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @Column({ name: 'responded_at', type: 'datetime', nullable: true })
  respondedAt?: Date;
}
