import { Test, TestingModule } from '@nestjs/testing';
import { ReminderScheduler } from '../reminder.scheduler';
import { EventReminderRepository } from '../../../../infra/repositories/event-reminder.repository';
import { CalendarEventRepository } from '../../../../infra/repositories/calendar-event.repository';
import { UserAggregator } from '../../../../../users/domain/aggregators/user.aggregator';
import { EmailService } from '../../../../../shared-kernel/domain/services/email.service';
import { EventReminder } from '../../../../domain/entities/event-reminder.entity';
import { CalendarEvent } from '../../../../domain/entities/calendar-event.entity';
import {
  LATE_DELIVERY_GRACE_MINUTES,
  MAX_REMINDER_MINUTES,
} from '../../../../domain/reminder.constants';
import { createMock } from 'src/shared-kernel/test-utils';

describe('ReminderScheduler', () => {
  let target: ReminderScheduler;
  let mockEventReminderRepository: jest.Mocked<EventReminderRepository>;
  let mockCalendarEventRepository: jest.Mocked<CalendarEventRepository>;
  let mockUserAggregator: jest.Mocked<UserAggregator>;
  let mockEmailService: jest.Mocked<EmailService>;

  const NOW = new Date('2024-06-01T12:00:00Z');
  const USER_ID = 7;
  const EVENT_ID = 42;
  const REMINDER_MINUTES = 30;

  /** Builds an event whose reminder is due `lateByMinutes` minutes ago. */
  const buildEvent = (lateByMinutes: number): CalendarEvent => ({
    id: EVENT_ID,
    calendarId: 1,
    userId: USER_ID,
    title: 'Team Meeting',
    startDate: new Date(
      NOW.getTime() + REMINDER_MINUTES * 60 * 1000 - lateByMinutes * 60 * 1000
    ),
    endDate: new Date(NOW.getTime() + 90 * 60 * 1000),
    createdAt: NOW,
    updatedAt: NOW,
  });

  const reminder: EventReminder = {
    id: 1,
    calendarEventId: EVENT_ID,
    reminderMinutes: REMINDER_MINUTES,
    createdAt: NOW,
    updatedAt: NOW,
  };

  const runWith = async (event: CalendarEvent) => {
    mockEventReminderRepository.findDueCandidates.mockResolvedValue([reminder]);
    mockCalendarEventRepository.findByIdsOnly.mockResolvedValue([event]);
    await target.handleReminderCron();
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);

    mockEventReminderRepository = createMock<EventReminderRepository>({
      findDueCandidates: jest.fn(),
      markAsSent: jest.fn(),
    });
    mockCalendarEventRepository = createMock<CalendarEventRepository>({
      findByIdsOnly: jest.fn(),
    });
    mockUserAggregator = createMock<UserAggregator>({
      findUsernameById: jest.fn().mockResolvedValue('user@example.com'),
    });
    mockEmailService = createMock<EmailService>({
      sendReminderEmail: jest.fn().mockResolvedValue(undefined),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderScheduler,
        {
          provide: EventReminderRepository,
          useValue: mockEventReminderRepository,
        },
        {
          provide: CalendarEventRepository,
          useValue: mockCalendarEventRepository,
        },
        { provide: UserAggregator, useValue: mockUserAggregator },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    target = module.get<ReminderScheduler>(ReminderScheduler);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('query bounds', () => {
    it('should scan only events that could plausibly have a due reminder', async () => {
      mockEventReminderRepository.findDueCandidates.mockResolvedValue([]);

      await target.handleReminderCron();

      expect(
        mockEventReminderRepository.findDueCandidates
      ).toHaveBeenCalledWith(
        new Date(NOW.getTime() - LATE_DELIVERY_GRACE_MINUTES * 60 * 1000),
        new Date(NOW.getTime() + MAX_REMINDER_MINUTES * 60 * 1000)
      );
    });

    it('should not look up any events when nothing is pending', async () => {
      mockEventReminderRepository.findDueCandidates.mockResolvedValue([]);

      await target.handleReminderCron();

      expect(mockCalendarEventRepository.findByIdsOnly).not.toHaveBeenCalled();
    });

    it('should fetch all events in one query rather than one per reminder', async () => {
      const second: EventReminder = { ...reminder, id: 2, reminderMinutes: 15 };
      mockEventReminderRepository.findDueCandidates.mockResolvedValue([
        reminder,
        second,
      ]);
      mockCalendarEventRepository.findByIdsOnly.mockResolvedValue([
        buildEvent(0),
      ]);

      await target.handleReminderCron();

      expect(mockCalendarEventRepository.findByIdsOnly).toHaveBeenCalledTimes(
        1
      );
      expect(mockCalendarEventRepository.findByIdsOnly).toHaveBeenCalledWith([
        EVENT_ID,
      ]);
    });
  });

  describe('delivery window', () => {
    it('should send a reminder that is due now', async () => {
      await runWith(buildEvent(0));

      expect(mockEmailService.sendReminderEmail).toHaveBeenCalledWith(
        'user@example.com',
        'Team Meeting',
        expect.any(Date),
        REMINDER_MINUTES,
        false
      );
      expect(mockEventReminderRepository.markAsSent).toHaveBeenCalledWith(1);
    });

    it('should not send a reminder that is not due yet', async () => {
      await runWith(buildEvent(-10));

      expect(mockEmailService.sendReminderEmail).not.toHaveBeenCalled();
      expect(mockEventReminderRepository.markAsSent).not.toHaveBeenCalled();
    });

    it('should still send a reminder missed within the grace period', async () => {
      await runWith(buildEvent(LATE_DELIVERY_GRACE_MINUTES - 1));

      expect(mockEmailService.sendReminderEmail).toHaveBeenCalled();
      expect(mockEventReminderRepository.markAsSent).toHaveBeenCalledWith(1);
    });

    it('should flag a late delivery so the email can explain itself', async () => {
      await runWith(buildEvent(10));

      expect(mockEmailService.sendReminderEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Date),
        REMINDER_MINUTES,
        true
      );
    });

    it('should retire a reminder past the grace period without emailing', async () => {
      await runWith(buildEvent(LATE_DELIVERY_GRACE_MINUTES + 5));

      expect(mockEmailService.sendReminderEmail).not.toHaveBeenCalled();
      expect(mockEventReminderRepository.markAsSent).toHaveBeenCalledWith(1);
    });
  });

  describe('failure handling', () => {
    it('should not mark as sent when the email fails, so the next tick retries', async () => {
      mockEmailService.sendReminderEmail.mockRejectedValue(
        new Error('SMTP down')
      );

      await runWith(buildEvent(0));

      expect(mockEventReminderRepository.markAsSent).not.toHaveBeenCalled();
    });

    it('should skip a user whose username is not an email address', async () => {
      mockUserAggregator.findUsernameById.mockResolvedValue('not-an-email');

      await runWith(buildEvent(0));

      expect(mockEmailService.sendReminderEmail).not.toHaveBeenCalled();
      expect(mockEventReminderRepository.markAsSent).not.toHaveBeenCalled();
    });

    it('should skip a reminder whose user cannot be found', async () => {
      mockUserAggregator.findUsernameById.mockResolvedValue(null);

      await runWith(buildEvent(0));

      expect(mockEmailService.sendReminderEmail).not.toHaveBeenCalled();
    });

    it('should keep processing other reminders when one throws', async () => {
      const second: EventReminder = { ...reminder, id: 2 };
      mockEventReminderRepository.findDueCandidates.mockResolvedValue([
        reminder,
        second,
      ]);
      mockCalendarEventRepository.findByIdsOnly.mockResolvedValue([
        buildEvent(0),
      ]);
      mockEmailService.sendReminderEmail
        .mockRejectedValueOnce(new Error('SMTP down'))
        .mockResolvedValueOnce(undefined);

      await target.handleReminderCron();

      expect(mockEventReminderRepository.markAsSent).toHaveBeenCalledTimes(1);
      expect(mockEventReminderRepository.markAsSent).toHaveBeenCalledWith(2);
    });

    it('should not throw when the repository query fails', async () => {
      mockEventReminderRepository.findDueCandidates.mockRejectedValue(
        new Error('db gone')
      );

      await expect(target.handleReminderCron()).resolves.toBeUndefined();
    });
  });
});
