import { Injectable } from '@nestjs/common';
import { RecurringEventRepository } from '../../../infra/repositories/recurring-event.repository';
import { RecurringEventToDomainConverter } from '../create-recurring-event-TS/recurring-event-to-domain.converter';
import { RecurringEvent } from '../../entities/recurring-event.entity';

/**
 * Transaction script for fetching and converting recurring events for a user.
 * Encapsulates repository access and entity conversion.
 */
@Injectable()
export class FetchRecurringEventsTransactionScript {
  constructor(
    private readonly recurringEventRepository: RecurringEventRepository,
    private readonly recurringEventToDomainConverter: RecurringEventToDomainConverter
  ) {}

  /**
   * Fetch all recurring events for a user and convert them to domain entities.
   */
  async apply(userId: number): Promise<RecurringEvent[]> {
    const recurringEventEntities =
      await this.recurringEventRepository.findByUserId(userId);

    return recurringEventEntities.map(entity =>
      this.recurringEventToDomainConverter.apply(entity)
    );
  }
}
