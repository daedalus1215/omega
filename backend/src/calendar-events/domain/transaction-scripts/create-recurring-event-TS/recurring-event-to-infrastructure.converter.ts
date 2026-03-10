import { Injectable } from '@nestjs/common';
import { RecurringEvent } from '../../entities/recurring-event.entity';
import { RecurringEventEntity } from '../../../infra/entities/recurring-event.entity';

/**
 * Converter for transforming RecurringEvent domain entity to RecurringEventEntity infrastructure entity.
 */
@Injectable()
export class RecurringEventToInfrastructureConverter {
  /**
   * Convert domain entity to infrastructure entity.
   */
  apply(
    domain: Partial<RecurringEvent>,
    rruleString: string
  ): Partial<RecurringEventEntity> {
    const pattern = domain.recurrencePattern;
    return {
      id: domain.id,
      userId: domain.userId,
      title: domain.title,
      description: domain.description,
      color: domain.color,
      startDate: domain.startDate,
      endDate: domain.endDate,
      recurrenceType: pattern?.type,
      recurrenceInterval: pattern?.interval ?? 1,
      daysOfWeek: pattern?.daysOfWeek?.join(','),
      dayOfMonth: pattern?.dayOfMonth,
      monthOfYear: pattern?.monthOfYear,
      recurrenceEndDate: domain.recurrenceEndDate,
      noEndDate: domain.noEndDate ?? false,
      rruleString,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}
