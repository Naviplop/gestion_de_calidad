import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(255)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{12,}$/, {
    message: 'Password must contain uppercase, lowercase, number and symbol',
  })
  password!: string;
}
