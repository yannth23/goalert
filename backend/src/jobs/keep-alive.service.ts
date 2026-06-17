import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class KeepAliveService {
  private readonly logger = new Logger(KeepAliveService.name);

  // Pinga o próprio backend a cada 10 minutos para evitar cold start no Render
  @Cron('*/10 * * * *', { name: 'keep-alive' })
  async ping() {
    const url = process.env.BACKEND_URL ?? 'https://goal-alert.onrender.com';
    try {
      const res = await fetch(`${url}/health`);
      this.logger.log(`Keep-alive ping → ${res.status}`);
    } catch (err) {
      this.logger.warn(`Keep-alive ping falhou: ${err}`);
    }
  }
}
