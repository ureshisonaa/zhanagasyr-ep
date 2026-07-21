import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateMentorCommentDto {
  @IsOptional()
  @IsString()
  @Length(1, 10000)
  public content?: string;

  @IsOptional()
  @IsBoolean()
  public isInternal?: boolean;
}
