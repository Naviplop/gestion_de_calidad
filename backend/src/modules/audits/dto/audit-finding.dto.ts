import { IsString, MaxLength, IsOptional, IsIn, IsUUID } from 'class-validator';

export class CreateAuditFindingDto {
  @IsOptional()
  @IsUUID()
  checklistItemId?: string;

  @IsOptional()
  @IsUUID()
  requirementId?: string;

  @IsIn(['NON_CONFORMITY', 'OBSERVATION', 'OPPORTUNITY'])
  findingType!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  evidence?: string;

  @IsOptional()
  @IsIn(['MAJOR', 'MINOR', 'CRITICAL'])
  severity?: string;
}

export class UpdateAuditFindingDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  evidence?: string;

  @IsOptional()
  @IsIn(['MAJOR', 'MINOR', 'CRITICAL'])
  severity?: string;

  @IsOptional()
  @IsIn(['OPEN', 'CLOSED'])
  status?: string;
}
