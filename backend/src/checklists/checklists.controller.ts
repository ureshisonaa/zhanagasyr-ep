import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { ChecklistsService } from './checklists.service';
import { ToggleChecklistItemDto } from './dto/toggle-checklist-item.dto';
import type { ChecklistItemResponse } from './interfaces/checklist-item-response.interface';
import type { ChecklistResponse } from './interfaces/checklist-response.interface';

/**
 * Роут не помечен @Public() — чек-лист привязан к персональной заявке.
 */
@Controller('checklists')
export class ChecklistsController {
  public constructor(private readonly checklistsService: ChecklistsService) {}

  @Get(':applicationId')
  public async findByApplication(
    @CurrentUser() user: SanitizedUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<{ success: true; checklist: ChecklistResponse }> {
    const checklist = await this.checklistsService.getByApplicationForUser(user, applicationId);
    return { success: true, checklist };
  }

  /** items/:id — не конфликтует с :applicationId выше (GET vs PUT, разные пути). */
  @HttpCode(HttpStatus.OK)
  @Put('items/:id')
  public async toggleItem(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleChecklistItemDto,
  ): Promise<{ success: true; item: ChecklistItemResponse }> {
    const item = await this.checklistsService.toggleItem(user, id, dto);
    return { success: true, item };
  }
}
