import { IsString, IsUUID, Length } from 'class-validator';

export class AiChatDto {
  @IsUUID()
  public applicationId!: string;

  @IsString()
  @Length(1, 10000)
  public message!: string;
}
