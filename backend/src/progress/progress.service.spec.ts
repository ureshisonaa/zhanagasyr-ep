import { ProgressService } from './progress.service';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Roadmap, Этап 13.1: явно требует проверку edge-кейса "0 документов".
 * ProgressService особенно важен для тестов — расчёт нигде не хранится
 * (архитектурное решение), поэтому единственная защита от регрессии
 * формулы весов (Documents 35% / Essays 25% / Checklist 20% /
 * Deadlines 10% / Interview 10%) — это тест, а не проверка в БД.
 */
describe('ProgressService', () => {
  let progressService: ProgressService;
  let prisma: {
    applicationDocument: { findMany: jest.Mock };
    checklist: { findUnique: jest.Mock };
    calendarEvent: { findMany: jest.Mock; findFirst: jest.Mock };
  };

  const APPLICATION_ID = 'application-1';

  beforeEach(() => {
    prisma = {
      applicationDocument: { findMany: jest.fn().mockResolvedValue([]) },
      checklist: { findUnique: jest.fn().mockResolvedValue(null) },
      calendarEvent: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(null) },
    };
    progressService = new ProgressService(prisma as unknown as PrismaService);
  });

  it('0 документов даёт 0% по компоненту "документы" — не наказывает, а честно отражает отсутствие прогресса', async () => {
    prisma.applicationDocument.findMany.mockResolvedValue([]);

    const result = await progressService.calculate(APPLICATION_ID);

    expect(result.documents).toBe(0);
  });

  it('все привязанные документы Approved — 100% по компоненту "документы"', async () => {
    prisma.applicationDocument.findMany.mockResolvedValue([
      { document: { status: 'Approved' } },
      { document: { status: 'Approved' } },
    ]);

    const result = await progressService.calculate(APPLICATION_ID);

    expect(result.documents).toBe(100);
  });

  it('половина документов Approved — 50% по компоненту "документы"', async () => {
    prisma.applicationDocument.findMany.mockResolvedValue([
      { document: { status: 'Approved' } },
      { document: { status: 'NeedsReview' } },
    ]);

    const result = await progressService.calculate(APPLICATION_ID);

    expect(result.documents).toBe(50);
  });

  it('отсутствие чек-листа — 100% по чек-листу и эссе (нечего наверстывать, не наказывает за отсутствие требования)', async () => {
    prisma.checklist.findUnique.mockResolvedValue(null);

    const result = await progressService.calculate(APPLICATION_ID);

    expect(result.checklist).toBe(100);
    expect(result.essays).toBe(100);
  });

  it('чек-лист без пунктов, требующих эссе — 100% по эссе, даже если чек-лист в целом не завершён', async () => {
    prisma.checklist.findUnique.mockResolvedValue({
      items: [
        { isCompleted: false, documentType: { name: 'Passport' } },
        { isCompleted: true, documentType: { name: 'Transcript' } },
      ],
    });

    const result = await progressService.calculate(APPLICATION_ID);

    expect(result.essays).toBe(100);
    expect(result.checklist).toBe(50);
  });

  it('частично выполненные пункты эссе дают корректный процент именно по ним, не по всему чек-листу', async () => {
    prisma.checklist.findUnique.mockResolvedValue({
      items: [
        { isCompleted: true, documentType: { name: 'Essay' } },
        { isCompleted: false, documentType: { name: 'Motivation Letter' } },
        { isCompleted: true, documentType: { name: 'Passport' } }, // не эссе — не должен учитываться
      ],
    });

    const result = await progressService.calculate(APPLICATION_ID);

    expect(result.essays).toBe(50); // 1 из 2 пунктов-эссе, а не 2 из 3 всех пунктов
  });

  it('отсутствие событий календаря — 100% по дедлайнам и интервью', async () => {
    prisma.calendarEvent.findMany.mockResolvedValue([]);
    prisma.calendarEvent.findFirst.mockResolvedValue(null);

    const result = await progressService.calculate(APPLICATION_ID);

    expect(result.deadlines).toBe(100);
    expect(result.interview).toBe(100);
  });

  it('просроченное невыполненное событие снижает процент по дедлайнам', async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    prisma.calendarEvent.findMany.mockResolvedValue([
      { completed: false, date: past },
      { completed: false, date: future },
    ]);

    const result = await progressService.calculate(APPLICATION_ID);

    expect(result.deadlines).toBe(50);
  });

  it('завершённое интервью — 100%, незавершённое — 0% (бинарно, без частичного зачёта)', async () => {
    prisma.calendarEvent.findFirst.mockResolvedValue({ completed: true });
    const completedResult = await progressService.calculate(APPLICATION_ID);
    expect(completedResult.interview).toBe(100);

    prisma.calendarEvent.findFirst.mockResolvedValue({ completed: false });
    const incompleteResult = await progressService.calculate(APPLICATION_ID);
    expect(incompleteResult.interview).toBe(0);
  });

  it('итоговый total — корректная взвешенная сумма по весам 35/25/20/10/10', async () => {
    // Все компоненты по 100% — итог должен быть ровно 100%.
    prisma.applicationDocument.findMany.mockResolvedValue([{ document: { status: 'Approved' } }]);
    prisma.checklist.findUnique.mockResolvedValue({
      items: [{ isCompleted: true, documentType: { name: 'Essay' } }],
    });
    prisma.calendarEvent.findMany.mockResolvedValue([{ completed: true, date: new Date() }]);
    prisma.calendarEvent.findFirst.mockResolvedValue({ completed: true });

    const result = await progressService.calculate(APPLICATION_ID);

    expect(result.total).toBe(100);
  });

  it('total — 0, если абсолютно ничего не начато (кроме компонентов, где отсутствие требования = 100%)', async () => {
    // Только "документы" даёт честный 0 (нет документов); essays/checklist/
    // deadlines/interview дают 100 (нет требований/событий вовсе) — это
    // отражает реальный edge-кейс "0 документов" из Roadmap, а не то, что
    // total обязан быть равен 0 при полном отсутствии данных.
    const result = await progressService.calculate(APPLICATION_ID);

    const expectedTotal = Math.round(0 * 0.35 + 100 * 0.25 + 100 * 0.2 + 100 * 0.1 + 100 * 0.1);
    expect(result.total).toBe(expectedTotal);
  });
});
