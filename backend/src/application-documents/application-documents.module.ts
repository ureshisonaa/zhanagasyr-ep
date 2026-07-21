import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { ApplicationDocumentsController } from './application-documents.controller';
import { ApplicationDocumentsService } from './application-documents.service';

@Module({
  imports: [ActivityLogModule],
  controllers: [ApplicationDocumentsController],
  providers: [ApplicationDocumentsService],
  exports: [ApplicationDocumentsService],
})
export class ApplicationDocumentsModule {}
