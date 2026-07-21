import { Module } from '@nestjs/common';
import { AiSessionsService } from './ai-sessions.service';

@Module({
  providers: [AiSessionsService],
  exports: [AiSessionsService],
})
export class AiSessionsModule {}
