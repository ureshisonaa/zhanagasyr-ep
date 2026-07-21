import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { GLOBAL_READ_ROLES } from '../common/constants/roles.constant';
import { PrismaService } from '../prisma/prisma.service';
import type { ProgressResponse } from './interfaces/progress-response.interface';

/**
 * Веса — архитектурное решение, принятое на этапе планирования (до начала
 * разработки): Documents 35%, Essays 25%, Checklist 20%, Deadlines 10%,
 * Interview 10%. Прогресс НЕ хранится в БД — вычисляется заново при каждом
 * запросе, поэтому не может "отстать" от реального состояния заявки.
 */
const WEIGHTS = {
  documents: 0.35,
  essays: 0.25,
  checklist: 0.2,
  deadlines: 0.1,
  interview: 0.1,
} as const;

/**
 * Essay и Motivation Letter — единственные типы документов из засеянного
 * справочника (Этап 2.2), содержательно относящиеся к "эссе". В схеме нет
 * отдельной сущности "Essay" — интерпретация, а не факт из ТЗ.
 */
const ESSAY_DOCUMENT_TYPE_NAMES = ['Essay', 'Motivation Letter'];

@Injectable()
export class ProgressService {
  public constructor(private readonly prisma: PrismaService) {}

  public async calculateForApplication(
    currentUser: SanitizedUser,
    applicationId: string,
  ): Promise<ProgressResponse> {
    await this.ensureApplicationAccessible(currentUser, applicationId);
    return this.calculate(applicationId);
  }

  /** Для внутреннего использования другими сервисами — без повторной проверки доступа. */
  public async calculate(applicationId: string): Promise<ProgressResponse> {
    const [documents, essays, checklist, deadlines, interview] = await Promise.all([
      this.calculateDocumentsScore(applicationId),
      this.calculateEssaysScore(applicationId),
      this.calculateChecklistScore(applicationId),
      this.calculateDeadlinesScore(applicationId),
      this.calculateInterviewScore(applicationId),
    ]);

    const total = Math.round(
      documents * WEIGHTS.documents +
        essays * WEIGHTS.essays +
        checklist * WEIGHTS.checklist +
        deadlines * WEIGHTS.deadlines +
        interview * WEIGHTS.interview,
    );

    return { documents, essays, checklist, deadlines, interview, total };
  }

  /** Доля привязанных к заявке документов со статусом Approved. */
  private async calculateDocumentsScore(applicationId: string): Promise<number> {
    const links = await this.prisma.applicationDocument.findMany({
      where: { applicationId },
      include: { document: true },
    });

    if (links.length === 0) {
      return 0;
    }

    const approvedCount = links.filter((link) => link.document.status === 'Approved').length;
    return this.toPercentage(approvedCount, links.length);
  }

  /**
   * Доля выполненных пунктов чек-листа, относящихся к типам документов
   * "Essay"/"Motivation Letter". Если для программы такие пункты не
   * заданы — 100% (нечего наверстывать, не наказываем заявку за
   * отсутствие требования, которого нет ни в одной из её программ).
   */
  private async calculateEssaysScore(applicationId: string): Promise<number> {
    const checklist = await this.prisma.checklist.findUnique({
      where: { applicationId },
      include: { items: { include: { documentType: true } } },
    });

    if (!checklist) {
      return 100;
    }

    const essayItems = checklist.items.filter((item) => {
      const typeName = item.documentType?.name;
      return typeName !== undefined && ESSAY_DOCUMENT_TYPE_NAMES.includes(typeName);
    });

    if (essayItems.length === 0) {
      return 100;
    }

    const completedCount = essayItems.filter((item) => item.isCompleted).length;
    return this.toPercentage(completedCount, essayItems.length);
  }

  /** Доля выполненных пунктов чек-листа в целом (включая пункты без документа). */
  private async calculateChecklistScore(applicationId: string): Promise<number> {
    const checklist = await this.prisma.checklist.findUnique({
      where: { applicationId },
      include: { items: true },
    });

    if (!checklist || checklist.items.length === 0) {
      return 100;
    }

    const completedCount = checklist.items.filter((item) => item.isCompleted).length;
    return this.toPercentage(completedCount, checklist.items.length);
  }

  /** Доля событий календаря заявки, которые выполнены ИЛИ ещё не просрочены. */
  private async calculateDeadlinesScore(applicationId: string): Promise<number> {
    const events = await this.prisma.calendarEvent.findMany({ where: { applicationId } });

    if (events.length === 0) {
      return 100;
    }

    const now = new Date();
    const onTrackCount = events.filter((event) => event.completed || event.date >= now).length;
    return this.toPercentage(onTrackCount, events.length);
  }

  /**
   * В схеме нет отдельной сущности "Interview" — интерпретация: смотрим на
   * самое позднее событие календаря заявки типа Interview. Нет события —
   * 100% (интервью ещё не назначено, не наказываем заявку за это); есть —
   * 100%/0% по факту completed (бинарно, без частичного зачёта).
   */
  private async calculateInterviewScore(applicationId: string): Promise<number> {
    const interviewEvent = await this.prisma.calendarEvent.findFirst({
      where: { applicationId, type: 'Interview' },
      orderBy: { date: 'desc' },
    });

    if (!interviewEvent) {
      return 100;
    }

    return interviewEvent.completed ? 100 : 0;
  }

  private toPercentage(part: number, total: number): number {
    return Math.round((part / total) * 100);
  }

  private async ensureApplicationAccessible(
    currentUser: SanitizedUser,
    applicationId: string,
  ): Promise<void> {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId } });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== currentUser.id && !GLOBAL_READ_ROLES.includes(currentUser.role)) {
      throw new ForbiddenException('You do not have access to this application');
    }
  }
}
