import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateApplicationDocumentDto {
  @IsUUID()
  public applicationId!: string;

  @IsUUID()
  public documentId!: string;

  @IsOptional()
  @IsBoolean()
  public isShared?: boolean;
}
