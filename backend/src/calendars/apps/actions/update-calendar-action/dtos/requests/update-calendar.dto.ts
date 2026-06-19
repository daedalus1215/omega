import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateCalendarRequestDto {
  @IsString()
  @IsOptional()
  @MaxLength(60)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  color?: string;
}
