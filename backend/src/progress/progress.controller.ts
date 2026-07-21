import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import type { ProgressResponse } from './interfaces/progress-response.interface';
import { ProgressService } from './progress.service';

@Controller('progress')
export class ProgressController {
  public constructor(private readonly progressService: ProgressService) {}

  @Get(':applicationId')
  public async getProgress(
    @CurrentUser() user: SanitizedUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<{ success: true; progress: ProgressResponse }> {
    const progress = await this.progressService.calculateForApplication(user, applicationId);
    return { success: true, progress };
  }
}
