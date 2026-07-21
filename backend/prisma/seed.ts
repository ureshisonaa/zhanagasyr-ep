import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ROLE_NAMES = ['Student', 'Mentor', 'Admin', 'SuperAdmin'] as const;
const BCRYPT_SALT_ROUNDS = 12;

// Часть 2, п.11 ТЗ — предзаполненный справочник видов документов.
const DOCUMENT_TYPE_NAMES = [
  'Passport',
  'IELTS',
  'SAT',
  'Transcript',
  'CV',
  'Recommendation Letter',
  'Essay',
  'Motivation Letter',
  'Diploma',
  'Certificate',
  'Visa',
  'Financial Documents',
  'Portfolio',
  'Other',
] as const;

/**
 * Создаёт (идемпотентно) справочник ролей.
 * Возвращает карту "имя роли -> id" для использования при создании
 * bootstrap-аккаунта.
 */
async function seedRoles(): Promise<Record<string, string>> {
  const roleIds: Record<string, string> = {};

  for (const name of ROLE_NAMES) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roleIds[name] = role.id;
  }

  return roleIds;
}

/**
 * Создаёт единственный bootstrap-аккаунт SuperAdmin из переменных окружения.
 * Требуется, потому что самостоятельная регистрация отключена (Этап 1.1),
 * а Admin Panel для создания пользователей появится только в Фазе 11 —
 * без этого скрипта войти в систему было бы физически некому.
 *
 * Идемпотентно: при повторном запуске существующий пользователь не
 * перезаписывается (update: {}), чтобы не сбросить пароль, если админ
 * уже сменил его через интерфейс.
 */
async function seedBootstrapAdmin(superAdminRoleId: string): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const firstName = process.env.BOOTSTRAP_ADMIN_FIRST_NAME ?? 'Super';
  const lastName = process.env.BOOTSTRAP_ADMIN_LAST_NAME ?? 'Admin';

  if (!email || !password) {
    console.warn(
      'BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD не заданы в .env — bootstrap-аккаунт ' +
        'SuperAdmin не создан. Без него после Этапа 1.1 некому будет войти в систему.',
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: passwordHash,
      firstName,
      lastName,
      isActive: true,
      roleId: superAdminRoleId,
    },
  });

  console.log(`Bootstrap SuperAdmin готов: ${email}`);
}

/**
 * Идемпотентно создаёт справочник видов документов — нужен как FK-цель
 * для ProgramRequirement.documentTypeId (Этап 2.2), до появления полного
 * Documents-модуля (Фаза 4).
 */
async function seedDocumentTypes(): Promise<void> {
  for (const name of DOCUMENT_TYPE_NAMES) {
    await prisma.documentType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

async function main(): Promise<void> {
  const roleIds = await seedRoles();
  await seedBootstrapAdmin(roleIds.SuperAdmin);
  await seedDocumentTypes();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
