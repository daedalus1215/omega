import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendReminderEmail(
    to: string,
    eventTitle: string,
    eventStartDate: Date,
    reminderMinutes: number
  ): Promise<void> {
    const reminderTime = new Date(
      eventStartDate.getTime() - reminderMinutes * 60 * 1000
    );
    const reminderTimeStr = reminderTime.toLocaleString();
    const eventTimeStr = eventStartDate.toLocaleString();

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM'),
      to,
      subject: `Reminder: ${eventTitle}`,
      html: `
        <h2>Event Reminder</h2>
        <p>This is a reminder for your upcoming event:</p>
        <p><strong>Event:</strong> ${eventTitle}</p>
        <p><strong>Event Time:</strong> ${eventTimeStr}</p>
        <p><strong>Reminder Set For:</strong> ${reminderMinutes} minute(s) before the event</p>
        <p><strong>Reminder Time:</strong> ${reminderTimeStr}</p>
      `,
      text: `
        Event Reminder
        
        This is a reminder for your upcoming event:
        
        Event: ${eventTitle}
        Event Time: ${eventTimeStr}
        Reminder Set For: ${reminderMinutes} minute(s) before the event
        Reminder Time: ${reminderTimeStr}
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Reminder email sent to ${to} for event: ${eventTitle}`);
    } catch (error) {
      this.logger.error(
        `Failed to send reminder email to ${to}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
