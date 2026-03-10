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
import { DeleteEventReminderSwagger } from './delete-event-reminder.swagger';
import { DeleteEventReminderCommand } from '../../../domain/transaction-scripts/delete-event-reminder-TS/delete-event-reminder.command';

/**
 * Action handler for deleting event reminders.
 * Handles DELETE /calendar-events/:eventId/reminders/:reminderId requests.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Events')
@ApiBearerAuth()
export class DeleteEventReminderAction {
  constructor(private readonly calendarEventService: CalendarEventService) {}

  /**
   * Delete an event reminder for the authenticated user.
   * Returns 404 if reminder doesn't exist or doesn't belong to the user.
   *
   * @param eventId - Calendar event ID from path parameter
   * @param reminderId - Reminder ID from path parameter
   * @param user - Authenticated user from JWT token
   * @returns Success response
   */
  @Delete(':eventId/reminders/:reminderId')
  @ProtectedAction(DeleteEventReminderSwagger)
  async apply(
    @Param('reminderId', ParseIntPipe) reminderId: number,
    @GetAuthUser() user: AuthUser
  ): Promise<{ success: boolean }> {
    const command: DeleteEventReminderCommand = {
      reminderId,
      user,
    };
    await this.calendarEventService.deleteReminder(command);
    return { success: true };
  }
}
