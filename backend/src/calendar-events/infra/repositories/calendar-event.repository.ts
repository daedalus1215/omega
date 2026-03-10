import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError, EntityManager } from 'typeorm';
import { startOfDay } from 'date-fns';
import { CalendarEventEntity } from '../entities/calendar-event.entity';
import { CalendarEvent } from '../../domain/entities/calendar-event.entity';
import { Logger } from 'nestjs-pino';

/**
 * Repository for calendar events.
 * Handles all database operations and mapping between domain and infrastructure entities.
 */
@Injectable()
export class CalendarEventRepository {
  constructor(
    private readonly logger: Logger,
    @InjectRepository(CalendarEventEntity)
    private readonly repository: Repository<CalendarEventEntity>
  ) {}

  /**
   * Create a new calendar event.
   * @param event - Event data to create
   * @param manager - Optional EntityManager for transaction support
   */
  async create(
    event: Partial<CalendarEvent>,
    manager?: EntityManager
  ): Promise<CalendarEvent> {
    const entity = this.domainToInfrastructure(event);
    this.logger.debug('Creating calendar event:', entity);
    const repo = this.getRepository(manager);
    const saved = await repo.save(entity);
    const domain = this.infrastructureToDomain(saved);
    this.logger.debug('Created calendar event:', domain);
    return domain;
  }

  /**
   * Create a recurring event instance, handling duplicate constraint errors gracefully.
   * If a duplicate instance already exists (same recurring_event_id + instance_date),
   * returns the existing instance instead of throwing an error.
   * This prevents race conditions when multiple requests try to create the same instance.
   */
  async createInstance(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    // Only use this method for recurring event instances
    if (!event.recurringEventId || !event.instanceDate) {
      return this.create(event);
    }

    try {
      const entity = this.domainToInfrastructure(event);
      const saved = await this.repository.save(entity);
      return this.infrastructureToDomain(saved);
    } catch (error) {
      // Check if it's a unique constraint violation on recurring_event_id + instance_date
      if (
        error instanceof QueryFailedError &&
        error.message.includes('UNIQUE constraint failed') &&
        error.message.includes('recurring_event_id') &&
        error.message.includes('instance_date')
      ) {
        // Normalize instanceDate to start of day for consistent comparison
        // SQLite date columns store dates as YYYY-MM-DD strings
        const normalizedDate = startOfDay(event.instanceDate);
        const dateString = normalizedDate.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Fetch and return the existing instance using date string comparison
        // SQLite date columns can be compared directly with date strings
        const existing = await this.repository
          .createQueryBuilder('calendar_event')
          .where('calendar_event.recurring_event_id = :recurringEventId', {
            recurringEventId: event.recurringEventId,
          })
          .andWhere('calendar_event.instance_date = :instanceDate', {
            instanceDate: dateString,
          })
          .getOne();

        if (existing) {
          return this.infrastructureToDomain(existing);
        }
      }
      // Re-throw if it's a different error
      throw error;
    }
  }

  /**
   * Find calendar events by date range for a specific user.
   * Returns events that overlap with the date range (events that start before endDate and end after startDate).
   * Includes both one-time events and recurring event instances.
   */
  async findByDateRange(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const entities = await this.repository
      .createQueryBuilder('calendar_event')
      .where('calendar_event.user_id = :userId', { userId })
      .andWhere('calendar_event.start_date <= :endDate', { endDate })
      .andWhere('calendar_event.end_date >= :startDate', { startDate })
      .orderBy('calendar_event.start_date', 'ASC')
      .getMany();
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Find calendar events by recurring event ID.
   * Returns all instances for a specific recurring event.
   */
  async findByRecurringEventId(
    recurringEventId: number
  ): Promise<CalendarEvent[]> {
    const entities = await this.repository.find({
      where: { recurringEventId },
      order: { instanceDate: 'ASC' },
    });
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Find calendar events by recurring event ID and date range.
   * Returns instances that overlap with the date range for a specific recurring event.
   */
  async findByRecurringEventIdAndDateRange(
    recurringEventId: number,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const entities = await this.repository
      .createQueryBuilder('calendar_event')
      .where('calendar_event.recurring_event_id = :recurringEventId', {
        recurringEventId,
      })
      .andWhere('calendar_event.start_date <= :endDate', { endDate })
      .andWhere('calendar_event.end_date >= :startDate', { startDate })
      .orderBy('calendar_event.start_date', 'ASC')
      .getMany();
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Find a calendar event by ID only (for internal use like cron jobs).
   */
  async findByIdOnly(id: number): Promise<CalendarEvent | null> {
    const entity = await this.repository.findOne({
      where: { id },
    });
    if (!entity) {
      return null;
    }
    return this.infrastructureToDomain(entity);
  }

  /**
   * Find a calendar event by ID and user ID.
   */
  async findById(id: number, userId: number): Promise<CalendarEvent | null> {
    const entity = await this.repository.findOne({
      where: { id, userId },
    });
    if (!entity) {
      return null;
    }
    return this.infrastructureToDomain(entity);
  }

  /**
   * Update a calendar event.
   */
  async update(
    id: number,
    userId: number,
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const entity = await this.repository.findOne({
      where: { id, userId },
    });
    if (!entity) {
      throw new Error('Calendar event not found');
    }
    const updatedEntity = this.repository.merge(
      entity,
      this.domainToInfrastructure(updates)
    );
    const saved = await this.repository.save(updatedEntity);
    return this.infrastructureToDomain(saved);
  }

  /**
   * Delete a calendar event by ID and user ID.
   */
  async delete(id: number, userId: number): Promise<void> {
    const result = await this.repository.delete({ id, userId });
    if (result.affected === 0) {
      throw new Error('Calendar event not found');
    }
  }

  /**
   * Map domain entity to infrastructure entity.
   */
  private domainToInfrastructure(
    domain: Partial<CalendarEvent>
  ): Partial<CalendarEventEntity> {
    return {
      id: domain.id,
      userId: domain.userId,
      recurringEventId: domain.recurringEventId,
      instanceDate: domain.instanceDate,
      title: domain.title,
      description: domain.description,
      color: domain.color,
      startDate: domain.startDate,
      endDate: domain.endDate,
      isModified: domain.isModified,
      titleOverride: domain.titleOverride,
      descriptionOverride: domain.descriptionOverride,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  /**
   * Map infrastructure entity to domain entity.
   */
  private infrastructureToDomain(infra: CalendarEventEntity): CalendarEvent {
    return {
      id: infra.id,
      userId: infra.userId,
      recurringEventId: infra.recurringEventId,
      instanceDate: infra.instanceDate,
      title: infra.title,
      description: infra.description,
      color: infra.color,
      startDate: infra.startDate,
      endDate: infra.endDate,
      isModified: infra.isModified,
      titleOverride: infra.titleOverride,
      descriptionOverride: infra.descriptionOverride,
      createdAt: infra.createdAt,
      updatedAt: infra.updatedAt,
    };
  }

  /**
   * Get the appropriate repository instance.
   * Returns the transaction manager's repository if provided, otherwise the default repository.
   * @param manager - Optional EntityManager for transaction support
   * @returns Repository instance for CalendarEventEntity
   */
  private getRepository(
    manager?: EntityManager
  ): Repository<CalendarEventEntity> {
    return manager
      ? manager.getRepository(CalendarEventEntity)
      : this.repository;
  }
}
