import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { RecurringEventEntity } from './recurring-event.entity';

/**
 * Infrastructure entity for CalendarEvent.
 * TypeORM entity for database persistence.
 * Consolidates both one-time events and recurring event instances.
 * - If recurring_event_id is NULL: one-time event
 * - If recurring_event_id is NOT NULL: instance of a recurring event
 */
@Entity({ name: 'calendar_events' })
@Unique(['recurringEventId', 'instanceDate'])
@Index(['recurringEventId'])
@Index(['instanceDate'])
export class CalendarEventEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @Column({ name: 'recurring_event_id', type: 'int', nullable: true })
  recurringEventId?: number;

  @Column({ name: 'instance_date', type: 'date', nullable: true })
  instanceDate?: Date; // Date of this instance (for recurring events)

  @Column({ name: 'title', type: 'varchar', length: 255 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'color', type: 'varchar', length: 20, nullable: true })
  color?: string;

  @Column({ name: 'start_date', type: 'datetime' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'datetime' })
  endDate: Date;

  @Column({
    name: 'is_modified',
    type: 'boolean',
    default: false,
    nullable: true,
  })
  isModified?: boolean; // True if this instance has been individually modified

  @Column({
    name: 'title_override',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  titleOverride?: string; // Override title for this instance

  @Column({ name: 'description_override', type: 'text', nullable: true })
  descriptionOverride?: string; // Override description for this instance

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToOne(() => RecurringEventEntity, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'recurring_event_id' })
  recurringEvent?: RecurringEventEntity;
}
