import { IsString, IsNotEmpty, IsUrl, Length } from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name!: string;

  @IsString()
  @IsUrl({ require_protocol: true })
  @Length(1, 200)
  logoUrl!: string;
}
