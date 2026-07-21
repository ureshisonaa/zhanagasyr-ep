import { Module } from '@nestjs/common';
import { OpenAiService } from './openai.service';

/** Без контроллера — тот же принцип, что и GoogleDriveModule (Этап 4.2). */
@Module({
  providers: [OpenAiService],
  exports: [OpenAiService],
})
export class OpenAiModule {}
