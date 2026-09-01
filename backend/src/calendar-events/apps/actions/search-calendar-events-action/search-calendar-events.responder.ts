import { Injectable } from '@nestjs/common';
import {
  OneTimeEventSearchResultDto,
  RecurringSeriesSearchResultDto,
  SearchCalendarEventsResultDto,
} from '../../dtos/responses/search-calendar-events.response.dto';
import { CalendarEventSearchResult } from '../../../domain/transaction-scripts/search-calendar-events-TS/search-calendar-events.result';

/**
 * Responder for the search-calendar-events action.
 * Converts domain search results into response DTOs.
 */
@Injectable()
export class SearchCalendarEventsResponder {
  /**
   * Convert domain search results to response DTOs.
   *
   * @param results - Domain search results from the service
   * @returns Array of response DTOs
   */
  apply(
    results: CalendarEventSearchResult[]
  ): SearchCalendarEventsResultDto[] {
    return results.map(result => this.toDto(result));
  }

  /**
   * Map a domain search result to its response DTO.
   */
  private toDto(
    result: CalendarEventSearchResult
  ): SearchCalendarEventsResultDto {
    if (result.kind === 'one-time') {
      const dto = new OneTimeEventSearchResultDto();
      dto.eventId = result.eventId;
      dto.calendarId = result.calendarId;
      dto.title = result.title;
      dto.color = result.color;
      dto.startDate = result.startDate;
      dto.endDate = result.endDate;
      return dto;
    }
    const dto = new RecurringSeriesSearchResultDto();
    dto.recurringEventId = result.recurringEventId;
    dto.calendarId = result.calendarId;
    dto.title = result.title;
    dto.color = result.color;
    dto.nextInstanceId = result.nextInstanceId;
    dto.nextInstanceStartDate = result.nextInstanceStartDate;
    dto.nextInstanceEndDate = result.nextInstanceEndDate;
    return dto;
  }
}
