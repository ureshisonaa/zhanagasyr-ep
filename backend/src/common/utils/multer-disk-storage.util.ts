import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Request } from 'express';
import type { SanitizedUser } from '../../auth/interfaces/sanitized-user.interface';

type RequestWithOptionalUser = Request & { user?: SanitizedUser };

interface BuildMulterDiskStorageOptions {
  uploadDir: string;
  allowedMimeTypes: readonly string[];
  maxSizeBytes: number;
  unsupportedTypeMessage: string;
}

/**
 * Общая фабрика для Multer diskStorage-конфигураций (используется аватарами
 * — Этап 1.3, и документами — Этап 4.1). Выделена сюда после того, как
 * вторая копия того же кода (создание директории, генерация имени файла
 * "{userId}-{timestamp}.ext", фильтрация по MIME) сделала дублирование
 * очевидным.
 */
export function buildMulterDiskStorageOptions(options: BuildMulterDiskStorageOptions): {
  storage: ReturnType<typeof diskStorage>;
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => void;
  limits: { fileSize: number };
} {
  if (!existsSync(options.uploadDir)) {
    mkdirSync(options.uploadDir, { recursive: true });
  }

  return {
    storage: diskStorage({
      destination: options.uploadDir,
      filename: (
        req: RequestWithOptionalUser,
        file: Express.Multer.File,
        callback: (error: Error | null, filename: string) => void,
      ): void => {
        const userId = req.user?.id ?? 'unknown';
        const uniqueSuffix = Date.now();
        callback(null, `${userId}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ): void => {
      if (!options.allowedMimeTypes.includes(file.mimetype)) {
        callback(new BadRequestException(options.unsupportedTypeMessage), false);
        return;
      }
      callback(null, true);
    },
    limits: { fileSize: options.maxSizeBytes },
  };
}
