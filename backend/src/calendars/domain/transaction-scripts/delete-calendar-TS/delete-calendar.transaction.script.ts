import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CalendarRepository } from '../../../infra/repositories/calendar.repository';
import { CalendarEventsAggregator } from '../../../../calendar-events/domain/aggregators/calendar-events.aggregator';
import { DeleteCalendarCommand } from './delete-calendar.command';

/**
 * Transaction script for deleting a calendar.
 * Guards: only the owner may delete; the personal calendar cannot be deleted;
 * and a calendar that still holds events is blocked (the user must move or
 * delete its events first). Membership rows are removed via FK cascade.
 */
@Injectable()
export class DeleteCalendarTransactionScript {
  constructor(
    private readonly calendarRepository: CalendarRepository,
    @Inject(forwardRef(() => CalendarEventsAggregator))
    private readonly calendarEventsAggregator: CalendarEventsAggregator
  ) {}

  /**
   * Delete the calendar after authorizing the user and ensuring it is empty.
   */
  async apply(command: DeleteCalendarCommand): Promise<void> {
    const calendar = await this.calendarRepository.findById(command.calendarId);
    if (!calendar) {
      throw new NotFoundException('Calendar not found');
    }
    if (calendar.ownerId !== command.userId) {
      throw new ForbiddenException('Only the calendar owner can delete it');
    }
    if (calendar.isPersonal) {
      throw new ForbiddenException('The personal calendar cannot be deleted');
    }
    const hasEvents = await this.calendarEventsAggregator.hasEventsInCalendar(
      command.calendarId
    );
    if (hasEvents) {
      throw new ConflictException(
        'Calendar is not empty; move or delete its events first'
      );
    }
    await this.calendarRepository.delete(command.calendarId);
  }
}
