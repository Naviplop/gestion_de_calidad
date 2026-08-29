import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateRiskControlDto {
  @IsString()
  @MaxLength(5000)
  description!: string;

  @IsString()
  @IsIn(['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'COMPENSATING', 'OTHER'])
  controlType!: string;

  @IsOptional()
  @IsString()
  @IsIn(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'NOT_EVALUATED'])
  effectiveness?: string;
}

export class UpdateRiskControlDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['PREVENTIVE', 'DETECTIVE', 'CORRECTIVE', 'COMPENSATING', 'OTHER'])
  controlType?: string;

  @IsOptional()
  @IsString()
  @IsIn(['EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE', 'NOT_EVALUATED'])
  effectiveness?: string;
}
