import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  username: string;
  @IsEmail()
  email: string;
  @MinLength(6)
  password: string;
}
