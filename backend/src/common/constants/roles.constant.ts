/**
 * Роли с глобальным доступом на чтение персональных данных (заявки,
 * чек-листы и далее — документы, комментарии и т.д.). Решение по Mentor,
 * раунд 2: просмотр без отдельной таблицы MentorAssignments.
 *
 * Единая точка правды — используется и ApplicationsService, и
 * ChecklistsService (без циклической зависимости модулей друг на друга,
 * см. комментарий в checklists.service.ts).
 */
export const GLOBAL_READ_ROLES: readonly string[] = ['Mentor', 'Admin', 'SuperAdmin'];

/**
 * Все существующие роли платформы (Этап 1.1, seed). Единая точка правды
 * для валидации в DTO создания пользователя и смены роли (Этап 11.1) —
 * без неё пришлось бы дублировать один и тот же список в 3 местах.
 */
export const ALL_ROLE_NAMES: readonly string[] = ['Student', 'Mentor', 'Admin', 'SuperAdmin'];
