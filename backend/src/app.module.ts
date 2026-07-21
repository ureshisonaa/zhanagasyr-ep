import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { AdmissionCyclesModule } from './admission-cycles/admission-cycles.module';
import { AdminUsersModule } from './admin/users/admin-users.module';
import { DocumentsReviewModule } from './admin/documents-review/documents-review.module';
import { AdminLogsModule } from './admin/admin-logs/admin-logs.module';
import { AdminLoggingInterceptor } from './common/interceptors/admin-logging.interceptor';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { AiModule } from './ai/ai.module';
import { AiPromptsModule } from './ai-prompts/ai-prompts.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ErrorTrackingModule } from './error-tracking/error-tracking.module';
import { AiSuggestionsModule } from './ai-suggestions/ai-suggestions.module';
import { AiSessionsModule } from './ai-sessions/ai-sessions.module';
import { ApplicationDocumentsModule } from './application-documents/application-documents.module';
import { AppController } from './app.controller';
import { ApplicationsModule } from './applications/applications.module';
import { CalendarModule } from './calendar/calendar.module';
import { ChatModule } from './chat/chat.module';
import { ChecklistsModule } from './checklists/checklists.module';
import { DocumentTypesModule } from './document-types/document-types.module';
import { DocumentsModule } from './documents/documents.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { GoogleDriveModule } from './google-drive/google-drive.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { MentorCommentsModule } from './mentor-comments/mentor-comments.module';
import { NotesModule } from './notes/notes.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OpenAiModule } from './openai/openai.module';
import { ProgressModule } from './progress/progress.module';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { configs, validateEnv } from './config';
import type { ThrottleConfig } from './config/throttle.config';
import { PrismaModule } from './prisma/prisma.module';
import { ProgramsModule } from './programs/programs.module';
import { UniversitiesModule } from './universities/universities.module';
import { UsersModule } from './users/users.module';

/**
 * Корневой модуль. Фичевые модули (users, applications и т.д.)
 * подключаются сюда по мере реализации соответствующих этапов Roadmap.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: configs,
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const throttleConfig = configService.get<ThrottleConfig>('throttle');
        return [{ ttl: throttleConfig?.ttl ?? 60_000, limit: throttleConfig?.limit ?? 100 }];
      },
    }),
    PrismaModule,
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    UniversitiesModule,
    ProgramsModule,
    AdmissionCyclesModule,
    ApplicationsModule,
    ChatModule,
    ChecklistsModule,
    DocumentTypesModule,
    DocumentsModule,
    GoogleDriveModule,
    ApplicationDocumentsModule,
    OpenAiModule,
    KnowledgeModule,
    EmbeddingsModule,
    AiModule,
    AiSessionsModule,
    CalendarModule,
    NotificationsModule,
    NotesModule,
    ActivityLogModule,
    AiSuggestionsModule,
    ProgressModule,
    MentorCommentsModule,
    AdminUsersModule,
    DocumentsReviewModule,
    AdminLogsModule,
    AiPromptsModule,
    ErrorTrackingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: AdminLoggingInterceptor },
  ],
})
export class AppModule {}
