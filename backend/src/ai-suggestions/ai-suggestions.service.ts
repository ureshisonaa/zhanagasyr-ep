import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ActivityLogService } from '../activity-log/activity-log.service';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { GLOBAL_READ_ROLES } from '../common/constants/roles.constant';
import { OpenAiService } from '../openai/openai.service';
import { PrismaService } from '../prisma/prisma.service';
import type { SuggestionResponse } from './interfaces/suggestion-response.interface';
import { toStoredSuggestionResponse } from './utils/to-suggestion-response.util';

const UPCOMING_DEADLINE_WINDOW_DAYS = 14;
const MAX_LISTED_INCOMPLETE_ITEMS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const SUGGESTION_SYSTEM_PROMPT = [
  'Ты — AI-консультант образовательной платформы ZhanaGasyr. По данным о заявке студента дай',
  'ОДНУ конкретную, практичную долгосрочную рекомендацию — что стоит сделать дальше для',
  'повышения шансов на поступление. Не повторяй очевидные факты из данных, дай именно совет.',
  '',
  'Ответь СТРОГО в формате JSON без дополнительного текста и без markdown-обёртки:',
  '{"title": "короткий заголовок (до 100 символов)", "content": "текст рекомендации на русском"}',
].join('\n');

@Injectable()
export class AiSuggestionsService {
  private readonly logger = new Logger(AiSuggestionsService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly openAiService: OpenAiService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  public async findAllForApplication(
    currentUser: SanitizedUser,
    applicationId: string,
  ): Promise<SuggestionResponse[]> {
    await this.ensureApplicationAccessible(currentUser, applicationId);

    const [dynamicSuggestions, storedSuggestions] = await Promise.all([
      this.computeDynamicSuggestions(applicationId),
      this.prisma.aiSuggestion.findMany({
        where: { applicationId, isDismissed: false },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return [...dynamicSuggestions, ...storedSuggestions.map(toStoredSuggestionResponse)];
  }

  /**
   * Дорогая операция (вызов OpenAI) — намеренно только по явному запросу
   * (кнопка в UI), не запускается автоматически ни при каком событии.
   * Владелец заявки ИЛИ Mentor/Admin/SuperAdmin — тот же паттерн, что и у
   * создания заметок (Этап 8.1).
   */
  public async generateStoredSuggestion(
    currentUser: SanitizedUser,
    applicationId: string,
  ): Promise<SuggestionResponse> {
    const application = await this.ensureApplicationAccessible(currentUser, applicationId);

    const prompt = await this.buildGenerationPrompt(applicationId, application);

    const completion = await this.openAiService.createChatCompletion([
      { role: 'system', content: SUGGESTION_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ]);

    const parsed = this.parseSuggestion(completion.content);

    const stored = await this.prisma.aiSuggestion.create({
      data: { applicationId, title: parsed.title, content: parsed.content },
    });

    try {
      await this.activityLogService.log(
        applicationId,
        null,
        'AiSuggestionGenerated',
        `Сгенерирована рекомендация «${stored.title}»`,
      );
    } catch (logError) {
      this.logger.warn(`Failed to write activity log for AI suggestion: ${String(logError)}`);
    }

    return toStoredSuggestionResponse(stored);
  }

  public async dismiss(currentUser: SanitizedUser, id: string): Promise<void> {
    const suggestion = await this.prisma.aiSuggestion.findUnique({ where: { id } });

    if (!suggestion) {
      throw new NotFoundException('Suggestion not found');
    }

    await this.ensureApplicationAccessible(currentUser, suggestion.applicationId);
    await this.prisma.aiSuggestion.update({ where: { id }, data: { isDismissed: true } });
  }

  /**
   * Простые проверки по уже существующим данным — намеренно НЕ хранятся:
   * пересчитываются заново при каждом запросе, поэтому не могут "устареть"
   * (в отличие от сохранённых, которые нужно было бы явно перегенерировать).
   */
  private async computeDynamicSuggestions(applicationId: string): Promise<SuggestionResponse[]> {
    const suggestions: SuggestionResponse[] = [];

    const checklist = await this.prisma.checklist.findUnique({
      where: { applicationId },
      include: { items: true },
    });

    if (checklist) {
      const incompleteItems = checklist.items.filter((item) => !item.isCompleted);

      if (incompleteItems.length > 0) {
        const labels = incompleteItems
          .slice(0, MAX_LISTED_INCOMPLETE_ITEMS)
          .map((item) => item.label)
          .join(', ');
        const remainder = incompleteItems.length - MAX_LISTED_INCOMPLETE_ITEMS;

        suggestions.push({
          id: 'checklist-incomplete',
          kind: 'dynamic',
          title: 'Незавершённые пункты чек-листа',
          content: `Осталось выполнить: ${labels}${remainder > 0 ? ` и ещё ${remainder}` : ''}.`,
          createdAt: null,
        });
      }
    }

    const upcomingDeadline = await this.prisma.calendarEvent.findFirst({
      where: { applicationId, completed: false, date: { gte: new Date() } },
      orderBy: { date: 'asc' },
    });

    if (upcomingDeadline) {
      const daysLeft = Math.ceil((upcomingDeadline.date.getTime() - Date.now()) / MS_PER_DAY);

      if (daysLeft <= UPCOMING_DEADLINE_WINDOW_DAYS) {
        suggestions.push({
          id: `deadline-${upcomingDeadline.id}`,
          kind: 'dynamic',
          title: 'Приближается дедлайн',
          content: `«${upcomingDeadline.title}» — через ${daysLeft} дн.`,
          createdAt: null,
        });
      }
    }

    return suggestions;
  }

  private async buildGenerationPrompt(
    applicationId: string,
    application: { applicationStatus: string },
  ): Promise<string> {
    const checklist = await this.prisma.checklist.findUnique({
      where: { applicationId },
      include: { items: true },
    });

    const completedCount = checklist?.items.filter((item) => item.isCompleted).length ?? 0;
    const totalCount = checklist?.items.length ?? 0;

    return [
      `Текущий статус заявки: ${application.applicationStatus}.`,
      `Чек-лист: выполнено ${completedCount} из ${totalCount} пунктов.`,
      totalCount > 0
        ? `Невыполненные пункты: ${
            checklist?.items
              .filter((item) => !item.isCompleted)
              .map((item) => item.label)
              .join(', ') || 'нет'
          }.`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private parseSuggestion(rawResponse: string): { title: string; content: string } {
    try {
      const cleaned = rawResponse.trim().replace(/^```(json)?\s*|```$/g, '');
      const parsed = JSON.parse(cleaned) as { title?: string; content?: string };

      return {
        title: parsed.title ?? 'Рекомендация',
        content: parsed.content ?? rawResponse,
      };
    } catch {
      // Модель не всегда точно следует формату — если распарсить не
      // удалось, лучше сохранить сырой текст, чем потерять рекомендацию.
      return { title: 'Рекомендация', content: rawResponse };
    }
  }

  private async ensureApplicationAccessible(
    currentUser: SanitizedUser,
    applicationId: string,
  ): Promise<{ applicationStatus: string }> {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== currentUser.id && !GLOBAL_READ_ROLES.includes(currentUser.role)) {
      throw new ForbiddenException('You do not have access to this application');
    }

    return application;
  }
}
