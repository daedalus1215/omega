import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEntity } from './infra/entities/calendar.entity';
import { CalendarMemberEntity } from './infra/entities/calendar-member.entity';
import { CalendarInvitationEntity } from './infra/entities/calendar-invitation.entity';
import { CalendarRepository } from './infra/repositories/calendar.repository';
import { CalendarMemberRepository } from './infra/repositories/calendar-member.repository';
import { CalendarInvitationRepository } from './infra/repositories/calendar-invitation.repository';
import { ProvisionPersonalCalendarTransactionScript } from './domain/transaction-scripts/provision-personal-calendar-TS/provision-personal-calendar.transaction.script';
import { CalendarAccessAggregator } from './domain/aggregators/calendar-access.aggregator';
import { CreateCalendarTransactionScript } from './domain/transaction-scripts/create-calendar-TS/create-calendar.transaction.script';
import { FetchCalendarsTransactionScript } from './domain/transaction-scripts/fetch-calendars-TS/fetch-calendars.transaction.script';
import { UpdateCalendarTransactionScript } from './domain/transaction-scripts/update-calendar-TS/update-calendar.transaction.script';
import { DeleteCalendarTransactionScript } from './domain/transaction-scripts/delete-calendar-TS/delete-calendar.transaction.script';
import { InviteMemberTransactionScript } from './domain/transaction-scripts/invite-member-TS/invite-member.transaction.script';
import { RespondToInvitationTransactionScript } from './domain/transaction-scripts/respond-to-invitation-TS/respond-to-invitation.transaction.script';
import { FetchInvitationsTransactionScript } from './domain/transaction-scripts/fetch-invitations-TS/fetch-invitations.transaction.script';
import { FetchMembersTransactionScript } from './domain/transaction-scripts/fetch-members-TS/fetch-members.transaction.script';
import { RemoveMemberTransactionScript } from './domain/transaction-scripts/remove-member-TS/remove-member.transaction.script';
import { CalendarService } from './domain/services/calendar.service';
import { CalendarSharingService } from './domain/services/calendar-sharing.service';
import { CreateCalendarAction } from './apps/actions/create-calendar-action/create-calendar.action';
import { FetchCalendarsAction } from './apps/actions/fetch-calendars-action/fetch-calendars.action';
import { UpdateCalendarAction } from './apps/actions/update-calendar-action/update-calendar.action';
import { DeleteCalendarAction } from './apps/actions/delete-calendar-action/delete-calendar.action';
import { InviteMemberAction } from './apps/actions/invite-member-action/invite-member.action';
import { FetchInvitationsAction } from './apps/actions/fetch-invitations-action/fetch-invitations.action';
import { RespondToInvitationAction } from './apps/actions/respond-to-invitation-action/respond-to-invitation.action';
import { FetchMembersAction } from './apps/actions/fetch-members-action/fetch-members.action';
import { RemoveMemberAction } from './apps/actions/remove-member-action/remove-member.action';
import { UserRegisteredListener } from './apps/listeners/user-registered.listener';
import { CalendarEventsModule } from '../calendar-events/calendar-events.module';
import { UsersModule } from '../users/users.module';

/**
 * Calendars module: owns calendars, membership, invitations (sharing), calendar
 * CRUD, and the cross-domain CalendarAccessAggregator. Imports
 * CalendarEventsModule (forwardRef) for the delete-empty guard and UsersModule
 * for username resolution during sharing.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CalendarEntity,
      CalendarMemberEntity,
      CalendarInvitationEntity,
    ]),
    forwardRef(() => CalendarEventsModule),
    UsersModule,
  ],
  providers: [
    CalendarRepository,
    CalendarMemberRepository,
    CalendarInvitationRepository,
    ProvisionPersonalCalendarTransactionScript,
    CalendarAccessAggregator,
    CreateCalendarTransactionScript,
    FetchCalendarsTransactionScript,
    UpdateCalendarTransactionScript,
    DeleteCalendarTransactionScript,
    InviteMemberTransactionScript,
    RespondToInvitationTransactionScript,
    FetchInvitationsTransactionScript,
    FetchMembersTransactionScript,
    RemoveMemberTransactionScript,
    CalendarService,
    CalendarSharingService,
    UserRegisteredListener,
  ],
  controllers: [
    CreateCalendarAction,
    FetchCalendarsAction,
    UpdateCalendarAction,
    DeleteCalendarAction,
    InviteMemberAction,
    FetchInvitationsAction,
    RespondToInvitationAction,
    FetchMembersAction,
    RemoveMemberAction,
  ],
  exports: [CalendarAccessAggregator],
})
export class CalendarsModule {}
