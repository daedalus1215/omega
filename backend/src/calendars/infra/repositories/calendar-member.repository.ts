import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CalendarMemberEntity } from '../entities/calendar-member.entity';
import { CalendarMember } from '../../domain/entities/calendar-member.entity';

/**
 * Repository for calendar members.
 * Handles all database operations and mapping between domain and infrastructure entities.
 */
@Injectable()
export class CalendarMemberRepository {
  constructor(
    @InjectRepository(CalendarMemberEntity)
    private readonly repository: Repository<CalendarMemberEntity>
  ) {}

  /**
   * Create a new calendar membership.
   * @param member - Membership data to create
   * @param manager - Optional EntityManager for transaction support
   */
  async create(
    member: Partial<CalendarMember>,
    manager?: EntityManager
  ): Promise<CalendarMember> {
    const repo = this.getRepository(manager);
    const saved = await repo.save(this.domainToInfrastructure(member));
    return this.infrastructureToDomain(saved);
  }

  /**
   * Get the ids of all calendars a user is a member of.
   */
  async findCalendarIdsByUserId(userId: number): Promise<number[]> {
    const entities = await this.repository.find({
      where: { userId },
      select: ['calendarId'],
    });
    return entities.map(entity => entity.calendarId);
  }

  /**
   * Find all memberships for a user (calendar id + role).
   */
  async findByUserId(userId: number): Promise<CalendarMember[]> {
    const entities = await this.repository.find({
      where: { userId },
      order: { calendarId: 'ASC' },
    });
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Find all members of a calendar.
   */
  async findByCalendarId(calendarId: number): Promise<CalendarMember[]> {
    const entities = await this.repository.find({
      where: { calendarId },
      order: { createdAt: 'ASC' },
    });
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Find a specific membership, if it exists.
   */
  async findOne(
    calendarId: number,
    userId: number
  ): Promise<CalendarMember | null> {
    const entity = await this.repository.findOne({
      where: { calendarId, userId },
    });
    return entity ? this.infrastructureToDomain(entity) : null;
  }

  /**
   * Remove a user's membership from a calendar.
   */
  async delete(calendarId: number, userId: number): Promise<void> {
    await this.repository.delete({ calendarId, userId });
  }

  private domainToInfrastructure(
    domain: Partial<CalendarMember>
  ): Partial<CalendarMemberEntity> {
    return {
      id: domain.id,
      calendarId: domain.calendarId,
      userId: domain.userId,
      role: domain.role,
      createdAt: domain.createdAt,
    };
  }

  private infrastructureToDomain(infra: CalendarMemberEntity): CalendarMember {
    return {
      id: infra.id,
      calendarId: infra.calendarId,
      userId: infra.userId,
      role: infra.role,
      createdAt: infra.createdAt,
    };
  }

  private getRepository(
    manager?: EntityManager
  ): Repository<CalendarMemberEntity> {
    return manager
      ? manager.getRepository(CalendarMemberEntity)
      : this.repository;
  }
}
