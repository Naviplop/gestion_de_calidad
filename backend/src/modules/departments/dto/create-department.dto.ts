import { IsString, MaxLength, IsOptional, Matches, IsUUID } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @MaxLength(150)
  @Matches(/^[\p{L}\p{N}\s\-_.]+$/u)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUUID()
  parentDepartmentId?: string;
}
