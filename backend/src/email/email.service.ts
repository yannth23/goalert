import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async sendDailyEmail(to: string, html: string): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? 'GoalAlert <noreply@yourdomain.com>',
      to,
      subject: "Today's Matches — GoalAlert",
      html,
    });

    if (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw new Error(error.message);
    }

    this.logger.log(`Email sent to ${to}`);
  }
}