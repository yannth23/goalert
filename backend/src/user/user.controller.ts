import {
  Controller, Post, Get, Delete, Patch, Body, Param,
  HttpCode, HttpStatus, UseGuards, Request, ForbiddenException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { AddFavoriteTeamDto } from './dto/add-favorite-team.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateTelegramDto } from './dto/update-telegram.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.userService.create(body.email, body.password, body.name);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findById(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.userService.findById(id);
  }

  @Post(':id/teams')
  @UseGuards(JwtAuthGuard)
  addFavoriteTeam(
    @Param('id') id: string,
    @Body() body: AddFavoriteTeamDto,
    @Request() req: { user: { id: string } },
  ) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.userService.addFavoriteTeam(id, body.teamName);
  }

  @Delete(':id/teams/:teamName')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFavoriteTeam(
    @Param('id') id: string,
    @Param('teamName') teamName: string,
    @Request() req: { user: { id: string } },
  ) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.userService.removeFavoriteTeam(id, teamName);
  }

  @Patch(':id/preferences')
  @UseGuards(JwtAuthGuard)
  updatePreferences(
    @Param('id') id: string,
    @Body() body: UpdatePreferencesDto,
    @Request() req: { user: { id: string } },
  ) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.userService.updatePreferences(id, body.receiveDailyNotifications);
  }

  @Patch(':id/telegram')
  @UseGuards(JwtAuthGuard)
  updateTelegram(
    @Param('id') id: string,
    @Body() body: UpdateTelegramDto,
    @Request() req: { user: { id: string } },
  ) {
    if (req.user.id !== id) throw new ForbiddenException();
    return this.userService.updateTelegram(id, body.telegramChatId, body.receiveTelegramNotifications);
  }
}
