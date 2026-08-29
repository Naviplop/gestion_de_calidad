import { IsString, MaxLength, IsOptional, IsIn } from 'class-validator';

export class CreateVerificationDto {
  @IsIn(['EFFECTIVE', 'NOT_EFFECTIVE'])
  effectivenessStatus!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  evidence?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comments?: string;
}
