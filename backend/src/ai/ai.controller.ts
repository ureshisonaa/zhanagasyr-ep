import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai-chat.dto';
import type { AiChatResponse } from './interfaces/ai-chat-response.interface';

/**
 * Не публичен — персональный AI-ассистент. Rate limiting строже общего
 * (обещано ещё в main.ts, Этап 1.1: "появится вместе с auth и AI —
 * Этапы 1.1 и 5.5") — вызовы OpenAI дорогие и медленные.
 */
@Controller('ai')
export class AiController {
  public constructor(private readonly aiService: AiService) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('chat')
  public async chat(
    @CurrentUser() user: SanitizedUser,
    @Body() dto: AiChatDto,
  ): Promise<{ success: true } & AiChatResponse> {
    const result = await this.aiService.chat(user, dto);
    return { success: true, ...result };
  }
}
