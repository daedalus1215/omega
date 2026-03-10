import { IsDateString, IsOptional } from 'class-validator';

export class FetchCalendarEventsRequestDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;
}
