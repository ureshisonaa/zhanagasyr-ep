import { IsUUID } from 'class-validator';

export class UploadDocumentDto {
  @IsUUID()
  public documentTypeId!: string;
}
