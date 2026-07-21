import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { CalendarEvent } from '@prisma/client';
import { pluralizeDays } from '../common/utils/pluralize-days.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const DEADLINE_STAGES = [30, 7, 3, 1] as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type NotifiedStagesMap = Partial<Record<string, boolean>>;

/**
 * Часть 5, п.7.3 Roadmap: ежедневная проверка событий календаря на
 * приближающиеся дедлайны (за 30/7/3/1 дней), создание Notification с
 * защитой от повторной отправки через notifiedStages (поле уже заложено
 * в схему на Этапе 7.1 специально под эту задачу).
 */
@Injectable()
export class CalendarCronService {
  private readonly logger = new Logger(CalendarCronService.name);

  public constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  public async checkUpcomingDeadlines(): Promise<void> {
    const now = new Date();

    const events = await this.prisma.calendarEvent.findMany({
      where: { completed: false, date: { gte: now } },
    });

    this.logger.log(`Checking deadlines for ${events.length} upcoming event(s)`);

    for (const event of events) {
      await this.processEvent(event, now);
    }
  }

  /**
   * Если событие создано, когда до дедлайна уже осталось, например, 5 дней,
   * стадии 30 и 7 обе окажутся "просроченными" на первом же запуске —
   * это корректно (обе стадии действительно ещё не были отправлены), а не
   * баг: пользователь получит оба напоминания сразу, а не пропустит их.
   */
  private async processEvent(event: CalendarEvent, now: Date): Promise<void> {
    const daysLeft = Math.ceil((event.date.getTime() - now.getTime()) / MS_PER_DAY);
    const notifiedStages: NotifiedStagesMap = (event.notifiedStages as NotifiedStagesMap | null) ?? {};

    for (const stage of DEADLINE_STAGES) {
      const stageKey = String(stage);

      if (daysLeft > stage || notifiedStages[stageKey]) {
        continue;
      }

      try {
        await this.notifyStage(event, daysLeft);
        notifiedStages[stageKey] = true;

        // Сохраняем ПОСЛЕ каждой успешно отправленной стадии, а не одним
        // махом в конце обработки события — если между стадиями 7 и 3
        // произойдёт сбой, уже отправленная стадия 7 не продублируется на
        // следующем запуске крона (защита от дублей — главная цель этапа).
        await this.prisma.calendarEvent.update({
          where: { id: event.id },
          data: { notifiedStages },
        });
      } catch (error) {
        this.logger.error(
          `Failed to send stage ${stage} deadline notification for event ${event.id}: ${String(error)}`,
        );
        // Не пробрасываем дальше — сбой по одному событию не должен
        // прерывать обработку остальных событий в этом запуске крона.
      }
    }
  }

  private async notifyStage(event: CalendarEvent, daysLeft: number): Promise<void> {
    const { title, message } = this.buildNotificationContent(event, daysLeft);
    await this.notificationsService.create(event.userId, title, message, 'Calendar');
  }

  private buildNotificationContent(
    event: CalendarEvent,
    daysLeft: number,
  ): { title: string; message: string } {
    const whenText = daysLeft === 0 ? 'сегодня' : `через ${daysLeft} ${pluralizeDays(daysLeft)}`;

    return {
      title: `Дедлайн ${whenText}`,
      message: `«${event.title}» — ${whenText}.`,
    };
  }
}
