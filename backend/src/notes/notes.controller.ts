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
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import type { NoteResponse } from './interfaces/note-response.interface';
import { NotesService } from './notes.service';

/** Ни один роут не публичен — заметки персональные/по заявке. */
@Controller('notes')
export class NotesController {
  public constructor(private readonly notesService: NotesService) {}

  @Post(':applicationId')
  public async create(
    @CurrentUser() user: SanitizedUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: CreateNoteDto,
  ): Promise<{ success: true; note: NoteResponse }> {
    const note = await this.notesService.create(user, applicationId, dto);
    return { success: true, note };
  }

  @Get(':applicationId')
  public async findAll(
    @CurrentUser() user: SanitizedUser,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<{ success: true; notes: NoteResponse[] }> {
    const notes = await this.notesService.findAllForApplication(user, applicationId);
    return { success: true, notes };
  }

  @Put(':id')
  public async update(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNoteDto,
  ): Promise<{ success: true; note: NoteResponse }> {
    const note = await this.notesService.update(user, id, dto);
    return { success: true, note };
  }

  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async remove(
    @CurrentUser() user: SanitizedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ success: true }> {
    await this.notesService.remove(user, id);
    return { success: true };
  }
}
