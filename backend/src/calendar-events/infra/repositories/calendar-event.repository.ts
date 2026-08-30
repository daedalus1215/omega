import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError, EntityManager, In } from 'typeorm';
import { toUTCDateString } from '../../domain/utils/date-utc.utils';
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
        const dateString = toUTCDateString(event.instanceDate);

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
   * Find calendar events by date range across the given calendars.
   * Returns events that overlap with the date range (events that start before endDate and end after startDate).
   * Includes both one-time events and recurring event instances.
   */
  async findByDateRange(
    calendarIds: number[],
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    if (calendarIds.length === 0) {
      return [];
    }
    const entities = await this.repository
      .createQueryBuilder('calendar_event')
      .where('calendar_event.calendar_id IN (:...calendarIds)', { calendarIds })
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
   * Count calendar events belonging to a calendar.
   */
  async countByCalendarId(calendarId: number): Promise<number> {
    return await this.repository.count({ where: { calendarId } });
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
   * Record that the user has set this event's reminders explicitly, so the
   * recurring series generator stops managing them.
   */
  async markRemindersCustomized(
    id: number,
    manager?: EntityManager
  ): Promise<void> {
    await this.getRepository(manager).update(id, {
      remindersCustomized: true,
    });
  }

  /**
   * Find calendar events by ID in a single query, without calendar scoping.
   * Lets callers processing many events avoid a lookup per event.
   */
  async findByIdsOnly(ids: number[]): Promise<CalendarEvent[]> {
    if (ids.length === 0) {
      return [];
    }
    const entities = await this.repository.find({
      where: { id: In(ids) },
    });
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Find a calendar event by ID, scoped to calendars the caller can access.
   * @param manager - Optional EntityManager for transaction support. Pass the
   * transaction's manager when the event was created within the same
   * transaction, since the default connection cannot see uncommitted rows.
   */
  async findById(
    id: number,
    calendarIds: number[],
    manager?: EntityManager
  ): Promise<CalendarEvent | null> {
    if (calendarIds.length === 0) {
      return null;
    }
    const entity = await this.getRepository(manager).findOne({
      where: { id, calendarId: In(calendarIds) },
    });
    if (!entity) {
      return null;
    }
    return this.infrastructureToDomain(entity);
  }

  /**
   * Update a calendar event, scoped to calendars the caller can access.
   */
  async update(
    id: number,
    calendarIds: number[],
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const entity =
      calendarIds.length === 0
        ? null
        : await this.repository.findOne({
            where: { id, calendarId: In(calendarIds) },
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
   * Delete a calendar event by ID, scoped to calendars the caller can access.
   */
  async delete(id: number, calendarIds: number[]): Promise<void> {
    if (calendarIds.length === 0) {
      throw new Error('Calendar event not found');
    }
    const result = await this.repository.delete({
      id,
      calendarId: In(calendarIds),
    });
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
      calendarId: domain.calendarId,
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
      remindersCustomized: domain.remindersCustomized,
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
      calendarId: infra.calendarId,
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
      remindersCustomized: infra.remindersCustomized,
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
