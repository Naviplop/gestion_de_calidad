import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateRootCauseAnalysisDto {
  @IsString()
  @MaxLength(50)
  methodology!: string;

  @IsOptional()
  analysisData?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  conclusion?: string;
}

export class UpdateRootCauseAnalysisDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  methodology?: string;

  @IsOptional()
  analysisData?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  conclusion?: string;
}
