import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DocumentsReviewController } from './documents-review.controller';
import { DocumentsReviewService } from './documents-review.service';

@Module({
  imports: [AuthModule],
  controllers: [DocumentsReviewController],
  providers: [DocumentsReviewService],
})
export class DocumentsReviewModule {}
