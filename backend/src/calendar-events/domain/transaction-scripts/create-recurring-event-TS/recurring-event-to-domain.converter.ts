import { Injectable } from '@nestjs/common';
import { RecurringEvent } from '../../entities/recurring-event.entity';
import { RecurrencePattern } from '../../entities/recurrence-pattern.value-object';
import { RecurringEventEntity } from '../../../infra/entities/recurring-event.entity';

/**
 * Converter for transforming RecurringEventEntity infrastructure entity to RecurringEvent domain entity.
 */
@Injectable()
export class RecurringEventToDomainConverter {
  /**
   * Convert infrastructure entity to domain entity.
   */
  apply(infra: RecurringEventEntity): RecurringEvent {
    const pattern: RecurrencePattern = {
      type: infra.recurrenceType,
      interval: infra.recurrenceInterval,
      daysOfWeek: infra.daysOfWeek
        ? infra.daysOfWeek.split(',').map(Number)
        : undefined,
      dayOfMonth: infra.dayOfMonth,
      monthOfYear: infra.monthOfYear,
    };
    return {
      id: infra.id,
      userId: infra.userId,
      title: infra.title,
      description: infra.description,
      color: infra.color,
      startDate: infra.startDate,
      endDate: infra.endDate,
      recurrencePattern: pattern,
      recurrenceEndDate: infra.recurrenceEndDate,
      noEndDate: infra.noEndDate,
      createdAt: infra.createdAt,
      updatedAt: infra.updatedAt,
    };
  }
}
