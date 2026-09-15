import { IsOptional, IsString, IsDate, IsNotEmpty } from 'class-validator';

export class UpdateNotificationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  message?: string;

  @IsOptional()
  @IsDate()
  readAt?: Date | null;
}
