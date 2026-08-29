import { IsString, MaxLength, IsOptional, Matches, IsBoolean, IsUUID } from 'class-validator';

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Matches(/^[a-zA-Z0-9\s\-_.]+$/)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  parentDepartmentId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
