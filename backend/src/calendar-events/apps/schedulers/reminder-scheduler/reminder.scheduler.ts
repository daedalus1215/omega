import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventReminderRepository } from '../../../infra/repositories/event-reminder.repository';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { UserAggregator } from '../../../../users/domain/aggregators/user.aggregator';
import { EmailService } from '../../../../shared-kernel/domain/services/email.service';
import { CalendarEvent } from '../../../domain/entities/calendar-event.entity';
import {
  LATE_DELIVERY_GRACE_MINUTES,
  LATE_DELIVERY_NOTICE_SECONDS,
  MAX_REMINDER_MINUTES,
} from '../../../domain/reminder.constants';

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
      const now = new Date();
      const graceCutoff = new Date(
        now.getTime() - LATE_DELIVERY_GRACE_MINUTES * 60 * 1000
      );
      // A reminder can only be due if its event starts between the oldest time
      // we would still deliver for and the furthest lead time we allow.
      const upperBound = new Date(
        now.getTime() + MAX_REMINDER_MINUTES * 60 * 1000
      );

      const candidates = await this.eventReminderRepository.findDueCandidates(
        graceCutoff,
        upperBound
      );
      this.logger.debug(`Found ${candidates.length} candidate reminders`);
      if (candidates.length === 0) {
        return;
      }

      const eventsById = await this.loadEventsById(candidates);

      for (const reminder of candidates) {
        try {
          const event = eventsById.get(reminder.calendarEventId);
          if (!event) {
            // The join in findDueCandidates already excludes reminders whose
            // event is gone, so this only happens if the event was deleted
            // between the two queries. It will simply not be selected again.
            continue;
          }

          const reminderTime = new Date(
            event.startDate.getTime() - reminder.reminderMinutes * 60 * 1000
          );
          const latenessMs = now.getTime() - reminderTime.getTime();

          if (latenessMs < 0) {
            this.logger.debug(
              `Reminder ${reminder.id} is scheduled for ${Math.round(-latenessMs / 1000)}s from now`
            );
            continue;
          }

          if (reminderTime < graceCutoff) {
            // Too old to be useful. Retire it so it stops being scanned rather
            // than delivering a reminder the user can no longer act on.
            this.logger.warn(
              `Reminder ${reminder.id} for event ${event.id} is ${Math.round(latenessMs / 60000)}m overdue, beyond the ${LATE_DELIVERY_GRACE_MINUTES}m grace period. Retiring without sending.`
            );
            await this.eventReminderRepository.markAsSent(reminder.id);
            continue;
          }

          const userEmail = await this.resolveUserEmail(event);
          if (!userEmail) {
            continue;
          }

          const isLate = latenessMs > LATE_DELIVERY_NOTICE_SECONDS * 1000;

          try {
            await this.emailService.sendReminderEmail(
              userEmail,
              event.title,
              event.startDate,
              reminder.reminderMinutes,
              isLate
            );

            await this.eventReminderRepository.markAsSent(reminder.id);
            this.logger.log(
              `✓ Sent reminder ${reminder.id} for event "${event.title}" (ID: ${event.id}) to ${userEmail}${isLate ? ` (${Math.round(latenessMs / 1000)}s late)` : ''}`
            );
          } catch (error) {
            // Deliberately not marked as sent, so the next tick retries it
            // while it is still inside the grace period.
            this.logger.error(
              `Failed to send reminder ${reminder.id} to ${userEmail}: ${error.message}`
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
   * Load every event referenced by the candidate reminders in one query, so
   * processing stays at two queries regardless of how many reminders are due.
   */
  private async loadEventsById(
    candidates: { calendarEventId: number }[]
  ): Promise<Map<number, CalendarEvent>> {
    const eventIds = [...new Set(candidates.map(c => c.calendarEventId))];
    const events = await this.calendarEventRepository.findByIdsOnly(eventIds);
    return new Map(events.map(event => [event.id, event]));
  }

  /**
   * Reminders are delivered to the username, which doubles as the email
   * address. Returns null when it is not a usable address.
   */
  private async resolveUserEmail(event: CalendarEvent): Promise<string | null> {
    const username = await this.userAggregator.findUsernameById(event.userId);
    if (!username) {
      this.logger.warn(`User ${event.userId} not found for event ${event.id}`);
      return null;
    }

    if (!this.isValidEmail(username)) {
      this.logger.warn(
        `User ${event.userId} has username "${username}" which is not a valid email address. Skipping reminder for event ${event.id}.`
      );
      return null;
    }

    return username;
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
