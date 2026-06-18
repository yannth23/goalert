import { Controller, Post, Get, Delete, Patch, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() body: { email: string; password: string; name?: string }) {
    return this.userService.create(body.email, body.password, body.name);
  }

  @Get()
  findAll() { return this.userService.findAll(); }

  @Get(':id')
  findById(@Param('id') id: string) { return this.userService.findById(id); }

  @Post(':id/teams')
  addFavoriteTeam(@Param('id') id: string, @Body() body: { teamName: string }) {
    return this.userService.addFavoriteTeam(id, body.teamName);
  }

  @Delete(':id/teams/:teamName')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFavoriteTeam(@Param('id') id: string, @Param('teamName') teamName: string) {
    return this.userService.removeFavoriteTeam(id, teamName);
  }

  @Patch(':id/preferences')
  updatePreferences(@Param('id') id: string, @Body() body: { receiveDailyNotifications: boolean }) {
    return this.userService.updatePreferences(id, body.receiveDailyNotifications);
  }

  @Patch(':id/telegram')
  updateTelegram(
    @Param('id') id: string,
    @Body() body: { telegramChatId: string | null; receiveTelegramNotifications: boolean },
  ) {
    return this.userService.updateTelegram(id, body.telegramChatId, body.receiveTelegramNotifications);
  }
}
