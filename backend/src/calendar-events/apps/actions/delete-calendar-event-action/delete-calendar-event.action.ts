import {
  Delete,
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
import { DeleteCalendarEventSwagger } from './delete-calendar-event.swagger';
import { DeleteCalendarEventCommand } from '../../../domain/transaction-scripts/delete-calendar-event-TS/delete-calendar-event.command';

/**
 * Action handler for deleting calendar events.
 * Handles DELETE /calendar-events/:id requests.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Events')
@ApiBearerAuth()
export class DeleteCalendarEventAction {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  /**
   * Delete a calendar event for the authenticated user.
   * Returns 404 if event doesn't exist or doesn't belong to the user.
   *
   * @param id - Calendar event ID from path parameter
   * @param user - Authenticated user from JWT token
   * @returns Success response
   */
  @Delete(':id')
  @ProtectedAction(DeleteCalendarEventSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @GetAuthUser() user: AuthUser
  ): Promise<{ success: boolean }> {
    const command: DeleteCalendarEventCommand = {
      eventId: id,
      user,
    };
    await this.calendarEventService.deleteCalendarEvent(command);
    return { success: true };
  }
}
