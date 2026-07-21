import { Injectable } from '@nestjs/common';
import type { ApplicationStatus } from '@prisma/client';

/**
 * Решение раунда 3 (планирование архитектуры): финальные статусы заявки
 * может выставить только Admin/SuperAdmin — общее бизнес-правило, а не
 * Mentor-специфичное ограничение (сам студент тоже не может проставить
 * себе "Accepted"). Ранее было приватной безымянной проверкой внутри
 * ApplicationsService (Этап 3.1); вынесено в отдельный класс на Этапе
 * 10.1 — та же логика, но с собственной, узнаваемой точкой в коде,
 * соответствующей названию из планирования.
 */
export const FINAL_APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'Accepted',
  'Rejected',
  'Enrolled',
];

const FINAL_STATUS_ROLES = ['Admin', 'SuperAdmin'];

@Injectable()
export class ApplicationStatusPolicy {
  public isFinalStatus(status: ApplicationStatus): boolean {
    return FINAL_APPLICATION_STATUSES.includes(status);
  }

  public canSetStatus(role: string, status: ApplicationStatus): boolean {
    return !this.isFinalStatus(status) || FINAL_STATUS_ROLES.includes(role);
  }
}
