import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { ChatService } from './chat.service';
import { QueryChatMessagesDto } from './dto/query-chat-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import type { ChatResponse } from './interfaces/chat-response.interface';
import type { MessageResponse } from './interfaces/message-response.interface';

/** Ни один роут не публичен — чат персональный. Удаления истории нет и не будет (ТЗ). */
@Controller('chat')
export class ChatController {
  public constructor(private readonly chatService: ChatService) {}

  @Get(':applicationId')
  public async getChat(
    @CurrentUser() user: SanitizedUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Query() query: QueryChatMessagesDto,
  ): Promise<{ success: true; chat: ChatResponse }> {
    const chat = await this.chatService.getByApplicationForUser(user, applicationId, query);
    return { success: true, chat };
  }

  @Post('message')
  public async sendMessage(
    @CurrentUser() user: SanitizedUser,
    @Body() dto: SendMessageDto,
  ): Promise<{ success: true; message: MessageResponse }> {
    const message = await this.chatService.sendMessage(user, dto);
    return { success: true, message };
  }
}
