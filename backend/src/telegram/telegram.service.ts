import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN;
  private offset = 0;
  private polling = false;

  private get baseUrl() {
    return `https://api.telegram.org/bot${this.token}`;
  }

  async onApplicationBootstrap() {
    if (!this.token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured — polling disabled');
      return;
    }

    // Remove webhook antes de iniciar polling (evita conflito 409)
    try {
      await axios.post(`${this.baseUrl}/deleteWebhook`);
      this.logger.log('Webhook removido com sucesso');
    } catch (err: any) {
      this.logger.warn('Falha ao remover webhook', err?.message);
    }

    this.logger.log('Starting Telegram polling...');
    this.startPolling();
  }

  private async startPolling() {
    if (this.polling) return;
    this.polling = true;

    while (this.polling) {
      try {
        const res = await axios.get(`${this.baseUrl}/getUpdates`, {
          params: { offset: this.offset, timeout: 30 },
          timeout: 35000,
        });

        const updates = res.data.result as any[];

        for (const update of updates) {
          this.offset = update.update_id + 1;
          await this.handleUpdate(update);
        }
      } catch (err: any) {
        const status = err?.response?.status;
        const msg    = err?.response?.data?.description ?? err?.message;

        if (status === 409) {
          this.logger.warn('Conflito 409 — tentando remover webhook novamente...');
          try {
            await axios.post(`${this.baseUrl}/deleteWebhook`);
            this.logger.log('Webhook removido, retomando polling...');
          } catch (e: any) {
            this.logger.error('Falha ao remover webhook no retry', e?.message);
          }
        } else if (err?.code !== 'ECONNABORTED') {
          this.logger.error(`Polling error: ${msg}`);
        }

        await this.sleep(3000);
      }
    }
  }

  private async handleUpdate(update: any) {
    const msg = update.message;
    if (!msg) return;

    const chatId = String(msg.chat.id);
    const text   = msg.text ?? '';

    if (text === '/start') {
      await this.sendMessage(
        chatId,
        `👋 *Bem-vindo ao GoalAlert!*

Seu *Chat ID* é:
\`${chatId}\`

Copie esse número e cole em *Minha conta → Alertas via Telegram* no GoalAlert para receber notificações de gols e jogos! ⚽`,
      );
      return;
    }

    if (text === '/id') {
      await this.sendMessage(chatId, `Seu Chat ID: \`${chatId}\``);
    }
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
      throw err;
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
