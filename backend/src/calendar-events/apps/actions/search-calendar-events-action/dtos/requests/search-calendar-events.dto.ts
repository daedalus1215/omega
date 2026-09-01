import { IsString, MaxLength } from 'class-validator';

/**
 * Request DTO for searching calendar events by name.
 */
export class SearchCalendarEventsRequestDto {
  @IsString()
  @MaxLength(200)
  query: string;
}
