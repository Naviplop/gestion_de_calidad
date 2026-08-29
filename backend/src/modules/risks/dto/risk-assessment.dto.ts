import { IsString, IsOptional, IsIn, IsObject } from 'class-validator';

export class CreateRiskAssessmentDto {
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  probability!: string;

  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  impact!: string;

  @IsOptional()
  @IsObject()
  calculationData?: Record<string, unknown>;
}

export class UpdateRiskAssessmentDto {
  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  probability?: string;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  impact?: string;

  @IsOptional()
  @IsObject()
  calculationData?: Record<string, unknown>;
}
