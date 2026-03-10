import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CalendarEventEntity } from './calendar-event.entity';

/**
 * Infrastructure entity for EventReminder.
 * TypeORM entity for database persistence.
 */
@Entity({ name: 'event_reminders' })
@Index(['calendarEventId'])
export class EventReminderEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ name: 'calendar_event_id', type: 'int' })
  calendarEventId: number;

  @Column({ name: 'reminder_minutes', type: 'int' })
  reminderMinutes: number; // Minutes before event start

  @Column({ name: 'sent_at', type: 'datetime', nullable: true })
  sentAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToOne(() => CalendarEventEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'calendar_event_id' })
  calendarEvent?: CalendarEventEntity;
}
