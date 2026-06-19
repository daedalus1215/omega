import { IsBoolean } from 'class-validator';

export class RespondToInvitationRequestDto {
  @IsBoolean()
  accept: boolean;
}
