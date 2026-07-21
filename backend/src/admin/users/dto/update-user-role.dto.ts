import { IsIn } from 'class-validator';
import { ALL_ROLE_NAMES } from '../../../common/constants/roles.constant';

export class UpdateUserRoleDto {
  @IsIn(ALL_ROLE_NAMES)
  public role!: string;
}
