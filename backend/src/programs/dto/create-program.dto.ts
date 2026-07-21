import { DegreeLevel } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateProgramDto {
  @IsUUID()
  public universityId!: string;

  @IsString()
  @Length(1, 200)
  public name!: string;

  @IsEnum(DegreeLevel)
  public degreeLevel!: DegreeLevel;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  public description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public duration?: string;
}
