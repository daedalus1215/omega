import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Infrastructure entity for RecurringEvent.
 * TypeORM entity for database persistence.
 */
@Entity({ name: 'recurring_events' })
export class RecurringEventEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

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

  @Column({ name: 'recurrence_type', type: 'varchar', length: 20 })
  recurrenceType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

  @Column({ name: 'recurrence_interval', type: 'int', default: 1 })
  recurrenceInterval: number;

  @Column({ name: 'days_of_week', type: 'varchar', length: 20, nullable: true })
  daysOfWeek?: string; // Comma-separated: "1,3,5" for Mon,Wed,Fri

  @Column({ name: 'day_of_month', type: 'int', nullable: true })
  dayOfMonth?: number;

  @Column({ name: 'month_of_year', type: 'int', nullable: true })
  monthOfYear?: number;

  @Column({ name: 'recurrence_end_date', type: 'datetime', nullable: true })
  recurrenceEndDate?: Date;

  @Column({ name: 'no_end_date', type: 'boolean', default: false })
  noEndDate: boolean;

  @Column({ name: 'rrule_string', type: 'text' })
  rruleString: string; // RFC 5545 RRULE string for rrule library

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;
}
