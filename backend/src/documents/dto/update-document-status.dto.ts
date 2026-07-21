import { DocumentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class UpdateDocumentStatusDto {
  @IsEnum(DocumentStatus)
  public status!: DocumentStatus;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  public verificationResult?: string;
}
