import { IsString, MaxLength, IsOptional, IsDate, IsUUID, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNonconformityDto {
  @IsOptional()
  @IsUUID()
  auditId?: string;

  @IsOptional()
  @IsUUID()
  findingId?: string;

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

  @IsIn(['MAJOR', 'MINOR', 'CRITICAL'])
  severity!: string;

  @Type(() => Date)
  @IsDate()
  detectedAt!: Date;

  @IsOptional()
  @IsUUID()
  responsibleId?: string;
}

export class UpdateNonconformityDto {
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
  @IsIn(['MAJOR', 'MINOR', 'CRITICAL'])
  severity?: string;

  @IsOptional()
  @IsUUID()
  responsibleId?: string;
}
