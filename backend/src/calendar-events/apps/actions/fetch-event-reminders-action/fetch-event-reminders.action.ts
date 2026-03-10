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
import { FetchEventRemindersSwagger } from './fetch-event-reminders.swagger';
import { FetchEventRemindersCommand } from '../../../domain/transaction-scripts/fetch-event-reminders-TS/fetch-event-reminders.command';
import { EventReminderResponseDto } from './dtos/responses/event-reminder.response.dto';

/**
 * Action handler for fetching event reminders.
 * Handles GET /calendar-events/:id/reminders requests.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Events')
@ApiBearerAuth()
export class FetchEventRemindersAction {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  /**
   * Fetch reminders for a calendar event.
   * Returns 404 if event doesn't exist or doesn't belong to the user.
   *
   * @param id - Calendar event ID from path parameter
   * @param user - Authenticated user from JWT token
   * @returns Array of reminder response DTOs
   */
  @Get(':id/reminders')
  @ProtectedAction(FetchEventRemindersSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @GetAuthUser() user: AuthUser
  ): Promise<EventReminderResponseDto[]> {
    const command: FetchEventRemindersCommand = {
      calendarEventId: id,
      user,
    };
    const reminders =
      await this.calendarEventService.getRemindersForEvent(command);
    return reminders.map(reminder => new EventReminderResponseDto(reminder));
  }
}
