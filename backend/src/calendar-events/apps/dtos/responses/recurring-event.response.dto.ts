import { RecurringEvent } from '../../../domain/entities/recurring-event.entity';

export type RecurrencePatternResponseDto = {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
};

export type RecurringEventResponseDto = {
  id: number;
  userId: number;
  title: string;
  description?: string;
  color?: string;
  startDate: Date;
  endDate: Date;
  recurrencePattern: RecurrencePatternResponseDto;
  recurrenceEndDate?: Date;
  noEndDate: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class RecurringEventResponseDtoClass {
  id: number;
  userId: number;
  title: string;
  description?: string;
  color?: string;
  startDate: Date;
  endDate: Date;
  recurrencePattern: RecurrencePatternResponseDto;
  recurrenceEndDate?: Date;
  noEndDate: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(event: RecurringEvent) {
    this.id = event.id;
    this.userId = event.userId;
    this.title = event.title;
    this.description = event.description;
    this.color = event.color;
    this.startDate = event.startDate;
    this.endDate = event.endDate;
    this.recurrencePattern = {
      type: event.recurrencePattern.type,
      interval: event.recurrencePattern.interval,
      daysOfWeek: event.recurrencePattern.daysOfWeek,
      dayOfMonth: event.recurrencePattern.dayOfMonth,
      monthOfYear: event.recurrencePattern.monthOfYear,
    };
    this.recurrenceEndDate = event.recurrenceEndDate;
    this.noEndDate = event.noEndDate;
    this.createdAt = event.createdAt;
    this.updatedAt = event.updatedAt;
  }
}
