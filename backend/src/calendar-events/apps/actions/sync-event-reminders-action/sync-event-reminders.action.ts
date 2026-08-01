import {
  Put,
  Body,
  Param,
  Controller,
  UseGuards,
  HttpCode,
  HttpStatus,
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
import { SyncEventRemindersSwagger } from './sync-event-reminders.swagger';
import { SyncEventRemindersRequestDto } from './dtos/requests/sync-event-reminders.dto';
import { SyncEventRemindersCommand } from '../../../domain/transaction-scripts/sync-event-reminders-TS/sync-event-reminders.command';
import { EventReminderResponseDto } from './dtos/responses/event-reminder.response.dto';

/**
 * Action handler for replacing an event's reminders in one request.
 * Handles PUT /calendar-events/:id/reminders requests.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Events')
@ApiBearerAuth()
export class SyncEventRemindersAction {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  /**
   * Replace the full set of reminders on a calendar event.
   *
   * @param id - Calendar event ID from path parameter
   * @param dto - Request DTO with the desired offsets
   * @param user - Authenticated user from JWT token
   * @returns The event's reminders after syncing
   */
  @Put(':id/reminders')
  @HttpCode(HttpStatus.OK)
  @ProtectedAction(SyncEventRemindersSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SyncEventRemindersRequestDto,
    @GetAuthUser() user: AuthUser
  ): Promise<EventReminderResponseDto[]> {
    const command: SyncEventRemindersCommand = {
      calendarEventId: id,
      reminderMinutes: dto.reminderMinutes,
      user,
    };
    const reminders = await this.calendarEventService.syncReminders(command);
    return reminders.map(reminder => new EventReminderResponseDto(reminder));
  }
}
