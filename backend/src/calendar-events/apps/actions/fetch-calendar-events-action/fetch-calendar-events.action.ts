import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CalendarEventService } from '../../../domain/services/calendar-event.service';
import { ProtectedAction } from '../../../../shared-kernel/apps/decorators/protected-action.decorator';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { FetchCalendarEventsSwagger } from './fetch-calendar-events.swagger';
import { FetchCalendarEventsRequestDto } from './dtos/requests/fetch-calendar-events.dto';
import { FetchCalendarEventsCommand } from '../../../domain/transaction-scripts/fetch-calendar-events-TS/fetch-calendar-events.command';
import { CalendarEventResponseDto } from '../../dtos/responses/calendar-event.response.dto';
import { EventReminderRepository } from '../../../infra/repositories/event-reminder.repository';
import { EventReminderResponseDto } from '../fetch-event-reminders-action/dtos/responses/event-reminder.response.dto';
import { parseISO, startOfWeek, endOfWeek } from 'date-fns';

/**
 * Action handler for fetching calendar events within a date range.
 * Handles GET /calendar-events requests with optional date range query parameters.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Events')
@ApiBearerAuth()
export class FetchCalendarEventsAction {
  constructor(
    private readonly calendarEventService: CalendarEventService,
    private readonly eventReminderRepository: EventReminderRepository
  ) {}

  /**
   * Fetch calendar events for the authenticated user within a date range.
   * If no date range is provided, defaults to current week.
   *
   * @param dto - Request DTO with optional startDate and endDate
   * @param user - Authenticated user from JWT token
   * @returns Array of calendar event response DTOs
   */
  @Get()
  @ProtectedAction(FetchCalendarEventsSwagger)
  async apply(
    @Query() dto: FetchCalendarEventsRequestDto,
    @GetAuthUser() user: AuthUser
  ): Promise<CalendarEventResponseDto[]> {
    const now = new Date();
    const startDate = dto.startDate
      ? parseISO(dto.startDate)
      : startOfWeek(now, { weekStartsOn: 1 });
    const endDate = dto.endDate
      ? parseISO(dto.endDate)
      : endOfWeek(now, { weekStartsOn: 1 });
    const command: FetchCalendarEventsCommand = {
      userId: user.userId,
      startDate,
      endDate,
      user,
    };
    const events = await this.calendarEventService.fetchCalendarEvents(command);

    // Fetch reminders for all events
    const eventIds = events.map(event => event.id);
    const allReminders =
      eventIds.length > 0
        ? await this.eventReminderRepository.findByEventIds(eventIds)
        : [];

    // Group reminders by event ID
    const remindersByEventId = new Map<number, EventReminderResponseDto[]>();
    allReminders.forEach(reminder => {
      const eventReminders =
        remindersByEventId.get(reminder.calendarEventId) || [];
      eventReminders.push(new EventReminderResponseDto(reminder));
      remindersByEventId.set(reminder.calendarEventId, eventReminders);
    });

    // @TODO: Can move this to a responder
    return events.map(
      (event: {
        id: number;
        userId: number;
        recurringEventId?: number;
        instanceDate?: Date;
        title: string;
        description?: string;
        startDate: Date;
        endDate: Date;
        isModified?: boolean;
        titleOverride?: string;
        descriptionOverride?: string;
        createdAt: Date;
        updatedAt: Date;
      }) => {
        const reminders = remindersByEventId.get(event.id) || [];
        return new CalendarEventResponseDto(event, reminders);
      }
    );
  }
}
