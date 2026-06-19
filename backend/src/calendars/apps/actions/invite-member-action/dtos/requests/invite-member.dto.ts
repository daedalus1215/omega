import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class InviteMemberRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username: string;
}
