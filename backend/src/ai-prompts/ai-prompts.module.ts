import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiPromptsController } from './ai-prompts.controller';
import { AiPromptsService } from './ai-prompts.service';

@Module({
  imports: [AuthModule],
  controllers: [AiPromptsController],
  providers: [AiPromptsService],
  exports: [AiPromptsService],
})
export class AiPromptsModule {}
