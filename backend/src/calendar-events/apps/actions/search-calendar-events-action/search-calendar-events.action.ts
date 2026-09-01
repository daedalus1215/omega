import {
  Controller,
  BadRequestException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CalendarEventService } from '../../../domain/services/calendar-event.service';
import {
  AuthUser,
  GetAuthUser,
} from 'src/shared-kernel/apps/decorators/get-auth-user.decorator';
import { SearchCalendarEventsResultDto } from '../../dtos/responses/search-calendar-events.response.dto';
import { ProtectedAction } from 'src/shared-kernel/apps/decorators/protected-action.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/shared-kernel/apps/guards/jwt-auth.guard';
import { SearchCalendarEventsSwagger } from './search-calendar-events.swagger';
import { SearchCalendarEventsRequestDto } from './dtos/requests/search-calendar-events.dto';
import { SearchCalendarEventsCommand } from '../../../domain/transaction-scripts/search-calendar-events-TS/search-calendar-events.command';
import { SearchCalendarEventsResponder } from './search-calendar-events.responder';

/**
 * Action handler for searching calendar events by name.
 * Handles GET /calendar-events/search requests.
 */
@Controller('calendar-events')
@UseGuards(JwtAuthGuard)
@ApiTags('Calendar Events')
@ApiBearerAuth()
export class SearchCalendarEventsAction {
  constructor(
    private readonly calendarEventService: CalendarEventService,
    private readonly searchCalendarEventsResponder: SearchCalendarEventsResponder
  ) {}

  /**
   * Search calendar events by name for the authenticated user.
   * Returns recurring series (ordered by next occurrence) followed by
   * one-time events (ordered by start date).
   *
   * @param dto - Request DTO with the search query
   * @param user - Authenticated user from JWT token
   * @returns Array of search result DTOs
   */
  @Get('search')
  @ProtectedAction(SearchCalendarEventsSwagger)
  async apply(
    @Query() dto: SearchCalendarEventsRequestDto,
    @GetAuthUser() user: AuthUser
  ): Promise<SearchCalendarEventsResultDto[]> {
    const query = dto.query.trim();
    if (query.length < 2) {
      throw new BadRequestException('Query must be at least 2 characters');
    }
    const command: SearchCalendarEventsCommand = { query, user };
    const results = await this.calendarEventService.searchCalendarEvents(
      command
    );
    return this.searchCalendarEventsResponder.apply(results);
  }
}
