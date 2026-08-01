import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MAX_REMINDERS_PER_EVENT,
  MAX_REMINDER_MINUTES,
} from '../../../../../domain/reminder.constants';

export class CreateCalendarEventRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  color?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  /** Offsets in minutes before the event start, one per reminder. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_REMINDERS_PER_EVENT)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(MAX_REMINDER_MINUTES, { each: true })
  reminderMinutes?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  calendarId?: number;
}
