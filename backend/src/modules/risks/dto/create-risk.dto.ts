import { IsString, IsUUID, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateRiskDto {
  @IsOptional()
  @IsUUID()
  processId?: string;

  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(5000)
  description!: string;

  @IsString()
  @IsIn(['INTERNAL', 'EXTERNAL', 'COMPLIANCE', 'OPERATIONAL', 'STRATEGIC', 'FINANCIAL', 'TECHNICAL', 'OTHER'])
  riskType!: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class UpdateRiskDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

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
  @IsIn(['INTERNAL', 'EXTERNAL', 'COMPLIANCE', 'OPERATIONAL', 'STRATEGIC', 'FINANCIAL', 'TECHNICAL', 'OTHER'])
  riskType?: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsUUID()
  processId?: string;
}
