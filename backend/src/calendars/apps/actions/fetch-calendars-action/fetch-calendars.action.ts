import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CalendarService } from '../../../domain/services/calendar.service';
import { ProtectedAction } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { FetchCalendarsSwagger } from './fetch-calendars.swagger';
import { CalendarResponseDto } from '../../dtos/responses/calendar.response.dto';

/**
 * Action handler for listing the authenticated user's calendars.
 * Handles GET /calendars requests.
 */
@Controller('calendars')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendars')
@ApiBearerAuth()
export class FetchCalendarsAction {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * List the calendars the authenticated user is a member of.
   */
  @Get()
  @ProtectedAction(FetchCalendarsSwagger)
  async apply(@GetAuthUser() user: AuthUser): Promise<CalendarResponseDto[]> {
    const calendars = await this.calendarService.fetchCalendars(user.userId);
    return calendars.map(calendar => new CalendarResponseDto(calendar));
  }
}
