import { IsOptional, IsString, Length } from 'class-validator';

export class CreateDocumentTypeDto {
  @IsString()
  @Length(1, 100)
  public name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  public description?: string;
}
