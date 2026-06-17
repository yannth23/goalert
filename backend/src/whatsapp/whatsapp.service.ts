import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl  = process.env.EVOLUTION_API_URL;
  private readonly instance = process.env.EVOLUTION_INSTANCE;
  private readonly apiKey   = process.env.EVOLUTION_API_KEY;

  private get headers() {
    return { apikey: this.apiKey, 'Content-Type': 'application/json' };
  }

  /** Envia uma mensagem de texto simples */
  async sendText(phone: string, text: string): Promise<void> {
    const number = this.normalizePhone(phone);
    try {
      await axios.post(
        `${this.baseUrl}/message/sendText/${this.instance}`,
        { number, text },
        { headers: this.headers },
      );
      this.logger.log(`WhatsApp enviado para ${number}`);
    } catch (err: any) {
      this.logger.error(`Falha ao enviar WhatsApp para ${number}`, err?.response?.data ?? err.message);
    }
  }

  /** Normaliza número: remove tudo exceto dígitos e garante código do país */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    // Se não começar com código de país (55 para Brasil), adiciona
    if (!digits.startsWith('55')) return `55${digits}`;
    return digits;
  }
}
