import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CalendarRepository } from '../../../infra/repositories/calendar.repository';
import { CalendarMemberRepository } from '../../../infra/repositories/calendar-member.repository';
import { Calendar } from '../../entities/calendar.entity';
import { CreateCalendarCommand } from './create-calendar.command';

const MAX_NAME_LENGTH = 60;

/**
 * Transaction script for creating a (non-personal) calendar.
 * Creates the calendar and an owner membership atomically.
 */
@Injectable()
export class CreateCalendarTransactionScript {
  constructor(
    private readonly dataSource: DataSource,
    private readonly calendarRepository: CalendarRepository,
    private readonly calendarMemberRepository: CalendarMemberRepository
  ) {}

  /**
   * Create a calendar owned by the user, who becomes its first member.
   */
  async apply(command: CreateCalendarCommand): Promise<Calendar> {
    const name = command.name?.trim();
    if (!name) {
      throw new Error('Calendar name is required');
    }
    if (name.length > MAX_NAME_LENGTH) {
      throw new Error(`Calendar name cannot exceed ${MAX_NAME_LENGTH} characters`);
    }
    return await this.dataSource.transaction(async manager => {
      const calendar = await this.calendarRepository.create(
        {
          name,
          color: command.color,
          ownerId: command.userId,
          isPersonal: false,
        },
        manager
      );
      await this.calendarMemberRepository.create(
        {
          calendarId: calendar.id,
          userId: command.userId,
          role: 'owner',
        },
        manager
      );
      return calendar;
    });
  }
}
