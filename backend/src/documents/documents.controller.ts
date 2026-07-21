import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import type { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { DocumentsService } from './documents.service';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import type { DocumentResponse } from './interfaces/document-response.interface';
import { documentMulterOptions } from './multer/document-storage.config';

/**
 * Ни один роут не публичен — документы персональные. Пагинация добавлена
 * на Этапе 12.2 — при накоплении документов через много заявок список без
 * неё не масштабируется (изначальное решение Этапа 4.1 больше не
 * актуально с ростом использования платформы).
 */
@Controller('documents')
export class DocumentsController {
  public constructor(private readonly documentsService: DocumentsService) {}

  /** Строже общего лимита — запускает Google Drive + асинхронную AI-проверку (Этап 6.1), дорогая операция. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', documentMulterOptions))
  public async upload(
    @CurrentUser() user: SanitizedUser,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<{ success: true; document: DocumentResponse }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const document = await this.documentsService.upload(user.id, dto.documentTypeId, file);
    return { success: true, document };
  }

  @Get()
  public async findAll(
    @CurrentUser() user: SanitizedUser,
    @Query() query: QueryDocumentsDto,
  ): Promise<{ success: true } & PaginatedResult<DocumentResponse>> {
    const result = await this.documentsService.findAllForUser(user.id, query);
    return { success: true, ...result };
  }

  @HttpCode(HttpStatus.OK)
  @Put(':id/status')
  public async updateStatus(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentStatusDto,
  ): Promise<{ success: true; document: DocumentResponse }> {
    const document = await this.documentsService.updateStatusManually(user, id, dto);
    return { success: true, document };
  }
}
