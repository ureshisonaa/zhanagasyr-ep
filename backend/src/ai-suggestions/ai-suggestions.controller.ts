import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { AiSuggestionsService } from './ai-suggestions.service';
import type { SuggestionResponse } from './interfaces/suggestion-response.interface';

/** Ни один роут не публичен — рекомендации персональные, по заявке. */
@Controller('ai-suggestions')
export class AiSuggestionsController {
  public constructor(private readonly aiSuggestionsService: AiSuggestionsService) {}

  @Get(':applicationId')
  public async findAll(
    @CurrentUser() user: SanitizedUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<{ success: true; suggestions: SuggestionResponse[] }> {
    const suggestions = await this.aiSuggestionsService.findAllForApplication(user, applicationId);
    return { success: true, suggestions };
  }

  /** Строже общего лимита — вызов OpenAI дорогой, тот же принцип, что и /ai/chat (Этап 5.5). */
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post(':applicationId/generate')
  public async generate(
    @CurrentUser() user: SanitizedUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<{ success: true; suggestion: SuggestionResponse }> {
    const suggestion = await this.aiSuggestionsService.generateStoredSuggestion(user, applicationId);
    return { success: true, suggestion };
  }

  @HttpCode(HttpStatus.OK)
  @Put(':id/dismiss')
  public async dismiss(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.aiSuggestionsService.dismiss(user, id);
    return { success: true };
  }
}
