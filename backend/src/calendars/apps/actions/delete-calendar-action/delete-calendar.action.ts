import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { DeleteCalendarSwagger } from './delete-calendar.swagger';

/**
 * Action handler for deleting a calendar.
 * Handles DELETE /calendars/:id requests.
 */
@Controller('calendars')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendars')
@ApiBearerAuth()
export class DeleteCalendarAction {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * Delete a calendar owned by the authenticated user.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ProtectedAction(DeleteCalendarSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @GetAuthUser() user: AuthUser
  ): Promise<void> {
    await this.calendarService.deleteCalendar({
      calendarId: id,
      userId: user.userId,
    });
  }
}
