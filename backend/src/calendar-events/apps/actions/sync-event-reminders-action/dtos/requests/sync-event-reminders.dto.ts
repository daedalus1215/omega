import { ArrayMaxSize, IsArray, IsInt, Max, Min } from 'class-validator';
import {
  MAX_REMINDERS_PER_EVENT,
  MAX_REMINDER_MINUTES,
} from '../../../../../domain/reminder.constants';

export class SyncEventRemindersRequestDto {
  /**
   * The complete desired set of offsets, in minutes before the event starts.
   * An empty array removes every reminder. Duplicates are collapsed.
   */
  @IsArray()
  @ArrayMaxSize(MAX_REMINDERS_PER_EVENT)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(MAX_REMINDER_MINUTES, { each: true })
  reminderMinutes: number[];
}
