import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { EventReminderRepository } from '../../../infra/repositories/event-reminder.repository';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { SyncEventRemindersCommand } from './sync-event-reminders.command';
import { EventReminder } from '../../entities/event-reminder.entity';
import {
  MAX_REMINDERS_PER_EVENT,
  MAX_REMINDER_MINUTES,
} from '../../reminder.constants';

/**
 * Transaction script for replacing an event's full set of reminders.
 *
 * Reconciles the existing rows against the desired offsets rather than
 * deleting and recreating them. Rewriting every row would reset sentAt, so an
 * already delivered reminder would be sent a second time the next time the
 * user edited anything about the event.
 */
@Injectable()
export class SyncEventRemindersTransactionScript {
  constructor(
    private readonly eventReminderRepository: EventReminderRepository,
    private readonly calendarEventRepository: CalendarEventRepository
  ) {}

  /**
   * Replace the reminders on an event with the given set of offsets.
   * @param command - Command containing the desired offsets
   * @param calendarIds - Calendars the caller may access
   * @param manager - Optional EntityManager for transaction support
   * @returns The event's reminders after syncing, ascending by offset
   */
  async apply(
    command: SyncEventRemindersCommand,
    calendarIds: number[],
    manager?: EntityManager
  ): Promise<EventReminder[]> {
    const desired = this.validate(command.reminderMinutes);

    const event = await this.calendarEventRepository.findById(
      command.calendarEventId,
      calendarIds
    );
    if (!event) {
      throw new NotFoundException('Calendar event not found');
    }

    const existing = await this.eventReminderRepository.findByEventId(
      command.calendarEventId
    );
    const existingByMinutes = new Map(
      existing.map(r => [r.reminderMinutes, r])
    );

    // Rows whose offset is unchanged are left untouched so they keep sentAt.
    const toDelete = existing.filter(r => !desired.has(r.reminderMinutes));
    const toCreate = [...desired].filter(
      minutes => !existingByMinutes.has(minutes)
    );

    for (const reminder of toDelete) {
      await this.eventReminderRepository.delete(reminder.id, manager);
    }

    for (const reminderMinutes of toCreate) {
      await this.eventReminderRepository.create(
        {
          calendarEventId: command.calendarEventId,
          reminderMinutes,
        },
        manager
      );
    }

    // Stops the recurring series generator from re-adding its own reminder to
    // this instance, which would otherwise undo the user's choice.
    await this.calendarEventRepository.markRemindersCustomized(
      command.calendarEventId,
      manager
    );

    return this.eventReminderRepository.findByEventId(command.calendarEventId);
  }

  /**
   * Validate and normalise the requested offsets.
   * Duplicates are collapsed rather than rejected: the set is what the caller
   * is asking for, and asking for the same offset twice is not ambiguous.
   */
  private validate(reminderMinutes: number[]): Set<number> {
    for (const minutes of reminderMinutes) {
      if (!Number.isInteger(minutes)) {
        throw new BadRequestException('Reminder minutes must be whole numbers');
      }
      if (minutes < 0) {
        throw new BadRequestException('Reminder minutes must be non-negative');
      }
      if (minutes > MAX_REMINDER_MINUTES) {
        throw new BadRequestException(
          `Reminder minutes cannot exceed ${MAX_REMINDER_MINUTES}`
        );
      }
    }

    const unique = new Set(reminderMinutes);
    if (unique.size > MAX_REMINDERS_PER_EVENT) {
      throw new BadRequestException(
        `An event cannot have more than ${MAX_REMINDERS_PER_EVENT} reminders`
      );
    }
    return unique;
  }
}
