import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class UpdateEventReminderRequestDto {
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  reminderMinutes: number;
}
