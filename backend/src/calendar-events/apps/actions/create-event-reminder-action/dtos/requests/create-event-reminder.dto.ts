import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateEventReminderRequestDto {
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  reminderMinutes: number;
}
