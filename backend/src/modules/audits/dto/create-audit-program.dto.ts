import { IsString, MaxLength, IsOptional, IsDate, IsUUID, IsIn } from 'class-validator';

export class CreateAuditProgramDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsDate()
  periodStart!: Date;

  @IsDate()
  periodEnd!: Date;

  @IsOptional()
  @IsUUID()
  responsibleId?: string;
}

export class UpdateAuditProgramDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsDate()
  periodStart?: Date;

  @IsOptional()
  @IsDate()
  periodEnd?: Date;

  @IsOptional()
  @IsUUID()
  responsibleId?: string;

  @IsOptional()
  @IsIn(['PLANNED', 'COMPLETED', 'CANCELLED'])
  status?: string;
}
