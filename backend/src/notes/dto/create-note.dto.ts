import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @Length(1, 10000)
  public content!: string;

  @IsOptional()
  @IsBoolean()
  public isPinned?: boolean;

  /**
   * Применяется только если создающий — Mentor/Admin/SuperAdmin
   * (см. NotesService.create). Для Student игнорируется — скрывать
   * заметку от самого себя не имеет смысла.
   */
  @IsOptional()
  @IsBoolean()
  public isInternal?: boolean;
}
