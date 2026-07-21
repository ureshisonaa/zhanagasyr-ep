import { Module } from '@nestjs/common';
import { OpenAiModule } from '../openai/openai.module';
import { EmbeddingsService } from './embeddings.service';

@Module({
  imports: [OpenAiModule],
  providers: [EmbeddingsService],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
