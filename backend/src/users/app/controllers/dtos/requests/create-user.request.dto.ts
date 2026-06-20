import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEmail,
} from 'class-validator';

export class RegisterUserRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  @IsEmail(
    { require_tld: true, allow_ip_domain: false },
    { message: 'username must be a valid email address' }
  )
  readonly username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(50)
  readonly password: string;
}
