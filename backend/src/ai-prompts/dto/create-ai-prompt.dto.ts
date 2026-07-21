import { IsOptional, IsString, Length } from 'class-validator';

export class CreateAiPromptDto {
  @IsString()
  @Length(1, 100)
  public name!: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  public description?: string;

  @IsString()
  @Length(1, 20000)
  public prompt!: string;
}
