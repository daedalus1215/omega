import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventReminderRepository } from '../../../infra/repositories/event-reminder.repository';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { UserAggregator } from '../../../../users/domain/aggregators/user.aggregator';
import { CalendarAccessAggregator } from '../../../../calendars/domain/aggregators/calendar-access.aggregator';
import { EmailService } from '../../../../shared-kernel/domain/services/email.service';
import { CalendarEvent } from '../../../domain/entities/calendar-event.entity';
import { EventReminder } from '../../../domain/entities/event-reminder.entity';
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
    private readonly calendarAccessAggregator: CalendarAccessAggregator,
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

          const isLate = latenessMs > LATE_DELIVERY_NOTICE_SECONDS * 1000;
          const lateSeconds = isLate ? Math.round(latenessMs / 1000) : 0;
          await this.deliverToMembers(reminder, event, isLate, lateSeconds);
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
   * Send one due reminder to every member of the event's calendar.
   * Marks it sent only when every recipient was delivered; a partial failure
   * leaves it unsent so the next tick retries within the grace period.
   */
  private async deliverToMembers(
    reminder: EventReminder,
    event: CalendarEvent,
    isLate: boolean,
    lateSeconds: number
  ): Promise<void> {
    const memberEmails = await this.resolveMemberEmails(event);
    if (memberEmails.length === 0) {
      return;
    }

    let allDelivered = true;
    for (const email of memberEmails) {
      try {
        await this.emailService.sendReminderEmail(
          email,
          event.title,
          event.startDate,
          reminder.reminderMinutes,
          isLate
        );
      } catch (error) {
        allDelivered = false;
        this.logger.error(
          `Failed to send reminder ${reminder.id} to ${email}: ${error.message}`
        );
      }
    }

    if (allDelivered) {
      await this.eventReminderRepository.markAsSent(reminder.id);
      this.logger.log(
        `✓ Sent reminder ${reminder.id} for event "${event.title}" (ID: ${event.id}) to ${memberEmails.length} member(s)${isLate ? ` (${lateSeconds}s late)` : ''}`
      );
    }
  }

  /**
   * Email addresses of every member of the event's calendar. Reminders fan
   * out to the calendar, not the creator. The username doubles as the email
   * address; members without a usable address (e.g. bot accounts) are
   * skipped with a warning.
   */
  private async resolveMemberEmails(
    event: CalendarEvent
  ): Promise<string[]> {
    const memberUserIds = await this.calendarAccessAggregator.getMemberUserIds(
      event.calendarId
    );
    const emails: string[] = [];
    for (const userId of memberUserIds) {
      const username = await this.userAggregator.findUsernameById(userId);
      if (username === null) {
        this.logger.warn(`User ${userId} not found for event ${event.id}`);
        continue;
      }
      if (!this.isValidEmail(username)) {
        this.logger.warn(
          `User ${userId} has username "${username}" which is not a valid email address. Skipping reminder for event ${event.id}.`
        );
        continue;
      }
      emails.push(username);
    }
    return emails;
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
