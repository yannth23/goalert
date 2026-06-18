import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FootballApiService } from '../football-match/football-api.service';

@Injectable()
export class MatchSyncService {
  private readonly logger = new Logger(MatchSyncService.name);

  constructor(private readonly footballApiService: FootballApiService) {}

  // Sincroniza os jogos automaticamente todos os dias às 04:00 AM (Horário de Brasília aprox.)
  // '0 0 7 * * *' em UTC seria 04:00 AM em SP (UTC-3)
  @Cron('0 0 7 * * *')
  async handleDailySync() {
    this.logger.log('Iniciando sincronização diária de partidas...');
    try {
      await this.footballApiService.syncTodayMatches();
      this.logger.log('Sincronização diária concluída com sucesso.');
    } catch (error) {
      this.logger.error('Erro na sincronização diária:', error);
    }
  }

  // Sincroniza a cada 2 minutos para manter os placares e status atualizados em tempo real
  @Cron('0 */2 * * * *')
  async handleLiveUpdate() {
    this.logger.log('Atualizando placares das partidas...');
    try {
      await this.footballApiService.syncTodayMatches();
    } catch (error) {
      this.logger.error('Erro na atualização de placares:', error);
    }
  }
}
