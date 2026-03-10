import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecurringEventEntity } from '../entities/recurring-event.entity';

/**
 * Repository for recurring events.
 * Handles all database operations with infrastructure entities only.
 */
@Injectable()
export class RecurringEventRepository {
  constructor(
    @InjectRepository(RecurringEventEntity)
    private readonly repository: Repository<RecurringEventEntity>
  ) {}

  /**
   * Create a new recurring event.
   */
  async create(
    entity: Partial<RecurringEventEntity>
  ): Promise<RecurringEventEntity> {
    return await this.repository.save(entity);
  }

  /**
   * Find a recurring event by ID and user ID.
   */
  async findById(
    id: number,
    userId: number
  ): Promise<RecurringEventEntity | null> {
    return await this.repository.findOne({
      where: { id, userId },
    });
  }

  /**
   * Update a recurring event.
   */
  async update(
    id: number,
    userId: number,
    updates: Partial<RecurringEventEntity>
  ): Promise<RecurringEventEntity> {
    const entity = await this.repository.findOne({
      where: { id, userId },
    });
    if (!entity) {
      throw new Error('Recurring event not found');
    }
    const updatedEntity = this.repository.merge(entity, updates);
    return await this.repository.save(updatedEntity);
  }

  /**
   * Find all recurring events for a user.
   */
  async findByUserId(userId: number): Promise<RecurringEventEntity[]> {
    return await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Delete a recurring event by ID and user ID.
   */
  async delete(id: number, userId: number): Promise<void> {
    const result = await this.repository.delete({ id, userId });
    if (result.affected === 0) {
      throw new Error('Recurring event not found');
    }
  }
}
