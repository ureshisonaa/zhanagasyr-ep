import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAdmissionCycleDto } from './create-admission-cycle.dto';

export class UpdateAdmissionCycleDto extends PartialType(CreateAdmissionCycleDto) {
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}
