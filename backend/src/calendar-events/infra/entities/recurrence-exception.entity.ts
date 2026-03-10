import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { RecurringEventEntity } from './recurring-event.entity';

/**
 * Infrastructure entity for RecurrenceException.
 * TypeORM entity for database persistence.
 */
@Entity({ name: 'recurrence_exceptions' })
@Unique(['recurringEventId', 'exceptionDate'])
@Index(['recurringEventId'])
@Index(['exceptionDate'])
export class RecurrenceExceptionEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'recurring_event_id', type: 'int' })
  recurringEventId: number;

  @Column({ name: 'exception_date', type: 'date' })
  exceptionDate: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => RecurringEventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recurring_event_id' })
  recurringEvent: RecurringEventEntity;
}
