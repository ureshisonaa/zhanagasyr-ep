import { IsBoolean, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateMentorCommentDto {
  /** Хотя бы одно из applicationId/documentId обязательно — проверяется в сервисе. */
  @IsOptional()
  @IsUUID()
  public applicationId?: string;

  @IsOptional()
  @IsUUID()
  public documentId?: string;

  @IsString()
  @Length(1, 10000)
  public content!: string;

  @IsOptional()
  @IsBoolean()
  public isInternal?: boolean;
}
