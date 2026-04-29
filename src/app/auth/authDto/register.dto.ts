import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  username: string;
  @IsEmail()
  email: string;
  @IsString()
  @MinLength(6)
  password: string;
}
