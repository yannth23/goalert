import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN;

  private get baseUrl() {
    return `https://api.telegram.org/bot${this.token}`;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured');
      return;
    }
    try {
      await axios.post(`${this.baseUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      });
      this.logger.log(`Telegram enviado para ${chatId}`);
    } catch (err: any) {
      this.logger.error(`Falha ao enviar para ${chatId}`, err?.response?.data ?? err.message);
    }
  }
}
