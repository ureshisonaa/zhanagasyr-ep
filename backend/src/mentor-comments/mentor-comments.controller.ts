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
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { SanitizedUser } from '../auth/interfaces/sanitized-user.interface';
import { CreateMentorCommentDto } from './dto/create-mentor-comment.dto';
import { UpdateMentorCommentDto } from './dto/update-mentor-comment.dto';
import type { MentorCommentResponse } from './interfaces/mentor-comment-response.interface';
import { MentorCommentsService } from './mentor-comments.service';

/** Ни один роут не публичен. Раздельные роуты чтения — по заявке и по документу, чтобы не гадать по единственному :id, что именно ищем. */
@Controller('mentor-comments')
export class MentorCommentsController {
  public constructor(private readonly mentorCommentsService: MentorCommentsService) {}

  @Post()
  public async create(
    @CurrentUser() user: SanitizedUser,
    @Body() dto: CreateMentorCommentDto,
  ): Promise<{ success: true; comment: MentorCommentResponse }> {
    const comment = await this.mentorCommentsService.create(user, dto);
    return { success: true, comment };
  }

  @Get('application/:applicationId')
  public async findAllForApplication(
    @CurrentUser() user: SanitizedUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<{ success: true; comments: MentorCommentResponse[] }> {
    const comments = await this.mentorCommentsService.findAllForApplication(user, applicationId);
    return { success: true, comments };
  }

  @Get('document/:documentId')
  public async findAllForDocument(
    @CurrentUser() user: SanitizedUser,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<{ success: true; comments: MentorCommentResponse[] }> {
    const comments = await this.mentorCommentsService.findAllForDocument(user, documentId);
    return { success: true, comments };
  }

  @Put(':id')
  public async update(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMentorCommentDto,
  ): Promise<{ success: true; comment: MentorCommentResponse }> {
    const comment = await this.mentorCommentsService.update(user, id, dto);
    return { success: true, comment };
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async remove(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.mentorCommentsService.remove(user, id);
    return { success: true };
  }
}
