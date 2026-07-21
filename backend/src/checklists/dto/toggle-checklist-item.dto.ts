import { IsBoolean } from 'class-validator';

export class ToggleChecklistItemDto {
  @IsBoolean()
  public isCompleted!: boolean;
}
