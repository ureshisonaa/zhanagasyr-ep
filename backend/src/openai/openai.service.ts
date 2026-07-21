import {
  Injectable,
  InternalServerErrorException,
  Logger,
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { OpenAiConfig } from '../config/openai.config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCompletionResult {
  content: string;
  usage: ChatCompletionUsage;
}

export interface ChatCompletionOptions {
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_TEMPERATURE = 0.3;

/**
 * Изолированный адаптер к OpenAI API — без контроллера (по аналогии с
 * GoogleDriveModule, Этап 4.2): "Frontend никогда не работает с OpenAI
 * напрямую" — тот же принцип, что и для Google Drive (ТЗ, Часть 3, п.13).
 * Реальный AI-эндпоинт (/ai/chat) появится в Этапе 5.5 (Prompt Builder),
 * который будет использовать этот сервис, а не заменять его.
 *
 * Никакой бизнес-логики здесь: ни истории сообщений, ни поиска по базе
 * знаний, ни системного промпта — только вызов модели с уже готовым
 * набором сообщений и преобразование ошибок API в понятные исключения.
 */
@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly embeddingModel: string;

  public constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<OpenAiConfig>('openai');

    if (!config?.apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY is not configured — AI features will fail until it is set.',
      );
    }

    this.client = new OpenAI({
      apiKey: config?.apiKey ?? '',
      timeout: config?.timeoutMs ?? 60_000,
    });
    this.model = config?.model ?? 'gpt-5.5';
    this.embeddingModel = config?.embeddingModel ?? 'text-embedding-3-small';
  }

  /** Используется AiSessionsService (Этап 5.6) для записи поля model на сессии. */
  public getModelName(): string {
    return this.model;
  }

  public async createChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResult> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: options?.maxTokens,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('OpenAI returned an empty response');
      }

      return {
        content,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
      };
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /** Используется EmbeddingsService (Этап 5.4) для индексации чанков базы знаний и поисковых запросов. */
  public async createEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });

      const embedding = response.data[0]?.embedding;

      if (!embedding) {
        throw new Error('OpenAI returned no embedding');
      }

      return embedding;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  /**
   * Используется DocumentVerificationService (Этап 6.1) для анализа
   * сканов/фото документов. Намеренно отдельный метод, а не расширение
   * ChatMessage/createChatCompletion мультимодальным контентом — больше
   * никто в проекте не отправляет изображения в OpenAI, смешивать
   * специфику vision-запроса в общий текстовый интерфейс чата означало бы
   * усложнять его ради одного частного случая.
   */
  public async analyzeDocumentImage(
    imageBase64: string,
    mimeType: string,
    instructions: string,
  ): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: instructions },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('OpenAI returned an empty response');
      }

      return content;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        this.logger.warn(`OpenAI rate limit exceeded: ${error.message}`);
        return new ServiceUnavailableException(
          'AI service is temporarily overloaded. Please try again shortly.',
        );
      }

      if (error.status === 401 || error.status === 403) {
        // Ошибка конфигурации (неверный/просроченный ключ) — не должна
        // "утекать" пользователю как подсказка для атаки на сам API-ключ.
        this.logger.error(`OpenAI authentication error: ${error.message}`);
        return new InternalServerErrorException('AI service is misconfigured.');
      }

      if (error.status && error.status >= 500) {
        this.logger.error(`OpenAI server error: ${error.message}`);
        return new ServiceUnavailableException(
          'AI service is temporarily unavailable. Please try again shortly.',
        );
      }
    }

    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      this.logger.error('OpenAI request timed out');
      return new RequestTimeoutException('AI service took too long to respond. Please try again.');
    }

    this.logger.error(`Unexpected OpenAI error: ${String(error)}`);
    return new InternalServerErrorException('AI service encountered an unexpected error.');
  }
}
