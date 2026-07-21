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
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { CreateArticleDto } from './dto/create-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import type { KnowledgeArticleResponse } from './interfaces/knowledge-article-response.interface';
import { KnowledgeService } from './knowledge.service';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

/**
 * Найдено в финальном security-review (Этап 12.1): чтение оставалось
 * @Public() — та же причина для исправления, что и у Universities/Programs/
 * AdmissionCycles/DocumentTypes (Этапы 11.2/11.3): платформа закрытая, весь
 * frontend и так работает только под авторизацией — анонимный доступ к
 * базе знаний (внутренние материалы по поступлению, стипендиям) никогда не
 * был практически нужен. Пропущено при исправлении остальных четырёх
 * справочников — здесь нет includeInactive-логики (KnowledgeBase не имеет
 * soft-delete), поэтому единственное изменение — убрать @Public().
 */
@Controller('knowledge')
export class KnowledgeController {
  public constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  public async findAll(
    @Query() query: QueryArticlesDto,
  ): Promise<{ success: true } & PaginatedResult<KnowledgeArticleResponse>> {
    const result = await this.knowledgeService.findAll(query);
    return { success: true, ...result };
  }

  @Get(':id')
  public async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; article: KnowledgeArticleResponse }> {
    const article = await this.knowledgeService.findOne(id);
    return { success: true, article };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @Post()
  public async create(
    @Body() dto: CreateArticleDto,
  ): Promise<{ success: true; article: KnowledgeArticleResponse }> {
    const article = await this.knowledgeService.create(dto);
    return { success: true, article };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @Put(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArticleDto,
  ): Promise<{ success: true; article: KnowledgeArticleResponse }> {
    const article = await this.knowledgeService.update(id, dto);
    return { success: true, article };
  }

  /** Roadmap, Этап 11.3: "кнопка переиндексировать" — повтор попытки без изменения содержимого. */
  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Post(':id/reindex')
  public async reindex(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true; article: KnowledgeArticleResponse }> {
    const article = await this.knowledgeService.reindex(id);
    return { success: true, article };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: true }> {
    await this.knowledgeService.remove(id);
    return { success: true };
  }
}
