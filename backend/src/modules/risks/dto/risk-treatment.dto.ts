import { IsString, IsUUID, IsOptional, IsIn, IsDate, MaxLength } from 'class-validator';

export class CreateRiskTreatmentDto {
  @IsString()
  @IsIn(['AVOID', 'MITIGATE', 'TRANSFER', 'ACCEPT', 'EXPLOIT', 'ENHANCE', 'SHARE'])
  strategy!: string;

  @IsString()
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsUUID()
  responsibleId?: string;

  @IsOptional()
  @IsDate()
  dueDate?: Date;
}

export class UpdateRiskTreatmentDto {
  @IsOptional()
  @IsString()
  @IsIn(['AVOID', 'MITIGATE', 'TRANSFER', 'ACCEPT', 'EXPLOIT', 'ENHANCE', 'SHARE'])
  strategy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsUUID()
  responsibleId?: string;

  @IsOptional()
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsString()
  @IsIn(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsDate()
  completedAt?: Date;
}
