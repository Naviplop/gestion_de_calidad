import { IsString, MaxLength, IsUUID, IsOptional } from 'class-validator';

export class CreateAuditChecklistDto {
  @IsString()
  @MaxLength(255)
  name!: string;
}

export class CreateAuditChecklistItemDto {
  @IsOptional()
  @IsUUID()
  requirementId?: string;

  @IsString()
  @MaxLength(5000)
  question!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sortOrder?: number;
}

export class UpdateAuditChecklistItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  response?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  evidence?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comments?: string;
}
