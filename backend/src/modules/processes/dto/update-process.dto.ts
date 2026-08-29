import { IsString, MaxLength, IsOptional, Matches, IsBoolean, IsUUID } from 'class-validator';

export class UpdateProcessDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9\-]+$/)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsUUID()
  areaId?: string;

  @IsOptional()
  @IsUUID()
  parentProcessId?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  processType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
