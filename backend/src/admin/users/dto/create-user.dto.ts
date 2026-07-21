import { IsEmail, IsIn, IsString, Length } from 'class-validator';
import { ALL_ROLE_NAMES } from '../../../common/constants/roles.constant';

export class CreateUserDto {
  @IsEmail()
  public email!: string;

  @IsString()
  @Length(8, 100)
  public password!: string;

  @IsString()
  @Length(1, 100)
  public firstName!: string;

  @IsString()
  @Length(1, 100)
  public lastName!: string;

  @IsIn(ALL_ROLE_NAMES)
  public role!: string;
}
