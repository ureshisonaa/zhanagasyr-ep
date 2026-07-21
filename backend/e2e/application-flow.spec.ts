import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp } from './utils/create-test-app.util';

const BCRYPT_ROUNDS = 12;
const TEST_EMAIL = 'e2e-flow-test@example.com';
const TEST_PASSWORD = 'CorrectPassword123!';

const MOCK_DRIVE_FILE = {
  driveFileId: 'mock-drive-file-id',
  driveUrl: 'https://drive.google.com/mock-file',
  driveFolderId: 'mock-folder-id',
};

const MOCK_AI_COMPLETION = {
  content: JSON.stringify({ ignored: true }), // содержимое не важно для этого сценария — важен факт сохранения обмена
  usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
};

/**
 * Roadmap, Этап 13.2 — полный User Journey из Части 6, п.17: создание
 * заявки → загрузка документа → чат → чек-лист, одним непрерывным
 * сценарием через реальный HTTP API, а не по частям (в отличие от
 * unit-тестов, Этап 13.1, где каждый сервис проверяется в изоляции).
 *
 * GoogleDriveService.uploadDocument и OpenAiService.createChatCompletion/
 * getModelName подменены — реальные вызовы требуют платных внешних
 * credentials и делают тест медленным/недетерминированным. Остальная
 * цепочка (HTTP, guards, валидация, Prisma, бизнес-логика создания
 * заявки/чек-листа/чата) — настоящая, не мокнутая.
 */
describe('Application flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authCookie: string | string[];
  let applicationId: string;
  let universityId: string;
  let programId: string;
  let admissionCycleId: string;
  let documentTypeId: string;

  beforeAll(async () => {
    app = await createTestApp({
      googleDriveService: {
        uploadDocument: jest.fn<Promise<typeof MOCK_DRIVE_FILE>>().mockResolvedValue(MOCK_DRIVE_FILE),
      },
      openAiService: {
        createChatCompletion: jest
          .fn<Promise<typeof MOCK_AI_COMPLETION>>()
          .mockResolvedValue(MOCK_AI_COMPLETION),
        getModelName: jest.fn<string>().mockReturnValue('gpt-5.5-mock'),
      },
    });
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
        lastName: 'Flow',
        roleId: role.id,
      },
    });

    const documentType = await prisma.documentType.upsert({
      where: { name: 'E2E Test Passport' },
      update: {},
      create: { name: 'E2E Test Passport' },
    });
    documentTypeId = documentType.id;

    const university = await prisma.university.create({
      data: { name: 'E2E Test University', country: 'Kazakhstan', city: 'Astana' },
    });
    universityId = university.id;

    const program = await prisma.program.create({
      data: { universityId, name: 'E2E Test Program', degreeLevel: 'Bachelor' },
    });
    programId = program.id;

    await prisma.programRequirement.create({
      data: { programId, documentTypeId, label: 'E2E Test Passport', isRequired: true, order: 1 },
    });

    const admissionCycle = await prisma.admissionCycle.create({
      data: {
        season: 'Fall',
        year: 2099,
        name: 'E2E Fall 2099',
        startDate: new Date('2099-01-01'),
        endDate: new Date('2099-06-01'),
      },
    });
    admissionCycleId = admissionCycle.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
      .expect(200);

    authCookie = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    // Checklist/ChecklistItem/ApplicationDocument/Chat/Message удаляются
    // каскадно вместе с Application (onDelete: Cascade в схеме) — их не
    // нужно чистить отдельно. Document — самостоятельная сущность,
    // подчищается по userId тестового пользователя.
    if (applicationId) {
      await prisma.application.deleteMany({ where: { id: applicationId } }).catch(() => undefined);
    }
    const testUser = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (testUser) {
      await prisma.document.deleteMany({ where: { userId: testUser.id } }).catch(() => undefined);
    }
    await prisma.programRequirement.deleteMany({ where: { programId } }).catch(() => undefined);
    await prisma.program.deleteMany({ where: { id: programId } }).catch(() => undefined);
    await prisma.university.deleteMany({ where: { id: universityId } }).catch(() => undefined);
    await prisma.admissionCycle.deleteMany({ where: { id: admissionCycleId } }).catch(() => undefined);
    await prisma.documentType.deleteMany({ where: { id: documentTypeId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await app.close();
  });

  it('Шаг 1 — создание заявки автоматически генерирует чек-лист из требований программы', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/applications')
      .set('Cookie', authCookie)
      .send({ universityId, programId, admissionCycleId })
      .expect(201);

    expect(response.body.success).toBe(true);
    applicationId = response.body.application.id;

    const checklistResponse = await request(app.getHttpServer())
      .get(`/api/v1/checklists/${applicationId}`)
      .set('Cookie', authCookie)
      .expect(200);

    expect(checklistResponse.body.checklist.items).toHaveLength(1);
    expect(checklistResponse.body.checklist.items[0].isCompleted).toBe(false);
  });

  it('Шаг 2 — загрузка документа и привязка к заявке', async () => {
    const uploadResponse = await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .set('Cookie', authCookie)
      .field('documentTypeId', documentTypeId)
      .attach('file', Buffer.from('fake file content'), 'passport.jpg')
      .expect(201);

    expect(uploadResponse.body.document.driveUrl).toBe(MOCK_DRIVE_FILE.driveUrl);

    const linkResponse = await request(app.getHttpServer())
      .post('/api/v1/application-documents')
      .set('Cookie', authCookie)
      .send({ applicationId, documentId: uploadResponse.body.document.id })
      .expect(201);

    expect(linkResponse.body.applicationDocument.applicationId).toBe(applicationId);
  });

  it('Шаг 3 — AI-чат сохраняет обмен сообщениями (OpenAI подменён)', async () => {
    const chatResponse = await request(app.getHttpServer())
      .post('/api/v1/ai/chat')
      .set('Cookie', authCookie)
      .send({ applicationId, message: 'Когда дедлайн подачи документов?' })
      .expect(200);

    expect(chatResponse.body.userMessage.content).toBe('Когда дедлайн подачи документов?');
    expect(chatResponse.body.assistantMessage.role).toBe('assistant');

    const historyResponse = await request(app.getHttpServer())
      .get(`/api/v1/chat/${applicationId}`)
      .set('Cookie', authCookie)
      .expect(200);

    expect(historyResponse.body.chat.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('Шаг 4 — чек-лист по-прежнему доступен и согласован с состоянием заявки', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/checklists/${applicationId}`)
      .set('Cookie', authCookie)
      .expect(200);

    expect(response.body.checklist.applicationId).toBe(applicationId);
    expect(response.body.checklist.items).toHaveLength(1);
  });
});
