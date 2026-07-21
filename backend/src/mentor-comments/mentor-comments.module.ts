import { Module } from '@nestjs/common';
import { ActivityLogModule } from '../activity-log/activity-log.module';
import { MentorCommentsController } from './mentor-comments.controller';
import { MentorCommentsService } from './mentor-comments.service';

@Module({
  imports: [ActivityLogModule],
  controllers: [MentorCommentsController],
  providers: [MentorCommentsService],
  exports: [MentorCommentsService],
})
export class MentorCommentsModule {}
