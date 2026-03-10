import {
  Post,
  Body,
  Controller,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CalendarEventService } from '../../../domain/services/calendar-event.service';
import { ProtectedAction } from '../../../../shared-kernel/apps/decorators/protected-action.decorator';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { CreateCalendarEventSwagger } from './create-calendar-event.swagger';
import { CreateCalendarEventRequestDto } from './dtos/requests/create-calendar-event.dto';
import { CreateCalendarEventCommand } from '../../../domain/transaction-scripts/create-calendar-event-TS/create-calendar-event.command';
import { CalendarEventResponseDto } from '../../dtos/responses/calendar-event.response.dto';

/**
 * Action handler for creating new calendar events.
 * Handles POST /calendar-events requests.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Events')
@ApiBearerAuth()
export class CreateCalendarEventAction {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  /**
   * Create a new calendar event for the authenticated user.
   *
   * @param dto - Request DTO with event details (title, description, startDate, endDate, reminderMinutes)
   * @param user - Authenticated user from JWT token
   * @returns Created calendar event response DTO
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ProtectedAction(CreateCalendarEventSwagger)
  async apply(
    @Body() dto: CreateCalendarEventRequestDto,
    @GetAuthUser() user: AuthUser
  ): Promise<CalendarEventResponseDto> {
    const command: CreateCalendarEventCommand = {
      title: dto.title,
      description: dto.description,
      color: dto.color,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      user,
      reminderMinutes: dto.reminderMinutes,
    };
    const event = await this.calendarEventService.createCalendarEvent(command);
    return new CalendarEventResponseDto(event);
  }
}
