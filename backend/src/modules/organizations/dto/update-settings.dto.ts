import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateSettingsDto {
  [key: string]: unknown;

  @IsOptional()
  @IsBoolean()
  allowPublicRegistration?: boolean;
}
