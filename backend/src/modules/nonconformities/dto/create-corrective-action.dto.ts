import { IsString, MaxLength, IsOptional, IsUUID, IsDate, IsBoolean, IsIn } from 'class-validator';

export class CreateCorrectiveActionDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(5000)
  description!: string;

  @IsUUID()
  responsibleId!: string;

  @IsOptional()
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsBoolean()
  effectivenessRequired?: boolean;
}

export class UpdateCorrectiveActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

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
  @IsIn(['OPEN', 'IN_PROGRESS', 'COMPLETED'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  effectivenessRequired?: boolean;
}
