import { IsString, MaxLength, IsInt, IsOptional } from 'class-validator';

export class CreateDocumentVersionDto {
  @IsInt()
  versionMajor!: number;

  @IsInt()
  versionMinor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  versionLabel?: string;

  @IsString()
  fileAssetId!: string;

  @IsString()
  fileHash!: string;

  @IsString()
  changeReason!: string;
}
