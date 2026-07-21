import { AdmissionSeason } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsString, Length, Max, Min } from 'class-validator';

export class CreateAdmissionCycleDto {
  @IsString()
  @Length(1, 100)
  public name!: string;

  @IsEnum(AdmissionSeason)
  public season!: AdmissionSeason;

  @IsInt()
  @Min(2000)
  @Max(2100)
  public year!: number;

  @IsDateString()
  public startDate!: string;

  @IsDateString()
  public endDate!: string;
}
