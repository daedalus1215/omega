import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
   * Count recurring events belonging to a calendar.
   */
  async countByCalendarId(calendarId: number): Promise<number> {
    return await this.repository.count({ where: { calendarId } });
  }

  /**
   * Find all recurring events across the given calendars.
   */
  async findByCalendarIds(
    calendarIds: number[]
  ): Promise<RecurringEventEntity[]> {
    if (calendarIds.length === 0) {
      return [];
    }
    return await this.repository.find({
      where: { calendarId: In(calendarIds) },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update only the reminderMinutes field on a recurring event.
   * Accepts null to clear the value (sets DB column to NULL).
   */
  async updateReminderMinutes(
    id: number,
    userId: number,
    reminderMinutes: number | null
  ): Promise<void> {
    await this.repository.update({ id, userId }, { reminderMinutes });
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
