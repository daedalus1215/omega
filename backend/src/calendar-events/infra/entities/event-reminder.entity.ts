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
import { CalendarEventEntity } from './calendar-event.entity';

/**
 * Infrastructure entity for EventReminder.
 * TypeORM entity for database persistence.
 * An event may have many reminders, but only one per distinct offset.
 */
@Entity({ name: 'event_reminders' })
@Unique('UQ_event_reminders_event_minutes', [
  'calendarEventId',
  'reminderMinutes',
])
@Index(['calendarEventId'])
export class EventReminderEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'calendar_event_id', type: 'int' })
  calendarEventId: number;

  @Column({ name: 'reminder_minutes', type: 'int' })
  reminderMinutes: number; // Minutes before event start

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => CalendarEventEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'calendar_event_id' })
  calendarEvent?: CalendarEventEntity;
}
