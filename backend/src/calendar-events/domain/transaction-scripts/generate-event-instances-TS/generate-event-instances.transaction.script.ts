import { Injectable } from '@nestjs/common';
import { CalendarEventRepository } from '../../../infra/repositories/calendar-event.repository';
import { RecurrenceExceptionRepository } from '../../../infra/repositories/recurrence-exception.repository';
import { RecurringEvent } from '../../entities/recurring-event.entity';
import { CalendarEvent } from '../../entities/calendar-event.entity';
import { generateInstanceDates } from '../../utils/rrule-pattern.utils';
import { startOfDay, differenceInMinutes } from 'date-fns';
import { Logger } from 'nestjs-pino';

/**
 * Transaction script for generating event instances from a recurring event.
 * Encapsulates all business logic for generating instances based on recurrence patterns.
 * Creates calendar_events with recurring_event_id set.
 */
@Injectable()
export class GenerateEventInstancesTransactionScript {
  constructor(
    private readonly logger: Logger,
    private readonly calendarEventRepository: CalendarEventRepository,
    private readonly recurrenceExceptionRepository: RecurrenceExceptionRepository
  ) {}

  /**
   * Generate event instances for a recurring event within a date range.
   * Creates CalendarEvent records (with recurring_event_id set) for each occurrence, skipping any that already exist.
   *
   * @param recurringEvent - The recurring event to generate instances for
   * @param rangeStart - Start of the date range to generate instances for
   * @param rangeEnd - End of the date range to generate instances for
   * @returns Array of created CalendarEvent entities (includes both newly created and existing ones)
   */
  async apply(
    recurringEvent: RecurringEvent,
    rangeStart: Date,
    rangeEnd: Date
  ): Promise<CalendarEvent[]> {
    // Get ALL existing instances for this recurring event (not just in date range)
    // This ensures we don't create duplicates even if date ranges overlap
    const allExistingInstances =
      await this.calendarEventRepository.findByRecurringEventId(
        recurringEvent.id
      );

    // Filter to only instances in the requested date range for return value
    const rangeStartNormalized = startOfDay(rangeStart);
    const rangeEndNormalized = startOfDay(rangeEnd);
    const existingInstancesInRange = allExistingInstances.filter(instance => {
      if (!instance.instanceDate) return false;
      const instanceDateNormalized = startOfDay(instance.instanceDate);
      return (
        instanceDateNormalized >= rangeStartNormalized &&
        instanceDateNormalized <= rangeEndNormalized
      );
    });

    // Create a set of existing instance dates for quick lookup
    // Normalize all dates to start of day and compare using timestamp
    // This avoids timezone and format issues
    const existingInstanceDateTimestamps = new Set<number>();
    for (const instance of allExistingInstances) {
      if (!instance.instanceDate) continue;
      // Normalize instanceDate to start of day and get timestamp
      const normalizedDate = startOfDay(instance.instanceDate);
      const timestamp = normalizedDate.getTime();
      existingInstanceDateTimestamps.add(timestamp);
    }

    // Get exception dates for this recurring event
    const exceptions =
      await this.recurrenceExceptionRepository.findByRecurringEventId(
        recurringEvent.id
      );
    const exceptionDates = exceptions.map(ex => ex.exceptionDate);
    this.logger.debug('Generating instances for recurring event:', {
      recurringEventId: recurringEvent.id,
      exceptionCount: exceptions.length,
      exceptionDates: exceptionDates.map(d => d.toISOString().split('T')[0]),
      rangeStart: rangeStart.toISOString().split('T')[0],
      rangeEnd: rangeEnd.toISOString().split('T')[0],
    });

    // Generate instance dates using rrule
    const instanceStartDates = generateInstanceDates(
      recurringEvent.recurrencePattern,
      recurringEvent.startDate,
      recurringEvent.endDate,
      recurringEvent.recurrenceEndDate,
      recurringEvent.noEndDate,
      exceptionDates,
      rangeStart,
      rangeEnd
    );
    this.logger.debug('Generated instance dates:', {
      count: instanceStartDates.length,
      dates: instanceStartDates.map(d => d.toISOString().split('T')[0]),
    });

    // Calculate duration from original event
    const durationMinutes = differenceInMinutes(
      recurringEvent.endDate,
      recurringEvent.startDate
    );

    // Create CalendarEvent for each generated date that doesn't already exist
    const newInstances: CalendarEvent[] = [];
    for (const instanceStartDate of instanceStartDates) {
      const instanceDate = startOfDay(instanceStartDate);
      // Use timestamp for comparison to avoid timezone/format issues
      const timestamp = instanceDate.getTime();

      // Skip if instance already exists
      if (existingInstanceDateTimestamps.has(timestamp)) {
        continue;
      }

      const instanceEndDate = new Date(
        instanceStartDate.getTime() + durationMinutes * 60 * 1000
      );

      const instance = await this.calendarEventRepository.createInstance({
        userId: recurringEvent.userId,
        recurringEventId: recurringEvent.id,
        instanceDate,
        title: recurringEvent.title, // Base title from recurring event
        description: recurringEvent.description, // Base description from recurring event
        color: recurringEvent.color, // Color from recurring event
        startDate: instanceStartDate,
        endDate: instanceEndDate,
        isModified: false,
        // titleOverride and descriptionOverride are null for new instances
        // They can be set later if the instance is modified
      });

      newInstances.push(instance);
    }

    // Return both existing instances in range and newly created instances
    return [...existingInstancesInRange, ...newInstances];
  }
}
