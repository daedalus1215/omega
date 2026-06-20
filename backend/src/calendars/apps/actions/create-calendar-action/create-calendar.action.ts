import {
  Post,
  Body,
  Controller,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CalendarService } from '../../../domain/services/calendar.service';
import { ProtectedAction } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { CreateCalendarSwagger } from './create-calendar.swagger';
import { CreateCalendarRequestDto } from './dtos/requests/create-calendar.dto';
import { CalendarResponseDto } from '../../dtos/responses/calendar.response.dto';

/**
 * Action handler for creating calendars.
 * Handles POST /calendars requests.
 */
@Controller('calendars')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendars')
@ApiBearerAuth()
export class CreateCalendarAction {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * Create a new calendar owned by the authenticated user.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ProtectedAction(CreateCalendarSwagger)
  async apply(
    @Body() dto: CreateCalendarRequestDto,
    @GetAuthUser() user: AuthUser
  ): Promise<CalendarResponseDto> {
    const calendar = await this.calendarService.createCalendar({
      userId: user.userId,
      name: dto.name,
      color: dto.color,
    });
    return new CalendarResponseDto({ ...calendar, role: 'owner' });
  }
}
