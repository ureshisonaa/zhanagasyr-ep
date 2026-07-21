import { PartialType } from '@nestjs/mapped-types';
import { CreateProgramRequirementDto } from './create-program-requirement.dto';

export class UpdateProgramRequirementDto extends PartialType(CreateProgramRequirementDto) {}
