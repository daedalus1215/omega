import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProvisionPersonalCalendarTransactionScript } from '../../domain/transaction-scripts/provision-personal-calendar-TS/provision-personal-calendar.transaction.script';
import {
  USER_REGISTERED_EVENT,
  UserRegisteredEvent,
} from '../../../shared-kernel/domain/events/user-registered.event';

/**
 * Listens for user registration and provisions the new user's personal
 * calendar. Decouples the users domain from the calendars domain (no module
 * dependency), and is idempotent so it is safe even if the calendar already
 * exists (e.g. created by a read-path fallback).
 */
@Injectable()
export class UserRegisteredListener {
  constructor(
    private readonly provisionPersonalCalendarTransactionScript: ProvisionPersonalCalendarTransactionScript
  ) {}

  @OnEvent(USER_REGISTERED_EVENT)
  async handleUserRegistered(event: UserRegisteredEvent): Promise<void> {
    await this.provisionPersonalCalendarTransactionScript.apply({
      userId: event.userId,
    });
  }
}
