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
import { UpdateCalendarEventSwagger } from './update-calendar-event.swagger';
import { UpdateCalendarEventRequestDto } from './dtos/requests/update-calendar-event.dto';
import { UpdateCalendarEventCommand } from '../../../domain/transaction-scripts/update-calendar-event-TS/update-calendar-event.command';
import { CalendarEventResponseDto } from '../../dtos/responses/calendar-event.response.dto';

/**
 * Action handler for updating existing calendar events.
 * Handles PUT /calendar-events/:id requests.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Events')
@ApiBearerAuth()
export class UpdateCalendarEventAction {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  /**
   * Update an existing calendar event for the authenticated user.
   * Returns 404 if event doesn't exist or doesn't belong to the user.
   *
   * @param id - Calendar event ID from path parameter
   * @param dto - Request DTO with updated event details
   * @param user - Authenticated user from JWT token
   * @returns Updated calendar event response DTO
   */
  @Put(':id')
  @ProtectedAction(UpdateCalendarEventSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCalendarEventRequestDto,
    @GetAuthUser() user: AuthUser
  ): Promise<CalendarEventResponseDto> {
    const command: UpdateCalendarEventCommand = {
      eventId: id,
      title: dto.title,
      description: dto.description,
      color: dto.color,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      user,
    };
    const event = await this.calendarEventService.updateCalendarEvent(command);
    return new CalendarEventResponseDto(event);
  }
}
