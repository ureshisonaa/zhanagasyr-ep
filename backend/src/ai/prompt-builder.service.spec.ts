import type { AiPromptsService } from '../ai-prompts/ai-prompts.service';
import type { PromptContext } from './interfaces/prompt-context.interface';
import { PromptBuilderService } from './prompt-builder.service';

/**
 * Roadmap, Этап 13.1: явно требует проверку edge-кейса "пустая БЗ" —
 * ключевое поведение честности ответа (Часть 3, п.11 ТЗ: "не придумывай
 * факты"), которое легко сломать незаметно, изменив formatKnowledgeSection.
 */
describe('PromptBuilderService', () => {
  let promptBuilderService: PromptBuilderService;
  let aiPromptsService: { getByNameOrDefault: jest.Mock };

  const baseContext: PromptContext = {
    user: { firstName: 'Aya', lastName: 'N' },
    university: { name: 'Nazarbayev University', city: 'Astana', country: 'Kazakhstan' },
    program: { name: 'Computer Science', degreeLevel: 'Bachelor' },
    currentStageLabel: 'Подготовка документов',
    documents: [],
    knowledgeResults: [],
    history: [],
    userMessage: 'Когда дедлайн подачи?',
  };

  beforeEach(() => {
    aiPromptsService = {
      getByNameOrDefault: jest.fn().mockResolvedValue('SYSTEM_PROMPT_TEXT'),
    };
    promptBuilderService = new PromptBuilderService(
      aiPromptsService as unknown as AiPromptsService,
    );
  });

  it('честно сообщает об отсутствии материалов при пустой базе знаний', async () => {
    const messages = await promptBuilderService.build({ ...baseContext, knowledgeResults: [] });
    const systemMessage = messages[0];

    expect(systemMessage.role).toBe('system');
    expect(systemMessage.content).toContain('материалов в базе знаний не найдено');
    expect(systemMessage.content).toContain('не придумывай ответ');
  });

  it('включает найденные материалы базы знаний с указанием источника', async () => {
    const messages = await promptBuilderService.build({
      ...baseContext,
      knowledgeResults: [{ articleId: 'a1', title: 'Сроки подачи', text: 'Дедлайн — 1 июня.', score: 0.9 }],
    });

    expect(messages[0].content).toContain('Сроки подачи');
    expect(messages[0].content).toContain('Дедлайн — 1 июня.');
  });

  it('сообщает об отсутствии загруженных документов, если их нет', async () => {
    const messages = await promptBuilderService.build({ ...baseContext, documents: [] });
    expect(messages[0].content).toContain('Документы пока не загружены');
  });

  it('использует системный промпт из AiPromptsService (Admin может переопределить, Этап 11.3)', async () => {
    aiPromptsService.getByNameOrDefault.mockResolvedValue('КАСТОМНЫЙ ПРОМПТ ОТ АДМИНА');

    const messages = await promptBuilderService.build(baseContext);

    expect(messages[0].content).toContain('КАСТОМНЫЙ ПРОМПТ ОТ АДМИНА');
    expect(aiPromptsService.getByNameOrDefault).toHaveBeenCalledWith(
      'chat_system_prompt',
      expect.any(String),
    );
  });

  it('возвращает сообщения в правильном порядке: system -> история -> текущий вопрос', async () => {
    const messages = await promptBuilderService.build({
      ...baseContext,
      history: [
        { role: 'user', content: 'Первый вопрос' },
        { role: 'assistant', content: 'Первый ответ' },
      ],
    });

    expect(messages).toHaveLength(4);
    expect(messages[0].role).toBe('system');
    expect(messages[1]).toEqual({ role: 'user', content: 'Первый вопрос' });
    expect(messages[2]).toEqual({ role: 'assistant', content: 'Первый ответ' });
    expect(messages[3]).toEqual({ role: 'user', content: 'Когда дедлайн подачи?' });
  });

  describe('ограничение длины контекста (Этап 12.3, AI Cost Optimization)', () => {
    it('обрезает одно очень длинное сообщение истории', async () => {
      const veryLongMessage = 'a'.repeat(5000);

      const messages = await promptBuilderService.build({
        ...baseContext,
        history: [{ role: 'user', content: veryLongMessage }],
      });

      const historyMessage = messages[1];
      expect(historyMessage.content.length).toBeLessThan(5000);
      expect(historyMessage.content).toContain('обрезано для контроля стоимости');
    });

    it('отбрасывает самые старые сообщения при превышении совокупного бюджета истории', async () => {
      // 10 сообщений по 2000 символов = 20 000 — заведомо больше бюджета (8000).
      const history = Array.from({ length: 10 }, (_, index) => ({
        role: 'user',
        content: `Сообщение №${index}: ${'x'.repeat(1990)}`,
      }));

      const messages = await promptBuilderService.build({ ...baseContext, history });
      // messages = [system, ...сохранённая часть истории, user-вопрос]
      const historyMessagesInOutput = messages.slice(1, -1);

      expect(historyMessagesInOutput.length).toBeLessThan(history.length);
      // Самое последнее (недавнее) сообщение истории должно сохраниться.
      expect(historyMessagesInOutput[historyMessagesInOutput.length - 1].content).toContain(
        'Сообщение №9',
      );
      // Самое первое (старое) сообщение должно быть отброшено.
      expect(
        historyMessagesInOutput.some((message) => message.content.includes('Сообщение №0')),
      ).toBe(false);
    });

    it('всегда сохраняет минимум одно сообщение, даже если оно само превышает бюджет', async () => {
      const singleHugeMessage = 'x'.repeat(9000); // больше MAX_TOTAL_HISTORY_CHARS=8000

      const messages = await promptBuilderService.build({
        ...baseContext,
        history: [{ role: 'user', content: singleHugeMessage }],
      });

      // system + 1 (обрезанное до per-message лимита) + user-вопрос
      expect(messages).toHaveLength(3);
    });

    it('обрезает результаты поиска по базе знаний', async () => {
      const hugeArticleText = 'з'.repeat(5000);

      const messages = await promptBuilderService.build({
        ...baseContext,
        knowledgeResults: [{ articleId: 'a1', title: 'Большая статья', text: hugeArticleText, score: 0.8 }],
      });

      expect(messages[0].content).toContain('обрезано для контроля стоимости');
    });
  });
});
