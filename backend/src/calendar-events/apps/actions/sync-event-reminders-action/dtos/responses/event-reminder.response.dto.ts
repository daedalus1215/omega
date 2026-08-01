import { EventReminder } from '../../../../../domain/entities/event-reminder.entity';

export class EventReminderResponseDto {
  id: number;
  calendarEventId: number;
  reminderMinutes: number;
  sentAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(reminder: EventReminder) {
    this.id = reminder.id;
    this.calendarEventId = reminder.calendarEventId;
    this.reminderMinutes = reminder.reminderMinutes;
    this.sentAt = reminder.sentAt;
    this.createdAt = reminder.createdAt;
    this.updatedAt = reminder.updatedAt;
  }
}
