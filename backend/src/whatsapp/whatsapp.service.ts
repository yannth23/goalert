import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  private get baseUrl(): string {
    const instanceId = process.env.ZAPI_INSTANCE_ID;
    const token      = process.env.ZAPI_TOKEN;
    return `https://api.z-api.io/instances/${instanceId}/token/${token}`;
  }

  private get clientToken(): string {
    return process.env.ZAPI_CLIENT_TOKEN ?? '';
  }

  async sendText(phone: string, text: string): Promise<void> {
    const number = this.normalizePhone(phone);
    try {
      await axios.post(
        `${this.baseUrl}/send-text`,
        { phone: number, message: text },
        { headers: { 'Client-Token': this.clientToken, 'Content-Type': 'application/json' } },
      );
      this.logger.log(`WhatsApp enviado para ${number}`);
    } catch (err: any) {
      this.logger.error(
        `Falha ao enviar WhatsApp para ${number}`,
        err?.response?.data ?? err.message,
      );
      throw err;
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (!digits.startsWith('55')) return `55${digits}`;
    return digits;
  }
}
