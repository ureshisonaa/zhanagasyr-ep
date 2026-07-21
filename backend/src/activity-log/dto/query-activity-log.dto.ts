import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Тот же паттерн, что и QueryChatMessagesDto (Этап 5.2) — "последние N", не пагинация страницами. */
export class QueryActivityLogDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  public limit: number = 50;
}
