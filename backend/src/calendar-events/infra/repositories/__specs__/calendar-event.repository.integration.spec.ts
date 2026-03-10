import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CalendarEventRepository } from '../calendar-event.repository';
import { CalendarEventEntity } from '../../entities/calendar-event.entity';
import { RecurringEventEntity } from '../../entities/recurring-event.entity';
import { CalendarEvent } from '../../../domain/entities/calendar-event.entity';
import { Logger } from 'nestjs-pino';
import { generateRandomNumbers } from 'src/shared-kernel/test-utils';

describe('CalendarEventRepository Integration Tests', () => {
  let target: CalendarEventRepository;
  let dataSource: DataSource;
  let module: TestingModule;

  const testUserId = generateRandomNumbers();

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [CalendarEventEntity, RecurringEventEntity],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([CalendarEventEntity]),
      ],
      providers: [
        CalendarEventRepository,
        {
          provide: Logger,
          useValue: {
            debug: jest.fn(),
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
          },
        },
      ],
    }).compile();

    target = module.get<CalendarEventRepository>(CalendarEventRepository);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await module.close();
  });

  beforeEach(async () => {
    await dataSource.getRepository(CalendarEventEntity).clear();
    await dataSource.getRepository(RecurringEventEntity).clear();
  });

  describe('create', () => {
    it('should create a one-time calendar event', async () => {
      // Arrange
      const eventData: Partial<CalendarEvent> = {
        userId: testUserId,
        title: 'Team Meeting',
        description: 'Weekly standup',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
      };

      // Act
      const result = await target.create(eventData);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(testUserId);
      expect(result.title).toBe('Team Meeting');
      expect(result.description).toBe('Weekly standup');
      expect(result.startDate).toEqual(eventData.startDate);
      expect(result.endDate).toEqual(eventData.endDate);
      expect(result.recurringEventId).toBeNull();
      expect(result.instanceDate).toBeNull();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should create a recurring event instance', async () => {
      // Arrange
      const recurringEventRepo = dataSource.getRepository(RecurringEventEntity);
      const recurringEvent = await recurringEventRepo.save({
        id: generateRandomNumbers(),
        userId: testUserId,
        title: 'Recurring Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
        recurrenceType: 'WEEKLY',
        recurrenceInterval: 1,
        noEndDate: false,
        rruleString: 'FREQ=WEEKLY;INTERVAL=1',
      });

      const instanceDate = new Date('2024-01-15T00:00:00Z');
      const eventData: Partial<CalendarEvent> = {
        userId: testUserId,
        recurringEventId: recurringEvent.id,
        instanceDate,
        title: 'Recurring Meeting',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
      };

      // Act
      const result = await target.create(eventData);

      expect(result.id).toBeDefined();
      expect(result.recurringEventId).toBe(recurringEvent.id);
      // Assert
      const resultDate =
        result.instanceDate instanceof Date
          ? result.instanceDate.toISOString().split('T')[0]
          : result.instanceDate;
      const expectedDate = instanceDate.toISOString().split('T')[0];
      expect(resultDate).toBe(expectedDate);
      expect(result.title).toBe('Recurring Meeting');
    });

    it('should create event with optional fields', async () => {
      // Arrange
      const eventData: Partial<CalendarEvent> = {
        userId: testUserId,
        title: 'Minimal Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
        isModified: true,
        titleOverride: 'Override Title',
        descriptionOverride: 'Override Description',
      };

      // Act
      const result = await target.create(eventData);

      // Assert
      expect(result.isModified).toBe(true);
      expect(result.titleOverride).toBe('Override Title');
      expect(result.descriptionOverride).toBe('Override Description');
    });
  });

  describe('createInstance', () => {
    it('should create a recurring event instance', async () => {
      // Arrange
      const recurringEventRepo = dataSource.getRepository(RecurringEventEntity);
      const recurringEvent = await recurringEventRepo.save({
        id: generateRandomNumbers(),
        userId: testUserId,
        title: 'Recurring Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
        recurrenceType: 'WEEKLY',
        recurrenceInterval: 1,
        noEndDate: false,
        rruleString: 'FREQ=WEEKLY;INTERVAL=1',
      });

      const instanceDate = new Date('2024-01-15T00:00:00Z');
      const eventData: Partial<CalendarEvent> = {
        userId: testUserId,
        recurringEventId: recurringEvent.id,
        instanceDate,
        title: 'Recurring Instance',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
      };

      // Act
      const result = await target.createInstance(eventData);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.recurringEventId).toBe(recurringEvent.id);
      const resultDate =
        result.instanceDate instanceof Date
          ? result.instanceDate.toISOString().split('T')[0]
          : result.instanceDate;
      const expectedDate = instanceDate.toISOString().split('T')[0];
      expect(resultDate).toBe(expectedDate);
    });

    it('should return existing instance when duplicate constraint is violated', async () => {
      // Arrange
      const recurringEventRepo = dataSource.getRepository(RecurringEventEntity);
      const recurringEvent = await recurringEventRepo.save({
        id: generateRandomNumbers(),
        userId: testUserId,
        title: 'Recurring Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
        recurrenceType: 'WEEKLY',
        recurrenceInterval: 1,
        noEndDate: false,
        rruleString: 'FREQ=WEEKLY;INTERVAL=1',
      });

      const instanceDate = new Date('2024-01-15T00:00:00Z');
      const eventData: Partial<CalendarEvent> = {
        userId: testUserId,
        recurringEventId: recurringEvent.id,
        instanceDate,
        title: 'First Instance',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
      };

      // Act
      const firstResult = await target.createInstance(eventData);
      expect(firstResult.id).toBeDefined();

      const duplicateData: Partial<CalendarEvent> = {
        ...eventData,
        title: 'Duplicate Instance',
      };

      const duplicateResult = await target.createInstance(duplicateData);

      // Assert
      expect(duplicateResult.id).toBe(firstResult.id);
      expect(duplicateResult.title).toBe('First Instance');
    });

    it('should create one-time event when recurringEventId is not provided', async () => {
      // Arrange
      const eventData: Partial<CalendarEvent> = {
        userId: testUserId,
        title: 'One-time Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
      };

      // Act
      const result = await target.createInstance(eventData);

      // Assert
      expect(result.id).toBeDefined();
      expect(result.recurringEventId).toBeNull();
      expect(result.instanceDate).toBeNull();
    });
  });

  describe('findByDateRange', () => {
    beforeEach(async () => {
      const events: Partial<CalendarEvent>[] = [
        {
          userId: testUserId,
          title: 'Event Before Range',
          startDate: new Date('2024-01-10T10:00:00Z'),
          endDate: new Date('2024-01-10T11:00:00Z'),
        },
        {
          userId: testUserId,
          title: 'Event In Range Start',
          startDate: new Date('2024-01-15T10:00:00Z'),
          endDate: new Date('2024-01-15T11:00:00Z'),
        },
        {
          userId: testUserId,
          title: 'Event In Range Middle',
          startDate: new Date('2024-01-20T10:00:00Z'),
          endDate: new Date('2024-01-20T11:00:00Z'),
        },
        {
          userId: testUserId,
          title: 'Event In Range End',
          startDate: new Date('2024-01-25T10:00:00Z'),
          endDate: new Date('2024-01-25T11:00:00Z'),
        },
        {
          userId: testUserId,
          title: 'Event After Range',
          startDate: new Date('2024-02-01T10:00:00Z'),
          endDate: new Date('2024-02-01T11:00:00Z'),
        },
        {
          userId: testUserId,
          title: 'Long Event Overlapping',
          startDate: new Date('2024-01-10T10:00:00Z'),
          endDate: new Date('2024-01-30T11:00:00Z'),
        },
      ];

      for (const event of events) {
        await target.create(event);
      }
    });

    it('should find events that overlap with date range', async () => {
      // Arrange
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-25T23:59:59Z');

      // Act
      const results = await target.findByDateRange(
        testUserId,
        startDate,
        endDate
      );

      // Assert
      expect(results).toHaveLength(4);
      expect(results.map(r => r.title)).toContain('Event In Range Start');
      expect(results.map(r => r.title)).toContain('Event In Range Middle');
      expect(results.map(r => r.title)).toContain('Event In Range End');
      expect(results.map(r => r.title)).toContain('Long Event Overlapping');
      expect(results.map(r => r.title)).not.toContain('Event Before Range');
      expect(results.map(r => r.title)).not.toContain('Event After Range');
    });

    it('should return events ordered by start date ascending', async () => {
      // Arrange
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-25T23:59:59Z');

      // Act
      const results = await target.findByDateRange(
        testUserId,
        startDate,
        endDate
      );

      // Assert
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].startDate.getTime()).toBeLessThanOrEqual(
          results[i + 1].startDate.getTime()
        );
      }
    });

    it('should only return events for the specified user', async () => {
      // Arrange
      const otherUserId = generateRandomNumbers();
      await target.create({
        userId: otherUserId,
        title: 'Other User Event',
        startDate: new Date('2024-01-20T10:00:00Z'),
        endDate: new Date('2024-01-20T11:00:00Z'),
      });

      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-25T23:59:59Z');

      // Act
      const results = await target.findByDateRange(
        testUserId,
        startDate,
        endDate
      );

      // Assert
      expect(results.every(r => r.userId === testUserId)).toBe(true);
      expect(results.map(r => r.title)).not.toContain('Other User Event');
    });
  });

  describe('findByRecurringEventId', () => {
    it('should find all instances for a recurring event', async () => {
      // Arrange
      const recurringEventRepo = dataSource.getRepository(RecurringEventEntity);
      const recurringEvent = await recurringEventRepo.save({
        id: generateRandomNumbers(),
        userId: testUserId,
        title: 'Recurring Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
        recurrenceType: 'WEEKLY',
        recurrenceInterval: 1,
        noEndDate: false,
        rruleString: 'FREQ=WEEKLY;INTERVAL=1',
      });

      const dates = [
        new Date('2024-01-15T00:00:00Z'),
        new Date('2024-01-22T00:00:00Z'),
        new Date('2024-01-29T00:00:00Z'),
      ];

      for (const date of dates) {
        await target.create({
          userId: testUserId,
          recurringEventId: recurringEvent.id,
          instanceDate: date,
          title: 'Recurring Event',
          startDate: new Date(date.getTime() + 10 * 60 * 60 * 1000),
          endDate: new Date(date.getTime() + 11 * 60 * 60 * 1000),
        });
      }

      // Act
      const results = await target.findByRecurringEventId(recurringEvent.id);

      // Assert
      expect(results).toHaveLength(3);
      expect(results.every(r => r.recurringEventId === recurringEvent.id)).toBe(
        true
      );

      results.forEach(result => {
        expect(result.instanceDate).toBeDefined();
        expect(result.instanceDate).not.toBeNull();
      });

      const resultDates = results.map(r => {
        const date = r.instanceDate;
        if (date instanceof Date) {
          return date.toISOString().split('T')[0];
        }
        if (typeof date === 'string') {
          return date;
        }
        return String(date);
      });

      expect(resultDates.length).toBe(3);
      expect(new Set(resultDates).size).toBe(3);
    });

    it('should return instances ordered by instance date ascending', async () => {
      // Arrange
      const recurringEventRepo = dataSource.getRepository(RecurringEventEntity);
      const recurringEvent = await recurringEventRepo.save({
        id: generateRandomNumbers(),
        userId: testUserId,
        title: 'Recurring Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
        recurrenceType: 'WEEKLY',
        recurrenceInterval: 1,
        noEndDate: false,
        rruleString: 'FREQ=WEEKLY;INTERVAL=1',
      });

      const dates = [
        new Date('2024-01-29T00:00:00Z'),
        new Date('2024-01-15T00:00:00Z'),
        new Date('2024-01-22T00:00:00Z'),
      ];

      for (const date of dates) {
        await target.create({
          userId: testUserId,
          recurringEventId: recurringEvent.id,
          instanceDate: date,
          title: 'Recurring Event',
          startDate: new Date(date.getTime() + 10 * 60 * 60 * 1000),
          endDate: new Date(date.getTime() + 11 * 60 * 60 * 1000),
        });
      }

      // Act
      const results = await target.findByRecurringEventId(recurringEvent.id);

      // Assert
      const getDateValue = (date: Date | string | null | undefined): number => {
        if (!date) return 0;
        if (date instanceof Date) return date.getTime();
        return new Date(date).getTime();
      };

      expect(getDateValue(results[0].instanceDate)).toBeLessThanOrEqual(
        getDateValue(results[1].instanceDate)
      );
      expect(getDateValue(results[1].instanceDate)).toBeLessThanOrEqual(
        getDateValue(results[2].instanceDate)
      );
    });

    it('should return empty array when no instances exist', async () => {
      // Arrange
      const nonExistentRecurringEventId = generateRandomNumbers();

      // Act
      const results = await target.findByRecurringEventId(
        nonExistentRecurringEventId
      );

      // Assert
      expect(results).toHaveLength(0);
    });
  });

  describe('findByRecurringEventIdAndDateRange', () => {
    it('should find instances that overlap with date range', async () => {
      // Arrange
      const recurringEventRepo = dataSource.getRepository(RecurringEventEntity);
      const recurringEvent = await recurringEventRepo.save({
        id: generateRandomNumbers(),
        userId: testUserId,
        title: 'Recurring Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
        recurrenceType: 'WEEKLY',
        recurrenceInterval: 1,
        noEndDate: false,
        rruleString: 'FREQ=WEEKLY;INTERVAL=1',
      });

      const dates = [
        new Date('2024-01-10T00:00:00Z'),
        new Date('2024-01-15T00:00:00Z'),
        new Date('2024-01-20T00:00:00Z'),
        new Date('2024-01-25T00:00:00Z'),
        new Date('2024-02-01T00:00:00Z'),
      ];

      for (const date of dates) {
        await target.create({
          userId: testUserId,
          recurringEventId: recurringEvent.id,
          instanceDate: date,
          title: 'Recurring Event',
          startDate: new Date(date.getTime() + 10 * 60 * 60 * 1000),
          endDate: new Date(date.getTime() + 11 * 60 * 60 * 1000),
        });
      }

      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-25T23:59:59Z');

      // Act
      const results = await target.findByRecurringEventIdAndDateRange(
        recurringEvent.id,
        startDate,
        endDate
      );

      // Assert
      expect(results.length).toBe(3);
      expect(results.every(r => r.recurringEventId === recurringEvent.id)).toBe(
        true
      );

      const resultDates = results.map(r => {
        const date = r.instanceDate;
        if (date instanceof Date) {
          return date.toISOString().split('T')[0];
        }
        return date;
      });

      expect(resultDates).toContain('2024-01-14');
      expect(resultDates).toContain('2024-01-19');
      expect(resultDates).toContain('2024-01-24');
      expect(resultDates).not.toContain('2024-01-10');
      expect(resultDates).not.toContain('2024-02-01');
    });

    it('should return instances ordered by start date ascending', async () => {
      // Arrange
      const recurringEventRepo = dataSource.getRepository(RecurringEventEntity);
      const recurringEvent = await recurringEventRepo.save({
        id: generateRandomNumbers(),
        userId: testUserId,
        title: 'Recurring Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
        recurrenceType: 'WEEKLY',
        recurrenceInterval: 1,
        noEndDate: false,
        rruleString: 'FREQ=WEEKLY;INTERVAL=1',
      });

      const dates = [
        new Date('2024-01-10T00:00:00Z'),
        new Date('2024-01-15T00:00:00Z'),
        new Date('2024-01-20T00:00:00Z'),
        new Date('2024-01-25T00:00:00Z'),
      ];

      for (const date of dates) {
        await target.create({
          userId: testUserId,
          recurringEventId: recurringEvent.id,
          instanceDate: date,
          title: 'Recurring Event',
          startDate: new Date(date.getTime() + 10 * 60 * 60 * 1000),
          endDate: new Date(date.getTime() + 11 * 60 * 60 * 1000),
        });
      }

      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-25T23:59:59Z');

      // Act
      const results = await target.findByRecurringEventIdAndDateRange(
        recurringEvent.id,
        startDate,
        endDate
      );

      // Assert
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].startDate.getTime()).toBeLessThanOrEqual(
          results[i + 1].startDate.getTime()
        );
      }
    });
  });

  describe('findByIdOnly', () => {
    it('should find event by ID without user check', async () => {
      // Arrange
      const created = await target.create({
        userId: testUserId,
        title: 'Test Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
      });

      // Act
      const result = await target.findByIdOnly(created.id);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.title).toBe('Test Event');
    });

    it('should return null when event does not exist', async () => {
      // Arrange
      const nonExistentId = generateRandomNumbers();

      // Act
      const result = await target.findByIdOnly(nonExistentId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find event by ID and user ID', async () => {
      // Arrange
      const created = await target.create({
        userId: testUserId,
        title: 'Test Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
      });

      // Act
      const result = await target.findById(created.id, testUserId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(created.id);
      expect(result?.userId).toBe(testUserId);
    });

    it('should return null when event does not exist', async () => {
      // Arrange
      const nonExistentId = generateRandomNumbers();

      // Act
      const result = await target.findById(nonExistentId, testUserId);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when event belongs to different user', async () => {
      // Arrange
      const created = await target.create({
        userId: testUserId,
        title: 'Test Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
      });

      const otherUserId = generateRandomNumbers();

      // Act
      const result = await target.findById(created.id, otherUserId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update an existing event', async () => {
      // Arrange
      const created = await target.create({
        userId: testUserId,
        title: 'Original Title',
        description: 'Original Description',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
      });

      const updates: Partial<CalendarEvent> = {
        title: 'Updated Title',
        description: 'Updated Description',
      };

      // Act
      const result = await target.update(created.id, testUserId, updates);

      // Assert
      expect(result.id).toBe(created.id);
      expect(result.title).toBe('Updated Title');
      expect(result.description).toBe('Updated Description');
      expect(result.startDate).toEqual(created.startDate);
      expect(result.endDate).toEqual(created.endDate);
    });

    it('should throw error when event does not exist', async () => {
      // Arrange
      const nonExistentId = generateRandomNumbers();
      const updates: Partial<CalendarEvent> = {
        title: 'Updated Title',
      };

      // Act & Assert
      await expect(
        target.update(nonExistentId, testUserId, updates)
      ).rejects.toThrow('Calendar event not found');
    });

    it('should throw error when event belongs to different user', async () => {
      // Arrange
      const created = await target.create({
        userId: testUserId,
        title: 'Test Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
      });

      const otherUserId = generateRandomNumbers();
      const updates: Partial<CalendarEvent> = {
        title: 'Updated Title',
      };

      // Verify the event exists with the original userId
      const existingEvent = await target.findById(created.id, testUserId);
      expect(existingEvent).not.toBeNull();
      expect(existingEvent?.userId).toBe(testUserId);

      // Verify the event is NOT found with the other userId
      const eventWithOtherUser = await target.findById(created.id, otherUserId);
      expect(eventWithOtherUser).toBeNull();

      // Act & Assert
      await expect(
        target.update(created.id, otherUserId, updates)
      ).rejects.toThrow('Calendar event not found');
    });
  });

  describe('delete', () => {
    it('should delete an existing event', async () => {
      // Arrange
      const created = await target.create({
        userId: testUserId,
        title: 'Test Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
      });

      // Act
      await target.delete(created.id, testUserId);

      // Assert
      const result = await target.findById(created.id, testUserId);
      expect(result).toBeNull();
    });

    it('should throw error when event does not exist', async () => {
      // Arrange
      const nonExistentId = generateRandomNumbers();

      // Act & Assert
      await expect(target.delete(nonExistentId, testUserId)).rejects.toThrow(
        'Calendar event not found'
      );
    });

    it('should throw error when event belongs to different user', async () => {
      // Arrange
      const created = await target.create({
        userId: testUserId,
        title: 'Test Event',
        startDate: new Date('2024-01-15T10:00:00Z'),
        endDate: new Date('2024-01-15T11:00:00Z'),
      });

      const otherUserId = generateRandomNumbers();

      // Act & Assert
      await expect(target.delete(created.id, otherUserId)).rejects.toThrow(
        'Calendar event not found'
      );
    });
  });
});
