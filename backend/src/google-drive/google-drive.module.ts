import { Module } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';

/** Без контроллера: "Frontend никогда не работает с Google Drive напрямую" (ТЗ, Часть 3, п.13). */
@Module({
  providers: [GoogleDriveService],
  exports: [GoogleDriveService],
})
export class GoogleDriveModule {}
