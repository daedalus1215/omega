import {
  Put,
  Body,
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
import { UpdateEventReminderSwagger } from './update-event-reminder.swagger';
import { UpdateEventReminderRequestDto } from './dtos/requests/update-event-reminder.dto';
import { UpdateEventReminderCommand } from '../../../domain/transaction-scripts/update-event-reminder-TS/update-event-reminder.command';
import { EventReminderResponseDto } from './dtos/responses/event-reminder.response.dto';

/**
 * Action handler for updating event reminders.
 * Handles PUT /calendar-events/:eventId/reminders/:reminderId requests.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Events')
@ApiBearerAuth()
export class UpdateEventReminderAction {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  /**
   * Update an existing event reminder.
   * Returns 404 if reminder doesn't exist or doesn't belong to the user.
   *
   * @param eventId - Calendar event ID from path parameter
   * @param reminderId - Reminder ID from path parameter
   * @param dto - Request DTO with updated reminder details
   * @param user - Authenticated user from JWT token
   * @returns Updated reminder response DTO
   */
  @Put(':eventId/reminders/:reminderId')
  @ProtectedAction(UpdateEventReminderSwagger)
  async apply(
    @Param('reminderId', ParseIntPipe) reminderId: number,
    @Body() dto: UpdateEventReminderRequestDto,
    @GetAuthUser() user: AuthUser
  ): Promise<EventReminderResponseDto> {
    return new EventReminderResponseDto(
      await this.calendarEventService.updateReminder({
        reminderId,
        reminderMinutes: dto.reminderMinutes,
        user,
      })
    );
  }
}
