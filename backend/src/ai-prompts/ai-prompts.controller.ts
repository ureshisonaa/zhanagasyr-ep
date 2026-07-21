import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiPromptsService } from './ai-prompts.service';
import { CreateAiPromptDto } from './dto/create-ai-prompt.dto';
import { UpdateAiPromptDto } from './dto/update-ai-prompt.dto';
import type { AiPromptResponse } from './interfaces/ai-prompt-response.interface';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

/** Весь контроллер только для Admin/SuperAdmin — системные промпты не для чтения студентами/наставниками. */
@Roles(...ADMIN_ROLES)
@UseGuards(RolesGuard)
@Controller('ai-prompts')
export class AiPromptsController {
  public constructor(private readonly aiPromptsService: AiPromptsService) {}

  @Get()
  public async findAll(): Promise<{ success: true; prompts: AiPromptResponse[] }> {
    const prompts = await this.aiPromptsService.findAll();
    return { success: true, prompts };
  }

  @Post()
  public async create(
    @Body() dto: CreateAiPromptDto,
  ): Promise<{ success: true; prompt: AiPromptResponse }> {
    const prompt = await this.aiPromptsService.create(dto);
    return { success: true, prompt };
  }

  @Put(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAiPromptDto,
  ): Promise<{ success: true; prompt: AiPromptResponse }> {
    const prompt = await this.aiPromptsService.update(id, dto);
    return { success: true, prompt };
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: true }> {
    await this.aiPromptsService.remove(id);
    return { success: true };
  }
}
