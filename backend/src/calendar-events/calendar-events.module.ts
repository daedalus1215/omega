import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEventEntity } from './infra/entities/calendar-event.entity';
import { RecurringEventEntity } from './infra/entities/recurring-event.entity';
import { RecurrenceExceptionEntity } from './infra/entities/recurrence-exception.entity';
import { EventReminderEntity } from './infra/entities/event-reminder.entity';
import { CalendarEventRepository } from './infra/repositories/calendar-event.repository';
import { RecurringEventRepository } from './infra/repositories/recurring-event.repository';
import { RecurrenceExceptionRepository } from './infra/repositories/recurrence-exception.repository';
import { EventReminderRepository } from './infra/repositories/event-reminder.repository';
import { FetchCalendarEventsTransactionScript } from './domain/transaction-scripts/fetch-calendar-events-TS/fetch-calendar-events.transaction.script';
import { CreateCalendarEventTransactionScript } from './domain/transaction-scripts/create-calendar-event-TS/create-calendar-event.transaction.script';
import { FetchCalendarEventTransactionScript } from './domain/transaction-scripts/fetch-calendar-event-TS/fetch-calendar-event.transaction.script';
import { UpdateCalendarEventTransactionScript } from './domain/transaction-scripts/update-calendar-event-TS/update-calendar-event.transaction.script';
import { DeleteCalendarEventTransactionScript } from './domain/transaction-scripts/delete-calendar-event-TS/delete-calendar-event.transaction.script';
import { CalendarEventService } from './domain/services/calendar-event.service';
import { FetchCalendarEventsAction } from './apps/actions/fetch-calendar-events-action/fetch-calendar-events.action';
import { CreateCalendarEventAction } from './apps/actions/create-calendar-event-action/create-calendar-event.action';
import { FetchCalendarEventAction } from './apps/actions/fetch-calendar-event-action/fetch-calendar-event.action';
import { UpdateCalendarEventAction } from './apps/actions/update-calendar-event-action/update-calendar-event.action';
import { DeleteCalendarEventAction } from './apps/actions/delete-calendar-event-action/delete-calendar-event.action';
import { CreateRecurringEventAction } from './apps/actions/create-recurring-event-action/create-recurring-event.action';
import { DeleteRecurringEventAction } from './apps/actions/delete-recurring-event-action/delete-recurring-event.action';
import { CreateRecurringEventTransactionScript } from './domain/transaction-scripts/create-recurring-event-TS/create-recurring-event.transaction.script';
import { DeleteRecurringEventTransactionScript } from './domain/transaction-scripts/delete-recurring-event-TS/delete-recurring-event.transaction.script';
import { GenerateEventInstancesTransactionScript } from './domain/transaction-scripts/generate-event-instances-TS/generate-event-instances.transaction.script';
import { FetchRecurringEventsTransactionScript } from './domain/transaction-scripts/fetch-recurring-events-TS/fetch-recurring-events.transaction.script';
import { RecurringEventService } from './domain/services/recurring-event.service';
import { RecurringEventToInfrastructureConverter } from './domain/transaction-scripts/create-recurring-event-TS/recurring-event-to-infrastructure.converter';
import { RecurringEventToDomainConverter } from './domain/transaction-scripts/create-recurring-event-TS/recurring-event-to-domain.converter';
import { CreateEventReminderTransactionScript } from './domain/transaction-scripts/create-event-reminder-TS/create-event-reminder.transaction.script';
import { UpdateEventReminderTransactionScript } from './domain/transaction-scripts/update-event-reminder-TS/update-event-reminder.transaction.script';
import { UpdateEventReminderValidator } from './domain/transaction-scripts/update-event-reminder-TS/update-event-reminder.validator';
import { DeleteEventReminderTransactionScript } from './domain/transaction-scripts/delete-event-reminder-TS/delete-event-reminder.transaction.script';
import { FetchEventRemindersTransactionScript } from './domain/transaction-scripts/fetch-event-reminders-TS/fetch-event-reminders.transaction.script';
import { CreateEventReminderAction } from './apps/actions/create-event-reminder-action/create-event-reminder.action';
import { UpdateEventReminderAction } from './apps/actions/update-event-reminder-action/update-event-reminder.action';
import { DeleteEventReminderAction } from './apps/actions/delete-event-reminder-action/delete-event-reminder.action';
import { FetchEventRemindersAction } from './apps/actions/fetch-event-reminders-action/fetch-event-reminders.action';
import { ReminderScheduler } from './apps/schedulers/reminder-scheduler/reminder.scheduler';
import { SharedKernelModule } from '../shared-kernel/shared-kernel.module';
import { UsersModule } from '../users/users.module';

/**
 * Calendar Events module: encapsulates all calendar event-related logic, actions, and persistence.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CalendarEventEntity,
      RecurringEventEntity,
      RecurrenceExceptionEntity,
      EventReminderEntity,
    ]),
    SharedKernelModule,
    UsersModule,
  ],
  providers: [
    CalendarEventRepository,
    RecurringEventRepository,
    RecurrenceExceptionRepository,
    EventReminderRepository,
    FetchCalendarEventsTransactionScript,
    CreateCalendarEventTransactionScript,
    FetchCalendarEventTransactionScript,
    UpdateCalendarEventTransactionScript,
    DeleteCalendarEventTransactionScript,
    CalendarEventService,
    CreateRecurringEventTransactionScript,
    DeleteRecurringEventTransactionScript,
    GenerateEventInstancesTransactionScript,
    FetchRecurringEventsTransactionScript,
    RecurringEventService,
    RecurringEventToInfrastructureConverter,
    RecurringEventToDomainConverter,
    CreateEventReminderTransactionScript,
    UpdateEventReminderTransactionScript,
    UpdateEventReminderValidator,
    DeleteEventReminderTransactionScript,
    FetchEventRemindersTransactionScript,
    ReminderScheduler,
  ],
  controllers: [
    FetchCalendarEventsAction,
    CreateCalendarEventAction,
    FetchCalendarEventAction,
    UpdateCalendarEventAction,
    DeleteCalendarEventAction,
    CreateRecurringEventAction,
    DeleteRecurringEventAction,
    CreateEventReminderAction,
    UpdateEventReminderAction,
    DeleteEventReminderAction,
    FetchEventRemindersAction,
  ],
  exports: [
    CalendarEventRepository,
    RecurringEventRepository,
    RecurrenceExceptionRepository,
    EventReminderRepository,
  ],
})
export class CalendarEventsModule {}
