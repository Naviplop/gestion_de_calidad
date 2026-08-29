import { IsString, MinLength, MaxLength, IsEmail, IsOptional, IsBoolean, IsArray, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(255)
  password!: string;

  @IsString()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  roleIds!: string[];

  @IsBoolean()
  mfaEnabled!: boolean;
}
