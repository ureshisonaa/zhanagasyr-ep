import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateDocumentTypeDto } from './create-document-type.dto';

export class UpdateDocumentTypeDto extends PartialType(CreateDocumentTypeDto) {
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}
