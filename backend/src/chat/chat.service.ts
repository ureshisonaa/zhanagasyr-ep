import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Message, Prisma } from '@prisma/client';
import { ActivityLogService } from '../activity-log/activity-log.service';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { GLOBAL_READ_ROLES } from '../common/constants/roles.constant';
import { PrismaService } from '../prisma/prisma.service';
import type { QueryChatMessagesDto } from './dto/query-chat-messages.dto';
import type { SendMessageDto } from './dto/send-message.dto';
import type { ChatResponse } from './interfaces/chat-response.interface';
import type { MessageResponse } from './interfaces/message-response.interface';
import { toChatResponse, toMessageResponse } from './utils/to-chat-response.util';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  /** Вызывается ApplicationsService.create() внутри транзакции — 1:1 с заявкой. */
  public async createForApplication(
    applicationId: string,
    userId: string,
    title: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.chat.create({ data: { applicationId, userId, title } });
  }

  public async getByApplicationForUser(
    currentUser: SanitizedUser,
    applicationId: string,
    query: QueryChatMessagesDto,
  ): Promise<ChatResponse> {
    const application = await this.findApplicationOrThrow(applicationId);
    this.ensureCanRead(currentUser, application.userId);

    const chat = await this.prisma.chat.findUnique({ where: { applicationId } });

    if (!chat) {
      throw new NotFoundException('Chat not found for this application');
    }

    // Последние `limit` сообщений (или `limit` сообщений старше `before`,
    // если передан курсор — подгрузка истории при прокрутке вверх), но в
    // хронологическом порядке для отображения.
    const recentMessages = await this.prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      ...(query.before ? { cursor: { id: query.before }, skip: 1 } : {}),
    });
    recentMessages.reverse();

    return toChatResponse(chat, recentMessages);
  }

  /**
   * Пока без AI (Этап 5.2) — сохраняется только сообщение пользователя.
   * AI-ответ появится в Этапе 5.5 (Prompt Builder + AI Chat endpoint),
   * который будет вызывать OpenAiService (Этап 5.1) и дописывать сюда
   * сообщение с role=assistant.
   *
   * Строже, чем чтение: только владелец заявки может писать в чат — Mentor
   * видит переписку (GLOBAL_READ_ROLES), но не пишет в неё от лица
   * студента (для этого у наставника отдельный канал — MentorComments,
   * Фаза 10).
   */
  public async sendMessage(
    currentUser: SanitizedUser,
    dto: SendMessageDto,
  ): Promise<MessageResponse> {
    const application = await this.findApplicationOrThrow(dto.applicationId);
    this.ensureIsOwner(currentUser, application.userId);

    const chat = await this.prisma.chat.findUnique({ where: { applicationId: dto.applicationId } });

    if (!chat) {
      throw new NotFoundException('Chat not found for this application');
    }

    const message = await this.prisma.message.create({
      data: { chatId: chat.id, role: 'user', content: dto.content },
    });

    try {
      await this.activityLogService.log(
        dto.applicationId,
        currentUser.id,
        'ChatMessageSent',
        'Отправлено сообщение в чат',
      );
    } catch (logError) {
      this.logger.warn(`Failed to write activity log for chat message: ${String(logError)}`);
    }

    return toMessageResponse(message);
  }

  /**
   * Для внутреннего использования AiService (Этап 5.5) — доступ уже
   * проверен вызывающим кодом, повторная проверка здесь избыточна (тот же
   * принцип, что и DocumentsService.findApprovedDocumentsByTypeForUser).
   */
  public async getRecentMessagesForApplication(
    applicationId: string,
    limit: number,
  ): Promise<Message[]> {
    const chat = await this.prisma.chat.findUnique({ where: { applicationId } });

    if (!chat) {
      throw new NotFoundException('Chat not found for this application');
    }

    const messages = await this.prisma.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return messages.reverse();
  }

  /**
   * Атомарно сохраняет вопрос пользователя и ответ ассистента одной
   * транзакцией — если бы это были два отдельных вызова, сбой между ними
   * оставил бы в истории вопрос без ответа.
   */
  public async saveExchange(
    applicationId: string,
    userId: string,
    userContent: string,
    assistantContent: string,
    assistantTokens: number,
  ): Promise<{ userMessage: MessageResponse; assistantMessage: MessageResponse }> {
    const chat = await this.prisma.chat.findUnique({ where: { applicationId } });

    if (!chat) {
      throw new NotFoundException('Chat not found for this application');
    }

    const [userMessage, assistantMessage] = await this.prisma.$transaction([
      this.prisma.message.create({ data: { chatId: chat.id, role: 'user', content: userContent } }),
      this.prisma.message.create({
        data: {
          chatId: chat.id,
          role: 'assistant',
          content: assistantContent,
          tokens: assistantTokens,
        },
      }),
    ]);

    try {
      await this.activityLogService.log(
        applicationId,
        userId,
        'ChatMessageSent',
        'Отправлено сообщение AI-ассистенту',
      );
    } catch (logError) {
      this.logger.warn(`Failed to write activity log for AI chat exchange: ${String(logError)}`);
    }

    return {
      userMessage: toMessageResponse(userMessage),
      assistantMessage: toMessageResponse(assistantMessage),
    };
  }

  private async findApplicationOrThrow(applicationId: string): Promise<{ userId: string }> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { userId: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  private ensureCanRead(currentUser: SanitizedUser, ownerUserId: string): void {
    if (!GLOBAL_READ_ROLES.includes(currentUser.role) && ownerUserId !== currentUser.id) {
      throw new ForbiddenException('You do not have access to this chat');
    }
  }

  private ensureIsOwner(currentUser: SanitizedUser, ownerUserId: string): void {
    if (ownerUserId !== currentUser.id) {
      throw new ForbiddenException('Only the application owner can send messages in this chat');
    }
  }
}
