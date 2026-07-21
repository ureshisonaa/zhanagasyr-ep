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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { DocumentTypesService } from './document-types.service';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import type { DocumentTypeResponse } from './interfaces/document-type-response.interface';

const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

/**
 * Чтение больше не @Public() (Этап 11.3) — та же причина, что и у
 * Universities/Programs/AdmissionCycles (Этап 11.2): @Public() полностью
 * пропускает JWT-стратегию, req.user не заполняется даже для залогиненного
 * Admin, поэтому includeInactive для Admin было бы невозможно реализовать,
 * оставив роут публичным.
 */
@Controller('document-types')
export class DocumentTypesController {
  public constructor(private readonly documentTypesService: DocumentTypesService) {}

  @Get()
  public async findAll(
    @CurrentUser() user: SanitizedUser,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<{ success: true; documentTypes: DocumentTypeResponse[] }> {
    const documentTypes = await this.documentTypesService.findAll(user, includeInactive === 'true');
    return { success: true, documentTypes };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @Post()
  public async create(
    @Body() dto: CreateDocumentTypeDto,
  ): Promise<{ success: true; documentType: DocumentTypeResponse }> {
    const documentType = await this.documentTypesService.create(dto);
    return { success: true, documentType };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @Put(':id')
  public async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentTypeDto,
  ): Promise<{ success: true; documentType: DocumentTypeResponse }> {
    const documentType = await this.documentTypesService.update(id, dto);
    return { success: true, documentType };
  }

  @Roles(...ADMIN_ROLES)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ success: true }> {
    await this.documentTypesService.softDelete(id);
    return { success: true };
  }
}
