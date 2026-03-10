import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurrenceExceptionEntity } from '../entities/recurrence-exception.entity';
import { RecurrenceException } from '../../domain/entities/recurrence-exception.entity';

/**
 * Repository for recurrence exceptions.
 * Handles all database operations and mapping between domain and infrastructure entities.
 */
@Injectable()
export class RecurrenceExceptionRepository {
  constructor(
    @InjectRepository(RecurrenceExceptionEntity)
    private readonly repository: Repository<RecurrenceExceptionEntity>
  ) {}

  /**
   * Create a new recurrence exception.
   */
  async create(
    exception: Partial<RecurrenceException>
  ): Promise<RecurrenceException> {
    const entity = this.domainToInfrastructure(exception);
    const saved = await this.repository.save(entity);
    return this.infrastructureToDomain(saved);
  }

  /**
   * Find recurrence exceptions by recurring event ID.
   */
  async findByRecurringEventId(
    recurringEventId: number
  ): Promise<RecurrenceException[]> {
    const entities = await this.repository.find({
      where: { recurringEventId },
      order: { exceptionDate: 'ASC' },
    });
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Delete a recurrence exception by recurring event ID and exception date.
   */
  async delete(recurringEventId: number, exceptionDate: Date): Promise<void> {
    const result = await this.repository.delete({
      recurringEventId,
      exceptionDate,
    });
    if (result.affected === 0) {
      throw new Error('Recurrence exception not found');
    }
  }

  /**
   * Map domain entity to infrastructure entity.
   */
  private domainToInfrastructure(
    domain: Partial<RecurrenceException>
  ): Partial<RecurrenceExceptionEntity> {
    return {
      id: domain.id,
      recurringEventId: domain.recurringEventId,
      exceptionDate: domain.exceptionDate,
      createdAt: domain.createdAt,
    };
  }

  /**
   * Map infrastructure entity to domain entity.
   */
  private infrastructureToDomain(
    infra: RecurrenceExceptionEntity
  ): RecurrenceException {
    // Ensure exceptionDate is a Date object (TypeORM may return string from SQLite)
    const exceptionDate =
      infra.exceptionDate instanceof Date
        ? infra.exceptionDate
        : new Date(infra.exceptionDate);

    return {
      id: infra.id,
      recurringEventId: infra.recurringEventId,
      exceptionDate,
      createdAt:
        infra.createdAt instanceof Date
          ? infra.createdAt
          : new Date(infra.createdAt),
    };
  }
}
