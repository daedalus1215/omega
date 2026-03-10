import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventReminderRepository } from '../../../infra/repositories/event-reminder.repository';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { UserAggregator } from '../../../../users/domain/aggregators/user.aggregator';
import { EmailService } from '../../../../shared-kernel/domain/services/email.service';

/**
 * Scheduler for processing and sending event reminder emails.
 * Runs every minute to check for reminders that are due.
 */
@Injectable()
export class ReminderScheduler {
  private readonly logger = new Logger(ReminderScheduler.name);

  constructor(
    private readonly eventReminderRepository: EventReminderRepository,
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly userAggregator: UserAggregator,
    private readonly emailService: EmailService
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleReminderCron(): Promise<void> {
    this.logger.debug('Running reminder cron job');

    try {
      const pendingReminders =
        await this.eventReminderRepository.findPendingReminders();
      this.logger.debug(`Found ${pendingReminders.length} pending reminders`);

      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      for (const reminder of pendingReminders) {
        try {
          const event = await this.calendarEventRepository.findByIdOnly(
            reminder.calendarEventId
          );
          if (!event) {
            this.logger.warn(
              `Event ${reminder.calendarEventId} not found for reminder ${reminder.id}. This reminder is orphaned (event was deleted). Marking as sent to prevent repeated warnings.`
            );
            // Mark orphaned reminders as sent to prevent repeated warnings
            try {
              await this.eventReminderRepository.markAsSent(reminder.id);
            } catch (error) {
              this.logger.error(
                `Failed to mark orphaned reminder ${reminder.id} as sent: ${error.message}`
              );
            }
            continue;
          }

          const reminderTime = new Date(
            event.startDate.getTime() - reminder.reminderMinutes * 60 * 1000
          );

          const reminderTimeDiff = reminderTime.getTime() - now.getTime();
          this.logger.debug(
            `Reminder ${reminder.id} for event ${event.id}: reminderTime=${reminderTime.toISOString()}, now=${now.toISOString()}, diff=${Math.round(reminderTimeDiff / 1000)}s`
          );

          if (reminderTime <= now && reminderTime >= oneMinuteAgo) {
            this.logger.debug(`Reminder ${reminder.id} is due - processing...`);
            const username = await this.userAggregator.findUsernameById(
              event.userId
            );
            if (!username) {
              this.logger.warn(
                `User ${event.userId} not found for event ${event.id}`
              );
              continue;
            }

            // Use username directly if it's already a valid email, otherwise skip
            let userEmail: string;
            if (this.isValidEmail(username)) {
              userEmail = username;
              this.logger.debug(`Using username as email: ${userEmail}`);
            } else {
              this.logger.warn(
                `User ${event.userId} has username "${username}" which is not a valid email address. Skipping reminder ${reminder.id}.`
              );
              continue;
            }

            try {
              await this.emailService.sendReminderEmail(
                userEmail,
                event.title,
                event.startDate,
                reminder.reminderMinutes
              );

              await this.eventReminderRepository.markAsSent(reminder.id);
              this.logger.log(
                `✓ Sent reminder ${reminder.id} for event "${event.title}" (ID: ${event.id}) to ${userEmail}`
              );
            } catch (error) {
              this.logger.error(
                `Failed to send reminder ${reminder.id} to ${userEmail}: ${error.message}`
              );
              // Don't mark as sent if email failed
            }
          } else if (reminderTime > now) {
            this.logger.debug(
              `Reminder ${reminder.id} is scheduled for future: ${Math.round(reminderTimeDiff / 1000)}s from now`
            );
          } else {
            this.logger.debug(
              `Reminder ${reminder.id} time has passed (${Math.round(-reminderTimeDiff / 1000)}s ago) but outside 1-minute window`
            );
          }
        } catch (error) {
          this.logger.error(
            `Error processing reminder ${reminder.id}: ${error.message}`,
            error.stack
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in reminder cron job: ${error.message}`,
        error.stack
      );
    }
  }

  /**
   * Validate email format using a simple regex.
   * @param email - Email address to validate
   * @returns true if email format is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
