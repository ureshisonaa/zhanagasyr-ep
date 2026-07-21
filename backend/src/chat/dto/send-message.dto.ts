import { IsString, IsUUID, Length } from 'class-validator';

export class SendMessageDto {
  @IsUUID()
  public applicationId!: string;

  @IsString()
  @Length(1, 10000)
  public content!: string;
}
