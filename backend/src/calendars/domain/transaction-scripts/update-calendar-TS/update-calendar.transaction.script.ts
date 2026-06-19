import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CalendarRepository } from '../../../infra/repositories/calendar.repository';
import { Calendar } from '../../entities/calendar.entity';
import { UpdateCalendarCommand } from './update-calendar.command';

const MAX_NAME_LENGTH = 60;

/**
 * Transaction script for updating a calendar's name and/or color.
 * Only the calendar owner may update it.
 */
@Injectable()
export class UpdateCalendarTransactionScript {
  constructor(private readonly calendarRepository: CalendarRepository) {}

  /**
   * Update the calendar's mutable fields after authorizing the user.
   */
  async apply(command: UpdateCalendarCommand): Promise<Calendar> {
    const calendar = await this.calendarRepository.findById(command.calendarId);
    if (!calendar) {
      throw new NotFoundException('Calendar not found');
    }
    if (calendar.ownerId !== command.userId) {
      throw new ForbiddenException('Only the calendar owner can update it');
    }
    const updates: Partial<Calendar> = {};
    if (command.name !== undefined) {
      const name = command.name.trim();
      if (!name) {
        throw new Error('Calendar name is required');
      }
      if (name.length > MAX_NAME_LENGTH) {
        throw new Error(
          `Calendar name cannot exceed ${MAX_NAME_LENGTH} characters`
        );
      }
      updates.name = name;
    }
    if (command.color !== undefined) {
      updates.color = command.color;
    }
    return await this.calendarRepository.update(command.calendarId, updates);
  }
}
