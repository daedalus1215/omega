import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateCalendarRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  color?: string;
}
