import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateAiPromptDto } from './dto/create-ai-prompt.dto';
import type { UpdateAiPromptDto } from './dto/update-ai-prompt.dto';
import type { AiPromptResponse } from './interfaces/ai-prompt-response.interface';
import { toAiPromptResponse } from './utils/to-ai-prompt-response.util';

@Injectable()
export class AiPromptsService {
  public constructor(private readonly prisma: PrismaService) {}

  public async findAll(): Promise<AiPromptResponse[]> {
    const prompts = await this.prisma.aiPrompt.findMany({ orderBy: { name: 'asc' } });
    return prompts.map(toAiPromptResponse);
  }

  public async create(dto: CreateAiPromptDto): Promise<AiPromptResponse> {
    try {
      const prompt = await this.prisma.aiPrompt.create({ data: dto });
      return toAiPromptResponse(prompt);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('A prompt with this name already exists');
      }
      throw error;
    }
  }

  public async update(id: string, dto: UpdateAiPromptDto): Promise<AiPromptResponse> {
    await this.ensureExists(id);
    const prompt = await this.prisma.aiPrompt.update({ where: { id }, data: dto });
    return toAiPromptResponse(prompt);
  }

  public async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.aiPrompt.delete({ where: { id } });
  }

  /**
   * Реализация назначения таблицы из ТЗ ("Позволяет менять поведение ИИ
   * без изменения кода") — используется PromptBuilderService (Этап 5.5)
   * и другими AI-сервисами вместо жёстко закодированной строки. Фолбэк
   * на встроенный дефолт, если Admin ещё не создал запись с этим `name` —
   * платформа продолжает работать из коробки без обязательной настройки.
   */
  public async getByNameOrDefault(name: string, defaultPrompt: string): Promise<string> {
    const prompt = await this.prisma.aiPrompt.findUnique({ where: { name } });
    return prompt?.prompt ?? defaultPrompt;
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.aiPrompt.findUnique({ where: { id } });

    if (!exists) {
      throw new NotFoundException('Prompt not found');
    }
  }
}
