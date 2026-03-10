import {
  Get,
  Param,
  Controller,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CalendarEventService } from '../../../domain/services/calendar-event.service';
import { ProtectedAction } from '../../../../shared-kernel/apps/decorators/protected-action.decorator';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { FetchCalendarEventSwagger } from './fetch-calendar-event.swagger';
import { FetchCalendarEventCommand } from '../../../domain/transaction-scripts/fetch-calendar-event-TS/fetch-calendar-event.command';
import { CalendarEventResponseDto } from '../../dtos/responses/calendar-event.response.dto';
import { EventReminderRepository } from '../../../infra/repositories/event-reminder.repository';
import { EventReminderResponseDto } from '../fetch-event-reminders-action/dtos/responses/event-reminder.response.dto';

/**
 * Action handler for fetching a single calendar event by ID.
 * Handles GET /calendar-events/:id requests.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Events')
@ApiBearerAuth()
export class FetchCalendarEventAction {
  constructor(
    private readonly calendarEventService: CalendarEventService,
    private readonly eventReminderRepository: EventReminderRepository
  ) {}

  /**
   * Fetch a specific calendar event by ID for the authenticated user.
   * Returns 404 if event doesn't exist or doesn't belong to the user.
   *
   * @param id - Calendar event ID from path parameter
   * @param user - Authenticated user from JWT token
   * @returns Calendar event response DTO
   */
  @Get(':id')
  @ProtectedAction(FetchCalendarEventSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @GetAuthUser() user: AuthUser
  ): Promise<CalendarEventResponseDto> {
    const command: FetchCalendarEventCommand = {
      eventId: id,
      user,
    };
    const event =
      await this.calendarEventService.fetchCalendarEventById(command);

    // Fetch reminders for this event
    const reminders = await this.eventReminderRepository.findByEventId(
      event.id
    );
    const reminderDtos = reminders.map(r => new EventReminderResponseDto(r));

    return new CalendarEventResponseDto(event, reminderDtos);
  }
}
