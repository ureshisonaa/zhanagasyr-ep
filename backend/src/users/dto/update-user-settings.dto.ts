import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

const ALLOWED_THEMES = ['Light', 'Dark'];

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsIn(ALLOWED_THEMES)
  public theme?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  public language?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  public timezone?: string;

  @IsOptional()
  @IsBoolean()
  public notificationsEmail?: boolean;
}
