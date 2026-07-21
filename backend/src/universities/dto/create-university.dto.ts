import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class CreateUniversityDto {
  @IsString()
  @Length(1, 200)
  public name!: string;

  @IsString()
  @Length(1, 100)
  public country!: string;

  @IsString()
  @Length(1, 100)
  public city!: string;

  @IsOptional()
  @IsUrl()
  public logo?: string;

  @IsOptional()
  @IsUrl()
  public website?: string;

  @IsOptional()
  @IsString()
  @Length(1, 5000)
  public description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  public ranking?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  public tuition?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'Currency must be a 3-letter ISO code, e.g. USD' })
  public currency?: string;
}
