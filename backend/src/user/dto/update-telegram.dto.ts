import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateTelegramDto {
  @IsOptional()
  @IsString()
  telegramChatId: string | null;

  @IsBoolean()
  receiveTelegramNotifications: boolean;
}
