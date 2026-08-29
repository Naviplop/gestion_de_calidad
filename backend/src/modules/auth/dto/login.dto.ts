import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
