import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CalendarService } from '../../../domain/services/calendar.service';
import { ProtectedAction } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { UpdateCalendarSwagger } from './update-calendar.swagger';
import { UpdateCalendarRequestDto } from './dtos/requests/update-calendar.dto';
import { CalendarResponseDto } from '../../dtos/responses/calendar.response.dto';

/**
 * Action handler for updating a calendar's name/color.
 * Handles PATCH /calendars/:id requests.
 */
@Controller('calendars')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendars')
@ApiBearerAuth()
export class UpdateCalendarAction {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * Update a calendar owned by the authenticated user.
   */
  @Patch(':id')
  @ProtectedAction(UpdateCalendarSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCalendarRequestDto,
    @GetAuthUser() user: AuthUser
  ): Promise<CalendarResponseDto> {
    const calendar = await this.calendarService.updateCalendar({
      calendarId: id,
      userId: user.userId,
      name: dto.name,
      color: dto.color,
    });
    return new CalendarResponseDto(calendar);
  }
}
