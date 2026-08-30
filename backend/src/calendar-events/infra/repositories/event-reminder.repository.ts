import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, EntityManager } from 'typeorm';
import { EventReminderEntity } from '../entities/event-reminder.entity';
import { CalendarEventEntity } from '../entities/calendar-event.entity';
import { EventReminder } from '../../domain/entities/event-reminder.entity';
import { Logger } from 'nestjs-pino';

/**
 * Repository for event reminders.
 * Handles all database operations and mapping between domain and infrastructure entities.
 */
@Injectable()
export class EventReminderRepository {
  constructor(
    private readonly logger: Logger,
    @InjectRepository(EventReminderEntity)
    private readonly repository: Repository<EventReminderEntity>
  ) {}

  /**
   * Create a new event reminder.
   * @param reminder - Reminder data to create
   * @param manager - Optional EntityManager for transaction support
   */
  async create(
    reminder: Partial<EventReminder>,
    manager?: EntityManager
  ): Promise<EventReminder> {
    const entity = this.domainToInfrastructure(reminder);
    this.logger.debug('Creating event reminder:', entity);
    const repo = this.getRepository(manager);
    const saved = await repo.save(entity);
    const domain = this.infrastructureToDomain(saved);
    this.logger.debug('Created event reminder:', domain);
    return domain;
  }

  /**
   * Find reminders by calendar event ID.
   * @param manager - Optional EntityManager for transaction support. Pass the
   * transaction's manager so rows inserted earlier in the same transaction
   * are visible to the lookup.
   */
  async findByEventId(
    calendarEventId: number,
    manager?: EntityManager
  ): Promise<EventReminder[]> {
    const entities = await this.getRepository(manager).find({
      where: { calendarEventId },
      order: { reminderMinutes: 'ASC' },
    });
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Find reminders by multiple calendar event IDs.
   */
  async findByEventIds(calendarEventIds: number[]): Promise<EventReminder[]> {
    if (calendarEventIds.length === 0) {
      return [];
    }
    const entities = await this.repository.find({
      where: { calendarEventId: In(calendarEventIds) },
      order: { calendarEventId: 'ASC', reminderMinutes: 'ASC' },
    });
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Find a reminder by ID.
   */
  async findById(id: number): Promise<EventReminder | null> {
    const entity = await this.repository.findOne({
      where: { id },
    });
    if (!entity) {
      return null;
    }
    return this.infrastructureToDomain(entity);
  }

  /**
   * Update an event reminder.
   */
  async update(
    id: number,
    updates: Partial<EventReminder>
  ): Promise<EventReminder> {
    const entity = await this.repository.findOne({
      where: { id },
    });
    if (!entity) {
      throw new Error('Event reminder not found');
    }
    const updatedEntity = this.repository.merge(
      entity,
      this.domainToInfrastructure(updates)
    );
    const saved = await this.repository.save(updatedEntity);
    return this.infrastructureToDomain(saved);
  }

  /**
   * Delete an event reminder by ID.
   */
  async delete(id: number, manager?: EntityManager): Promise<void> {
    const result = await this.getRepository(manager).delete({ id });
    if (result.affected === 0) {
      throw new Error('Event reminder not found');
    }
  }

  /**
   * Delete all reminders for a calendar event.
   */
  async deleteByEventId(calendarEventId: number): Promise<void> {
    await this.repository.delete({ calendarEventId });
  }

  /**
   * Find unsent reminders whose event starts within the given window.
   *
   * Replaces an unbounded scan of every unsent reminder in the database. The
   * bounds come from the scheduler: events that already started longer ago than
   * the grace period can no longer be delivered, and events further out than
   * MAX_REMINDER_MINUTES cannot be due yet. Joining the event also lets the
   * caller avoid a per-reminder lookup.
   *
   * Reminders whose event no longer exists are excluded by the join. They can
   * never be delivered, so leaving them unselected retires them quietly.
   */
  async findDueCandidates(
    lowerBound: Date,
    upperBound: Date
  ): Promise<EventReminder[]> {
    const entities = await this.repository
      .createQueryBuilder('reminder')
      .innerJoin(
        CalendarEventEntity,
        'event',
        'event.id = reminder.calendarEventId'
      )
      .where('reminder.sentAt IS NULL')
      .andWhere('event.startDate >= :lowerBound', { lowerBound })
      .andWhere('event.startDate <= :upperBound', { upperBound })
      .orderBy('reminder.calendarEventId', 'ASC')
      .getMany();
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Clear sentAt for every reminder on an event, so they are eligible to send
   * again. Used when an event moves and its reminders must fire at new times.
   */
  async resetSentAtByEventId(
    calendarEventId: number,
    manager?: EntityManager
  ): Promise<void> {
    await this.getRepository(manager).update(
      { calendarEventId },
      { sentAt: null }
    );
  }

  /**
   * Map domain entity to infrastructure entity.
   */

  /**
   * Mark a reminder as sent.
   */
  async markAsSent(id: number): Promise<void> {
    await this.repository.update(id, { sentAt: new Date() });
  }

  private domainToInfrastructure(
    domain: Partial<EventReminder>
  ): Partial<EventReminderEntity> {
    return {
      id: domain.id,
      calendarEventId: domain.calendarEventId,
      reminderMinutes: domain.reminderMinutes,
      sentAt: domain.sentAt,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  /**
   * Map infrastructure entity to domain entity.
   */
  private infrastructureToDomain(infra: EventReminderEntity): EventReminder {
    return {
      id: infra.id,
      calendarEventId: infra.calendarEventId,
      reminderMinutes: infra.reminderMinutes,
      sentAt: infra.sentAt,
      createdAt: infra.createdAt,
      updatedAt: infra.updatedAt,
    };
  }

  /**
   * Get the appropriate repository instance.
   * Returns the transaction manager's repository if provided, otherwise the default repository.
   * @param manager - Optional EntityManager for transaction support
   * @returns Repository instance for EventReminderEntity
   */
  private getRepository(
    manager?: EntityManager
  ): Repository<EventReminderEntity> {
    return manager
      ? manager.getRepository(EventReminderEntity)
      : this.repository;
  }
}
