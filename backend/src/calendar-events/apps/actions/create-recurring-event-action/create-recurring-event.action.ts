import {
  Post,
  Body,
  Controller,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RecurringEventService } from '../../../domain/services/recurring-event.service';
import { ProtectedAction } from '../../../../shared-kernel/apps/decorators/protected-action.decorator';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { CreateRecurringEventSwagger } from './create-recurring-event.swagger';
import { CreateRecurringEventRequestDto } from './dtos/requests/create-recurring-event.dto';
import { CreateRecurringEventCommand } from '../../../domain/transaction-scripts/create-recurring-event-TS/create-recurring-event.command';
import { RecurringEventResponseDtoClass } from '../../dtos/responses/recurring-event.response.dto';

/**
 * Action handler for creating new recurring calendar events.
 * Handles POST /calendar-events/recurring requests.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Recurring Events')
@ApiBearerAuth()
export class CreateRecurringEventAction {
  constructor(private readonly recurringEventService: RecurringEventService) {}

  /**
   * Create a new recurring calendar event for the authenticated user.
   *
   * @param dto - Request DTO with recurring event details
   * @param user - Authenticated user from JWT token
   * @returns Created recurring event response DTO
   */
  @Post('recurring')
  @HttpCode(HttpStatus.CREATED)
  @ProtectedAction(CreateRecurringEventSwagger)
  async apply(
    @Body() dto: CreateRecurringEventRequestDto,
    @GetAuthUser() user: AuthUser
  ): Promise<RecurringEventResponseDtoClass> {
    const command: CreateRecurringEventCommand = {
      title: dto.title,
      description: dto.description,
      color: dto.color,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      recurrencePattern: {
        type: dto.recurrencePattern.type,
        interval: dto.recurrencePattern.interval,
        daysOfWeek: dto.recurrencePattern.daysOfWeek,
        dayOfMonth: dto.recurrencePattern.dayOfMonth,
        monthOfYear: dto.recurrencePattern.monthOfYear,
      },
      recurrenceEndDate: dto.recurrenceEndDate
        ? new Date(dto.recurrenceEndDate)
        : undefined,
      noEndDate: dto.noEndDate,
      user,
    };
    const event =
      await this.recurringEventService.createRecurringEvent(command);
    return new RecurringEventResponseDtoClass(event);
  }
}
