import {
  Post,
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
import { CreateEventReminderSwagger } from './create-event-reminder.swagger';
import { CreateEventReminderRequestDto } from './dtos/requests/create-event-reminder.dto';
import { CreateEventReminderCommand } from '../../../domain/transaction-scripts/create-event-reminder-TS/create-event-reminder.command';
import { EventReminderResponseDto } from './dtos/responses/event-reminder.response.dto';

/**
 * Action handler for creating event reminders.
 * Handles POST /calendar-events/:id/reminders requests.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Events')
@ApiBearerAuth()
export class CreateEventReminderAction {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  /**
   * Create a new reminder for a calendar event.
   *
   * @param id - Calendar event ID from path parameter
   * @param dto - Request DTO with reminder details
   * @param user - Authenticated user from JWT token
   * @returns Created reminder response DTO
   */
  @Post(':id/reminders')
  @HttpCode(HttpStatus.CREATED)
  @ProtectedAction(CreateEventReminderSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEventReminderRequestDto,
    @GetAuthUser() user: AuthUser
  ): Promise<EventReminderResponseDto> {
    const command: CreateEventReminderCommand = {
      calendarEventId: id,
      reminderMinutes: dto.reminderMinutes,
      user,
    };
    const reminder = await this.calendarEventService.createReminder(command);
    return new EventReminderResponseDto(reminder);
  }
}
