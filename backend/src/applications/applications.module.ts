import { Module } from '@nestjs/common';
import { ApplicationDocumentsModule } from '../application-documents/application-documents.module';
import { ChatModule } from '../chat/chat.module';
import { ChecklistsModule } from '../checklists/checklists.module';
import { DocumentsModule } from '../documents/documents.module';
import { ApplicationStatusPolicy } from './application-status.policy';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

@Module({
  imports: [ChecklistsModule, DocumentsModule, ApplicationDocumentsModule, ChatModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, ApplicationStatusPolicy],
  exports: [ApplicationsService, ApplicationStatusPolicy],
})
export class ApplicationsModule {}
