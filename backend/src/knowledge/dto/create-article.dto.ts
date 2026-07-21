import { KnowledgeCategory } from '@prisma/client';
import { IsEnum, IsString, IsUUID, Length } from 'class-validator';

export class CreateArticleDto {
  @IsUUID()
  public universityId!: string;

  @IsString()
  @Length(1, 300)
  public title!: string;

  @IsEnum(KnowledgeCategory)
  public category!: KnowledgeCategory;

  @IsString()
  @Length(1, 50000)
  public content!: string;

  @IsString()
  @Length(1, 500)
  public source!: string;
}
