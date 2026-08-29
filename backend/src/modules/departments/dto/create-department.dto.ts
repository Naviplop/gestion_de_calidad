import { IsString, MaxLength, IsOptional, Matches, IsUUID } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @MaxLength(150)
  @Matches(/^[a-zA-Z0-9\s\-_.]+$/)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  parentDepartmentId?: string;
}
