import { Injectable } from '@nestjs/common';
import { RecurringEventRepository } from '../../../infra/repositories/recurring-event.repository';
import { CreateRecurringEventCommand } from './create-recurring-event.command';
import { RecurringEvent } from '../../entities/recurring-event.entity';
import { patternToRruleString } from '../../utils/rrule-pattern.utils';
import { RecurringEventToInfrastructureConverter } from './recurring-event-to-infrastructure.converter';
import { RecurringEventToDomainConverter } from './recurring-event-to-domain.converter';

/**
 * Transaction script for creating recurring events.
 * Encapsulates all business logic for creating recurring events.
 * Instances are generated lazily when events are queried.
 */
@Injectable()
export class CreateRecurringEventTransactionScript {
  constructor(
    private readonly recurringEventRepository: RecurringEventRepository,
    private readonly toInfrastructureConverter: RecurringEventToInfrastructureConverter,
    private readonly toDomainConverter: RecurringEventToDomainConverter
  ) {}

  /**
   * Create a new recurring event.
   * Validates business rules and creates the recurring event.
   * Event instances will be generated lazily when queried.
   */
  async apply(command: CreateRecurringEventCommand): Promise<RecurringEvent> {
    // Generate rrule string
    const rruleString = patternToRruleString(
      command.recurrencePattern,
      command.startDate,
      command.recurrenceEndDate,
      command.noEndDate
    );

    // Convert domain entity to infrastructure entity
    const domainEvent: Partial<RecurringEvent> = {
      userId: command.user.userId,
      title: command.title.trim(),
      description: command.description?.trim(),
      color: command.color,
      startDate: command.startDate,
      endDate: command.endDate,
      recurrencePattern: command.recurrencePattern,
      recurrenceEndDate: command.recurrenceEndDate,
      noEndDate: command.noEndDate,
    };
    const infrastructureEntity = this.toInfrastructureConverter.apply(
      domainEvent,
      rruleString
    );

    // Save infrastructure entity
    const savedEntity =
      await this.recurringEventRepository.create(infrastructureEntity);

    // Convert back to domain entity
    const recurringEvent = this.toDomainConverter.apply(savedEntity);

    return recurringEvent;
  }
}
