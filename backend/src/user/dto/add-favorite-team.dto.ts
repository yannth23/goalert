import { IsNotEmpty, IsString } from 'class-validator';

export class AddFavoriteTeamDto {
  @IsString()
  @IsNotEmpty()
  teamName: string;
}
