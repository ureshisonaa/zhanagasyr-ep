import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateApplicationDto {
  @IsUUID()
  public universityId!: string;

  @IsUUID()
  public programId!: string;

  @IsUUID()
  public admissionCycleId!: string;

  @IsOptional()
  @IsDateString()
  public deadline?: string;
}
