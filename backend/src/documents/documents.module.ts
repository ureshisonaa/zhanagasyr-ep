import { Module } from '@nestjs/common';
import { ChecklistsModule } from '../checklists/checklists.module';
import { GoogleDriveModule } from '../google-drive/google-drive.module';
import { OpenAiModule } from '../openai/openai.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { VerificationService } from './verification/verification.service';

@Module({
  imports: [GoogleDriveModule, OpenAiModule, ChecklistsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, VerificationService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
