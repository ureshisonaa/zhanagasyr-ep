import { Injectable } from '@nestjs/common';
import { AiPromptsService } from '../ai-prompts/ai-prompts.service';
import type { ChatMessage } from '../openai/openai.service';
import type { PromptContext, PromptDocumentInfo } from './interfaces/prompt-context.interface';
import type { KnowledgeSearchResult } from '../embeddings/interfaces/knowledge-search-result.interface';

/** Ключ записи в AiPrompts (Этап 11.3) — Admin может переопределить, создав запись с этим `name`. */
const CHAT_SYSTEM_PROMPT_NAME = 'chat_system_prompt';

/**
 * Этап 12.3 (AI Cost Optimization) — ограничение длины контекста.
 *
 * AiService.HISTORY_LIMIT=20 ограничивает КОЛИЧЕСТВО сообщений истории, но
 * не их совокупную длину — одно сообщение может быть до 10 000 символов
 * (SendMessageDto), значит 20 сообщений теоретически до 200 000 символов
 * (~50 000+ токенов) на один запрос. Лимиты здесь — вторая, независимая
 * линия защиты на уровне сборки промпта, а не полагание только на лимит
 * количества выше по стеку.
 */
const MAX_HISTORY_MESSAGE_CHARS = 2000;
const MAX_TOTAL_HISTORY_CHARS = 8000;
const MAX_KNOWLEDGE_RESULT_CHARS = 1500;
const TRUNCATION_SUFFIX = '… (обрезано для контроля стоимости запроса к OpenAI)';

/**
 * Часть 3, п.11 ТЗ: "Если информации нет в базе знаний, ИИ должен честно
 * сообщить об этом и предложить обратиться к наставнику, а не придумывать
 * ответ." — это указание модели через промпт (best-effort направление
 * поведения), а не программная гарантия: полностью исключить "выдумывание"
 * кодом невозможно, честность ответа зависит от следования моделью
 * инструкции. Здесь — стандартный и единственно доступный на уровне
 * backend способ снизить такой риск в RAG-архитектуре.
 *
 * Это ФОЛБЭК по умолчанию (Этап 11.3) — реальный текст берётся из AiPrompts
 * (`AiPromptsService.getByNameOrDefault`), если Admin создал запись с
 * именем CHAT_SYSTEM_PROMPT_NAME; иначе используется этот текст, чтобы
 * платформа работала из коробки без обязательной настройки.
 */
const DEFAULT_SYSTEM_PROMPT = [
  'Ты — AI-консультант образовательной платформы ZhanaGasyr, помогающий студенту с поступлением',
  'в конкретный университет по конкретной программе.',
  '',
  'Правила:',
  '1. Отвечай ТОЛЬКО на основе материалов базы знаний и контекста заявки студента ниже.',
  '2. Если информации для ответа недостаточно — честно скажи об этом и предложи студенту',
  '   обратиться к своему наставнику. Никогда не придумывай факты.',
  '3. Учитывай текущий этап поступления студента и будь конкретным и практичным.',
  '4. Отвечай на языке вопроса студента.',
].join('\n');

/**
 * Кэширование частых вопросов (Roadmap, Этап 12.3, помечено "если
 * применимо") — НЕ реализовано здесь осознанно, а не пропущено по
 * недосмотру: финальный ответ AI глубоко персонализирован — включает имя
 * студента, конкретный университет/программу, конкретный список
 * документов и текущий этап ЕГО заявки (см. buildSystemMessageContent).
 * Кэш по тексту вопроса неизбежно отдал бы одному студенту персональный
 * контекст другого при формально похожем вопросе — это баг корректности,
 * а не оптимизация. Более узкое и безопасное кэширование (результатов
 * embedding-поиска по базе знаний, university-scoped, не студенческое)
 * теоретически применимо, но живёт в EmbeddingsService/AiService, а не в
 * prompt-builder.service.ts — файле, на который явно ограничен этот этап.
 */
@Injectable()
export class PromptBuilderService {
  public constructor(private readonly aiPromptsService: AiPromptsService) {}

  /**
   * Структура (Часть 3, п.12 ТЗ): System Prompt -> информация о
   * пользователе -> университет/программа -> история диалога -> найденные
   * документы -> результаты поиска по базе знаний -> сообщение пользователя.
   * Контекстные блоки (всё, кроме истории и текущего вопроса) объединены в
   * одно system-сообщение; история передаётся как настоящая
   * последовательность ролей user/assistant, чтобы модель видела реальный
   * ход диалога, а не его текстовый пересказ.
   */
  public async build(context: PromptContext): Promise<ChatMessage[]> {
    const systemPrompt = await this.aiPromptsService.getByNameOrDefault(
      CHAT_SYSTEM_PROMPT_NAME,
      DEFAULT_SYSTEM_PROMPT,
    );

    const systemMessage: ChatMessage = {
      role: 'system',
      content: this.buildSystemMessageContent(context, systemPrompt),
    };

    const historyMessages: ChatMessage[] = this.limitHistory(context.history).map((message) => ({
      role: this.normalizeHistoryRole(message.role),
      content: message.content,
    }));

    const currentUserMessage: ChatMessage = { role: 'user', content: context.userMessage };

    return [systemMessage, ...historyMessages, currentUserMessage];
  }

  private buildSystemMessageContent(context: PromptContext, systemPrompt: string): string {
    const sections = [
      systemPrompt,
      this.formatUserSection(context.user),
      this.formatUniversitySection(context),
      this.formatDocumentsSection(context.documents),
      this.formatKnowledgeSection(context.knowledgeResults),
    ];

    return sections.join('\n\n');
  }

  private formatUserSection(user: PromptContext['user']): string {
    return `## Информация о студенте\nИмя: ${user.firstName} ${user.lastName}`;
  }

  private formatUniversitySection(context: PromptContext): string {
    return [
      '## Университет, программа и этап поступления',
      `Университет: ${context.university.name} (${context.university.city}, ${context.university.country})`,
      `Программа: ${context.program.name} (${context.program.degreeLevel})`,
      `Текущий этап поступления студента: ${context.currentStageLabel}`,
    ].join('\n');
  }

  private formatDocumentsSection(documents: PromptDocumentInfo[]): string {
    if (documents.length === 0) {
      return '## Документы студента по этой заявке\nДокументы пока не загружены.';
    }

    const list = documents
      .map((doc) => `- ${doc.fileName} (${doc.documentTypeName}, статус: ${doc.status})`)
      .join('\n');

    return `## Документы студента по этой заявке\n${list}`;
  }

  private formatKnowledgeSection(results: KnowledgeSearchResult[]): string {
    if (results.length === 0) {
      return [
        '## Найденные материалы из базы знаний',
        'По этому вопросу материалов в базе знаний не найдено. Честно сообщи об этом',
        'студенту и предложи обратиться к наставнику — не придумывай ответ.',
      ].join('\n');
    }

    const list = results
      .map(
        (result, index) =>
          `[Источник ${index + 1}: ${result.title}]\n${this.truncate(result.text, MAX_KNOWLEDGE_RESULT_CHARS)}`,
      )
      .join('\n\n');

    return `## Найденные материалы из базы знаний\n${list}`;
  }

  /**
   * Двухшаговое ограничение: сначала обрезаем каждое сообщение по
   * отдельности (MAX_HISTORY_MESSAGE_CHARS) — защита от одного очень
   * длинного сообщения; затем ограничиваем СОВОКУПНЫЙ объём истории
   * (MAX_TOTAL_HISTORY_CHARS), отбрасывая САМЫЕ СТАРЫЕ сообщения при
   * превышении бюджета — недавний контекст диалога важнее для связности
   * ответа, чем самые ранние реплики. Минимум одно (последнее) сообщение
   * сохраняется всегда, даже если оно само по себе превышает бюджет.
   */
  private limitHistory(history: PromptContext['history']): PromptContext['history'] {
    const perMessageTruncated = history.map((message) => ({
      ...message,
      content: this.truncate(message.content, MAX_HISTORY_MESSAGE_CHARS),
    }));

    const limited: typeof perMessageTruncated = [];
    let totalChars = 0;

    for (let i = perMessageTruncated.length - 1; i >= 0; i -= 1) {
      const message = perMessageTruncated[i];

      if (totalChars + message.content.length > MAX_TOTAL_HISTORY_CHARS && limited.length > 0) {
        break;
      }

      totalChars += message.content.length;
      limited.unshift(message);
    }

    return limited;
  }

  private truncate(text: string, maxChars: number): string {
    if (text.length <= maxChars) {
      return text;
    }

    return `${text.slice(0, maxChars)}${TRUNCATION_SUFFIX}`;
  }

  private normalizeHistoryRole(role: string): ChatMessage['role'] {
    return role === 'assistant' || role === 'system' ? role : 'user';
  }
}
