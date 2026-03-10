import { CalendarEvent } from '../../../domain/entities/calendar-event.entity';
import { EventReminderResponseDto } from '../../actions/fetch-event-reminders-action/dtos/responses/event-reminder.response.dto';

export class CalendarEventResponseDto {
  id: number;
  userId: number;
  title: string;
  description?: string;
  color?: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
  isRecurring?: boolean;
  recurringEventId?: number;
  reminders?: EventReminderResponseDto[];

  constructor(event: CalendarEvent, reminders?: EventReminderResponseDto[]) {
    this.id = event.id;
    this.userId = event.userId;
    this.title = event.title;
    this.description = event.description;
    this.color = event.color;
    this.startDate = event.startDate;
    this.endDate = event.endDate;
    this.createdAt = event.createdAt;
    this.updatedAt = event.updatedAt;
    this.isRecurring = event.recurringEventId !== null;
    this.recurringEventId = event.recurringEventId;
    this.reminders = reminders;
  }
}
