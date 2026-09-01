import { IsString, MaxLength, IsOptional, IsUUID, IsDate } from 'class-validator';

export class CreateAuditDto {
  @IsOptional()
  @IsUUID()
  auditProgramId?: string;

  @IsOptional()
  @IsUUID()
  processId?: string;

  @IsOptional()
  @IsUUID()
  leadAuditorId?: string;

  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  auditType?: string;

  @IsOptional()
  @IsDate()
  plannedStart?: Date;

  @IsOptional()
  @IsDate()
  plannedEnd?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  scope?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  objective?: string;
}

export class UpdateAuditDto {
  @IsOptional()
  @IsUUID()
  auditProgramId?: string;

  @IsOptional()
  @IsUUID()
  processId?: string;

  @IsOptional()
  @IsUUID()
  leadAuditorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  auditType?: string;

  @IsOptional()
  @IsDate()
  plannedStart?: Date;

  @IsOptional()
  @IsDate()
  plannedEnd?: Date;

  @IsOptional()
  @IsDate()
  actualStart?: Date;

  @IsOptional()
  @IsDate()
  actualEnd?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  scope?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  objective?: string;
}
