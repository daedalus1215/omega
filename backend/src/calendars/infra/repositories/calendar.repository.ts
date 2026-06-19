import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { CalendarEntity } from '../entities/calendar.entity';
import { Calendar } from '../../domain/entities/calendar.entity';

/**
 * Repository for calendars.
 * Handles all database operations and mapping between domain and infrastructure entities.
 */
@Injectable()
export class CalendarRepository {
  constructor(
    @InjectRepository(CalendarEntity)
    private readonly repository: Repository<CalendarEntity>
  ) {}

  /**
   * Create a new calendar.
   * @param calendar - Calendar data to create
   * @param manager - Optional EntityManager for transaction support
   */
  async create(
    calendar: Partial<Calendar>,
    manager?: EntityManager
  ): Promise<Calendar> {
    const repo = this.getRepository(manager);
    const saved = await repo.save(this.domainToInfrastructure(calendar));
    return this.infrastructureToDomain(saved);
  }

  /**
   * Find a calendar by ID.
   */
  async findById(id: number): Promise<Calendar | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.infrastructureToDomain(entity) : null;
  }

  /**
   * Find all calendars owned by a user.
   */
  async findByOwnerId(ownerId: number): Promise<Calendar[]> {
    const entities = await this.repository.find({
      where: { ownerId },
      order: { createdAt: 'ASC' },
    });
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Find calendars by a set of ids, ordered oldest-first.
   */
  async findByIds(ids: number[]): Promise<Calendar[]> {
    if (ids.length === 0) {
      return [];
    }
    const entities = await this.repository.find({
      where: { id: In(ids) },
      order: { createdAt: 'ASC' },
    });
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Update a calendar's mutable fields (name, color).
   */
  async update(id: number, updates: Partial<Calendar>): Promise<Calendar> {
    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) {
      throw new Error('Calendar not found');
    }
    const merged = this.repository.merge(
      entity,
      this.domainToInfrastructure(updates)
    );
    const saved = await this.repository.save(merged);
    return this.infrastructureToDomain(saved);
  }

  /**
   * Delete a calendar by id. Membership rows are removed via FK cascade.
   */
  async delete(id: number): Promise<void> {
    const result = await this.repository.delete({ id });
    if (result.affected === 0) {
      throw new Error('Calendar not found');
    }
  }

  /**
   * Find a user's personal calendar, if it exists.
   */
  async findPersonalByUserId(userId: number): Promise<Calendar | null> {
    const entity = await this.repository.findOne({
      where: { ownerId: userId, isPersonal: true },
      order: { id: 'ASC' },
    });
    return entity ? this.infrastructureToDomain(entity) : null;
  }

  private domainToInfrastructure(
    domain: Partial<Calendar>
  ): Partial<CalendarEntity> {
    return {
      id: domain.id,
      name: domain.name,
      color: domain.color,
      ownerId: domain.ownerId,
      isPersonal: domain.isPersonal,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  private infrastructureToDomain(infra: CalendarEntity): Calendar {
    return {
      id: infra.id,
      name: infra.name,
      color: infra.color,
      ownerId: infra.ownerId,
      isPersonal: infra.isPersonal,
      createdAt: infra.createdAt,
      updatedAt: infra.updatedAt,
    };
  }

  private getRepository(manager?: EntityManager): Repository<CalendarEntity> {
    return manager ? manager.getRepository(CalendarEntity) : this.repository;
  }
}
