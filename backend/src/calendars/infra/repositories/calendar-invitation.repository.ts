import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CalendarInvitationEntity } from '../entities/calendar-invitation.entity';
import { CalendarInvitation } from '../../domain/entities/calendar-invitation.entity';
import { InvitationStatus } from '../../domain/entities/invitation-status.type';

/**
 * Repository for calendar invitations.
 * Handles all database operations and mapping between domain and infrastructure entities.
 */
@Injectable()
export class CalendarInvitationRepository {
  constructor(
    @InjectRepository(CalendarInvitationEntity)
    private readonly repository: Repository<CalendarInvitationEntity>
  ) {}

  async create(
    invitation: Partial<CalendarInvitation>,
    manager?: EntityManager
  ): Promise<CalendarInvitation> {
    const repo = this.getRepository(manager);
    const saved = await repo.save(this.domainToInfrastructure(invitation));
    return this.infrastructureToDomain(saved);
  }

  async findById(id: number): Promise<CalendarInvitation | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.infrastructureToDomain(entity) : null;
  }

  /**
   * Find the outstanding (pending) invitation for a user on a calendar, if any.
   */
  async findPending(
    calendarId: number,
    inviteeId: number
  ): Promise<CalendarInvitation | null> {
    const entity = await this.repository.findOne({
      where: { calendarId, inviteeId, status: 'pending' },
    });
    return entity ? this.infrastructureToDomain(entity) : null;
  }

  /**
   * List all pending invitations addressed to a user.
   */
  async findPendingByInviteeId(
    inviteeId: number
  ): Promise<CalendarInvitation[]> {
    const entities = await this.repository.find({
      where: { inviteeId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
    return entities.map(entity => this.infrastructureToDomain(entity));
  }

  /**
   * Update an invitation's status and stamp respondedAt.
   */
  async updateStatus(
    id: number,
    status: InvitationStatus,
    respondedAt: Date,
    manager?: EntityManager
  ): Promise<void> {
    const repo = this.getRepository(manager);
    await repo.update({ id }, { status, respondedAt });
  }

  private domainToInfrastructure(
    domain: Partial<CalendarInvitation>
  ): Partial<CalendarInvitationEntity> {
    return {
      id: domain.id,
      calendarId: domain.calendarId,
      inviterId: domain.inviterId,
      inviteeId: domain.inviteeId,
      status: domain.status,
      createdAt: domain.createdAt,
      respondedAt: domain.respondedAt,
    };
  }

  private infrastructureToDomain(
    infra: CalendarInvitationEntity
  ): CalendarInvitation {
    return {
      id: infra.id,
      calendarId: infra.calendarId,
      inviterId: infra.inviterId,
      inviteeId: infra.inviteeId,
      status: infra.status,
      createdAt: infra.createdAt,
      respondedAt: infra.respondedAt,
    };
  }

  private getRepository(
    manager?: EntityManager
  ): Repository<CalendarInvitationEntity> {
    return manager
      ? manager.getRepository(CalendarInvitationEntity)
      : this.repository;
  }
}
