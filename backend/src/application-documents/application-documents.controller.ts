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
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { ApplicationDocumentsService } from './application-documents.service';
import { CreateApplicationDocumentDto } from './dto/create-application-document.dto';
import type { ApplicationDocumentResponse } from './interfaces/application-document-response.interface';

/** Ни один роут не публичен — доступ контролируется владением заявкой (см. сервис). */
@Controller('application-documents')
export class ApplicationDocumentsController {
  public constructor(private readonly applicationDocumentsService: ApplicationDocumentsService) {}

  @Post()
  public async link(
    @CurrentUser() user: SanitizedUser,
    @Body() dto: CreateApplicationDocumentDto,
  ): Promise<{ success: true; applicationDocument: ApplicationDocumentResponse }> {
    const applicationDocument = await this.applicationDocumentsService.link(user, dto);
    return { success: true, applicationDocument };
  }

  @Get(':applicationId')
  public async findAll(
    @CurrentUser() user: SanitizedUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<{ success: true; applicationDocuments: ApplicationDocumentResponse[] }> {
    const applicationDocuments = await this.applicationDocumentsService.findAllForApplication(
      user,
      applicationId,
    );
    return { success: true, applicationDocuments };
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async unlink(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.applicationDocumentsService.unlink(user, id);
    return { success: true };
  }
}
