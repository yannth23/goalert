import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  private get apiUrl(): string {
    return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      });
      this.logger.log(`Telegram enviado para ${chatId}`);
    } catch (err: any) {
      this.logger.error(
        `Falha ao enviar Telegram para ${chatId}`,
        err?.response?.data ?? err.message,
      );
    }
  }
}
