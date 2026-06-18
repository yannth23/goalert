import { IsBoolean } from 'class-validator';

export class UpdatePreferencesDto {
  @IsBoolean()
  receiveDailyNotifications: boolean;
}
