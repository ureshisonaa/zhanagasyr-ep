import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { ApplicationStatus } from '@prisma/client';
import { AiSessionsService } from '../ai-sessions/ai-sessions.service';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { APPLICATION_STATUS_LABELS } from '../applications/utils/to-application-response.util';
import { ChatService } from '../chat/chat.service';
import { toMessageResponse } from '../chat/utils/to-chat-response.util';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { OpenAiService } from '../openai/openai.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AiChatDto } from './dto/ai-chat.dto';
import type { AiChatResponse } from './interfaces/ai-chat-response.interface';
import type { PromptDocumentInfo } from './interfaces/prompt-context.interface';
import { PromptBuilderService } from './prompt-builder.service';

const HISTORY_LIMIT = 20;
const KNOWLEDGE_SEARCH_LIMIT = 5;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly openAiService: OpenAiService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly aiSessionsService: AiSessionsService,
  ) {}

  /**
   * Пайплайн (Часть 3, §11 ТЗ): получает заявку -> определяет университет ->
   * получает историю сообщений -> ищет знания университета -> получает
   * документы пользователя -> формирует prompt -> отправляет в OpenAI ->
   * сохраняет ответ -> возвращает frontend.
   *
   * Только владелец заявки — не Mentor (в отличие от чтения истории чата,
   * ChatService.ensureCanRead): AI-ассистент отвечает конкретному студенту,
   * наставник не должен инициировать AI-диалог от его лица.
   */
  public async chat(currentUser: SanitizedUser, dto: AiChatDto): Promise<AiChatResponse> {
    const application = await this.getOwnedApplicationOrThrow(currentUser, dto.applicationId);

    const [history, knowledgeResults, documents] = await Promise.all([
      this.chatService.getRecentMessagesForApplication(dto.applicationId, HISTORY_LIMIT),
      this.embeddingsService.search(dto.message, {
        universityId: application.universityId,
        limit: KNOWLEDGE_SEARCH_LIMIT,
      }),
      this.getLinkedDocuments(dto.applicationId),
    ]);

    const messages = await this.promptBuilderService.build({
      user: { firstName: currentUser.firstName, lastName: currentUser.lastName },
      university: {
        name: application.university.name,
        city: application.university.city,
        country: application.university.country,
      },
      program: { name: application.program.name, degreeLevel: application.program.degreeLevel },
      currentStageLabel: APPLICATION_STATUS_LABELS[application.applicationStatus as ApplicationStatus],
      documents,
      knowledgeResults,
      history: history.map((message) => toMessageResponse(message)),
      userMessage: dto.message,
    });

    const completion = await this.openAiService.createChatCompletion(messages);

    // Учёт токенов (Этап 5.6) не должен блокировать сохранение ответа —
    // ответ пользователю важнее внутренней аналитики затрат.
    try {
      const session = await this.aiSessionsService.getOrStartActiveSessionForApplication(
        currentUser.id,
        dto.applicationId,
        this.openAiService.getModelName(),
      );
      await this.aiSessionsService.recordTokenUsage(session.id, completion.usage.totalTokens);
    } catch (error) {
      this.logger.warn(`Failed to record AI session token usage: ${String(error)}`);
    }

    return this.chatService.saveExchange(
      dto.applicationId,
      currentUser.id,
      dto.message,
      completion.content,
      completion.usage.completionTokens,
    );
  }

  private async getOwnedApplicationOrThrow(currentUser: SanitizedUser, applicationId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { university: true, program: true },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== currentUser.id) {
      throw new ForbiddenException('Only the application owner can use the AI assistant');
    }

    return application;
  }

  private async getLinkedDocuments(applicationId: string): Promise<PromptDocumentInfo[]> {
    const links = await this.prisma.applicationDocument.findMany({
      where: { applicationId },
      include: { document: { include: { documentType: true } } },
    });

    return links.map((link) => ({
      fileName: link.document.fileName,
      documentTypeName: link.document.documentType.name,
      status: link.document.status,
    }));
  }
}
