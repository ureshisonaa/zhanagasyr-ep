import { Module } from '@nestjs/common';
import { AiPromptsModule } from '../ai-prompts/ai-prompts.module';
import { AiSessionsModule } from '../ai-sessions/ai-sessions.module';
import { ChatModule } from '../chat/chat.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { OpenAiModule } from '../openai/openai.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { PromptBuilderService } from './prompt-builder.service';

@Module({
  imports: [ChatModule, EmbeddingsModule, OpenAiModule, AiSessionsModule, AiPromptsModule],
  controllers: [AiController],
  providers: [AiService, PromptBuilderService],
  exports: [AiService],
})
export class AiModule {}
