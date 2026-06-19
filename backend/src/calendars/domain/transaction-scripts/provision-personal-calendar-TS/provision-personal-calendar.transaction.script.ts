import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CalendarRepository } from '../../../infra/repositories/calendar.repository';
import { CalendarMemberRepository } from '../../../infra/repositories/calendar-member.repository';
import { ProvisionPersonalCalendarCommand } from './provision-personal-calendar.command';

/**
 * Transaction script for provisioning a user's personal calendar.
 * Idempotent: returns the existing personal calendar id when one already
 * exists, otherwise creates the calendar and an owner membership atomically.
 */
@Injectable()
export class ProvisionPersonalCalendarTransactionScript {
  constructor(
    private readonly dataSource: DataSource,
    private readonly calendarRepository: CalendarRepository,
    private readonly calendarMemberRepository: CalendarMemberRepository
  ) {}

  /**
   * Ensure the user has a personal calendar and return its id.
   */
  async apply(command: ProvisionPersonalCalendarCommand): Promise<number> {
    const existing = await this.calendarRepository.findPersonalByUserId(
      command.userId
    );
    if (existing) {
      return existing.id;
    }
    return await this.dataSource.transaction(async manager => {
      const calendar = await this.calendarRepository.create(
        {
          name: 'Personal',
          ownerId: command.userId,
          isPersonal: true,
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
      return calendar.id;
    });
  }
}
