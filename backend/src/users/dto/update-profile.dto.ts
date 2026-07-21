import { IsDateString, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  public firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public lastName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Invalid phone number format' })
  public phone?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public country?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public city?: string;

  @IsOptional()
  @IsDateString()
  public birthDate?: string;
}
