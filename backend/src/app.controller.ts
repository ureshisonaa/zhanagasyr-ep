import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import type { AppStatus } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';

export interface HealthStatus {
  status: 'ok';
  database: 'connected';
  timestamp: string;
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  public getRoot(): AppStatus {
    return this.appService.getStatus();
  }

  /**
   * Health-check для инфраструктуры (Railway/Vercel/мониторинг).
   * Намеренно проверяет реальное соединение с БД, а не просто отвечает 200 —
   * иначе health-check не поймает ситуацию "приложение живо, но БД недоступна".
   */
  @Public()
  @Get('health')
  public async getHealth(): Promise<HealthStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new HttpException(
        { success: false, message: 'Database unavailable', statusCode: HttpStatus.SERVICE_UNAVAILABLE },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() };
  }
}
