import {
  Delete,
  Param,
  Controller,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { RecurringEventService } from '../../../domain/services/recurring-event.service';
import { ProtectedAction } from '../../../../shared-kernel/apps/decorators/protected-action.decorator';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { DeleteRecurringEventSwagger } from './delete-recurring-event.swagger';
import { DeleteRecurringEventCommand } from '../../../domain/transaction-scripts/delete-recurring-event-TS/delete-recurring-event.command';

/**
 * Action handler for deleting recurring events.
 * Handles DELETE /calendar-events/recurring/:id requests.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Recurring Events')
@ApiBearerAuth()
export class DeleteRecurringEventAction {
  constructor(private readonly recurringEventService: RecurringEventService) {}

  /**
   * Delete a recurring event for the authenticated user.
   * All event instances are automatically deleted via CASCADE foreign key constraint.
   * Returns 404 if recurring event doesn't exist or doesn't belong to the user.
   *
   * @param id - Recurring event ID from path parameter
   * @param user - Authenticated user from JWT token
   * @returns Success response
   */
  @Delete('recurring/:id')
  @ProtectedAction(DeleteRecurringEventSwagger)
  async apply(
    @Param('id', ParseIntPipe) id: number,
    @GetAuthUser() user: AuthUser
  ): Promise<{ success: boolean }> {
    const command: DeleteRecurringEventCommand = {
      recurringEventId: id,
      user,
    };
    await this.recurringEventService.deleteRecurringEvent(command);
    return { success: true };
  }
}
