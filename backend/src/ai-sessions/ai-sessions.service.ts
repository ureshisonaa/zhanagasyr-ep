import { Injectable, NotFoundException } from '@nestjs/common';
import type { AiSession } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiSessionsService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * "Одна активная сессия на чат" (ТЗ, Часть 2, п.20) — find-or-create:
   * если активная сессия (endedAt = null) уже есть, переиспользуем её
   * вместо создания новой или выбрасывания ошибки. Принимает applicationId,
   * а не chatId напрямую — тот же принцип, что и в ChatService/AiService:
   * весь остальной код построен вокруг applicationId, резолвинг в chatId —
   * внутренняя деталь этого сервиса.
   */
  public async getOrStartActiveSessionForApplication(
    userId: string,
    applicationId: string,
    model: string,
  ): Promise<AiSession> {
    const chat = await this.prisma.chat.findUnique({ where: { applicationId } });

    if (!chat) {
      throw new NotFoundException('Chat not found for this application');
    }

    const existing = await this.prisma.aiSession.findFirst({
      where: { chatId: chat.id, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.aiSession.create({ data: { userId, chatId: chat.id, model } });
  }

  /** Вызывается AiService после каждого успешного ответа OpenAI (Этап 5.5). */
  public async recordTokenUsage(sessionId: string, tokens: number): Promise<void> {
    await this.prisma.aiSession.update({
      where: { id: sessionId },
      data: { tokensUsed: { increment: tokens } },
    });
  }

  /**
   * Явное завершение сессии — не вызывается автоматически ни из какого
   * потока в текущем объёме проекта (нет ни таймаута бездействия, ни
   * explicit-триггера от frontend). Оставлено готовой к использованию
   * точкой входа: понадобится, когда появится соответствующий триггер
   * (например, планировщик неактивности — вне явного объёма ТЗ на
   * сегодня, или ручное действие в будущем Admin Panel).
   */
  public async endActiveSession(applicationId: string): Promise<void> {
    const chat = await this.prisma.chat.findUnique({ where: { applicationId } });

    if (!chat) {
      throw new NotFoundException('Chat not found for this application');
    }

    await this.prisma.aiSession.updateMany({
      where: { chatId: chat.id, endedAt: null },
      data: { endedAt: new Date() },
    });
  }
}
