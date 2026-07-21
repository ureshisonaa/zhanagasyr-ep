import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateProgramRequirementDto {
  @IsOptional()
  @IsUUID()
  public documentTypeId?: string;

  @IsString()
  @Length(1, 200)
  public label!: string;

  @IsOptional()
  @IsBoolean()
  public isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  public order?: number;
}
