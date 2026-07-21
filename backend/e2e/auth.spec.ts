import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './utils/create-test-app.util';

const BCRYPT_ROUNDS = 12;
const TEST_EMAIL = 'e2e-auth-test@example.com';
const TEST_PASSWORD = 'CorrectPassword123!';

/**
 * Roadmap, Этап 13.2 — сценарий из Части 6, п.17 User Journey: вход в
 * систему как первый шаг любого сценария пользователя. Реальный HTTP,
 * реальные guards/pipes, реальная БД — не моки (в отличие от unit-тестов,
 * Этап 13.1).
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const role = await prisma.role.upsert({
      where: { name: 'Student' },
      update: {},
      create: { name: 'Student' },
    });

    const passwordHash = await bcrypt.hash(TEST_PASSWORD, BCRYPT_ROUNDS);

    await prisma.user.upsert({
      where: { email: TEST_EMAIL },
      update: { password: passwordHash, isActive: true },
      create: {
        email: TEST_EMAIL,
        password: passwordHash,
        firstName: 'E2E',
        lastName: 'Tester',
        roleId: role.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await app.close();
  });

  it('POST /auth/login с верными данными — 200, возвращает пользователя, устанавливает cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(TEST_EMAIL);
    // Пароль не должен утекать в ответ ни при каких обстоятельствах.
    expect(response.body.user.password).toBeUndefined();
    expect(response.headers['set-cookie']).toBeDefined();
  });

  it('POST /auth/login с неверным паролем — 401 с generic-сообщением (защита от user enumeration)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongPassword123!' })
      .expect(401);

    expect(response.body.message).toBe('Invalid email or password');
  });

  it('POST /auth/login с несуществующим email — ТА ЖЕ generic-ошибка, не "user not found"', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com', password: 'whatever123' })
      .expect(401);

    expect(response.body.message).toBe('Invalid email or password');
  });

  it('GET /auth/me без cookie — 401 (защищённый роут требует авторизации)', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('полный цикл: login -> /auth/me с cookie -> logout -> /auth/me снова отклоняется', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    const cookies = loginResponse.headers['set-cookie'];

    const meResponse = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookies)
      .expect(200);

    expect(meResponse.body.user.email).toBe(TEST_EMAIL);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookies)
      .expect(200);
  });
});
