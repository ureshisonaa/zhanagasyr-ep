import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Глобальный модуль (@Global) — PrismaService нужен практически каждому
 * фичевому модулю (Users, Applications, Documents и т.д.), поэтому
 * повторный импорт PrismaModule в каждом из них создавал бы бессмысленное
 * дублирование (нарушение DRY).
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
