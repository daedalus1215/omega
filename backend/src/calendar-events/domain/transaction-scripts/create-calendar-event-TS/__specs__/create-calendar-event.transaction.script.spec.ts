import { Test, TestingModule } from '@nestjs/testing';
import { CreateCalendarEventTransactionScript } from '../create-calendar-event.transaction.script';
import { CalendarEventRepository } from '../../../../infra/repositories/calendar-event.repository';
import { CreateCalendarEventCommand } from '../create-calendar-event.command';
import { CalendarEvent } from '../../../../domain/entities/calendar-event.entity';
import {
  generateRandomNumbers,
  createMock,
} from 'src/shared-kernel/test-utils';
import { EntityManager } from 'typeorm';

describe('CreateCalendarEventTransactionScript', () => {
  let target: CreateCalendarEventTransactionScript;
  let mockCalendarEventRepository: jest.Mocked<CalendarEventRepository>;

  const mockUser = {
    userId: generateRandomNumbers(),
    username: 'testuser',
  };

  const validCommand: CreateCalendarEventCommand = {
    title: 'Team Meeting',
    description: 'Weekly standup',
    startDate: new Date('2024-01-15T10:00:00Z'),
    endDate: new Date('2024-01-15T11:00:00Z'),
    user: mockUser,
  };

  beforeEach(async () => {
    mockCalendarEventRepository = createMock<CalendarEventRepository>({
      create: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCalendarEventTransactionScript,
        {
          provide: CalendarEventRepository,
          useValue: mockCalendarEventRepository,
        },
      ],
    }).compile();

    target = module.get<CreateCalendarEventTransactionScript>(
      CreateCalendarEventTransactionScript
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('apply', () => {
    it('should create a calendar event with valid command', async () => {
      const mockEvent: CalendarEvent = {
        id: generateRandomNumbers(),
        userId: mockUser.userId,
        title: validCommand.title,
        description: validCommand.description,
        startDate: validCommand.startDate,
        endDate: validCommand.endDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCalendarEventRepository.create.mockResolvedValue(mockEvent);

      const result = await target.apply(validCommand);

      expect(result).toEqual(mockEvent);
      expect(mockCalendarEventRepository.create).toHaveBeenCalledWith(
        {
          userId: mockUser.userId,
          title: validCommand.title,
          description: validCommand.description,
          startDate: validCommand.startDate,
          endDate: validCommand.endDate,
        },
        undefined
      );
    });

    it('should trim title and description', async () => {
      const commandWithWhitespace: CreateCalendarEventCommand = {
        ...validCommand,
        title: '  Team Meeting  ',
        description: '  Weekly standup  ',
      };

      const mockEvent: CalendarEvent = {
        id: generateRandomNumbers(),
        userId: mockUser.userId,
        title: 'Team Meeting',
        description: 'Weekly standup',
        startDate: validCommand.startDate,
        endDate: validCommand.endDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCalendarEventRepository.create.mockResolvedValue(mockEvent);

      await target.apply(commandWithWhitespace);

      expect(mockCalendarEventRepository.create).toHaveBeenCalledWith(
        {
          userId: mockUser.userId,
          title: 'Team Meeting',
          description: 'Weekly standup',
          startDate: validCommand.startDate,
          endDate: validCommand.endDate,
        },
        undefined
      );
    });

    it('should pass EntityManager when provided', async () => {
      const mockManager = createMock<EntityManager>();
      const mockEvent: CalendarEvent = {
        id: generateRandomNumbers(),
        userId: mockUser.userId,
        title: validCommand.title,
        description: validCommand.description,
        startDate: validCommand.startDate,
        endDate: validCommand.endDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCalendarEventRepository.create.mockResolvedValue(mockEvent);

      await target.apply(validCommand, mockManager);

      expect(mockCalendarEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.userId,
          title: validCommand.title,
        }),
        mockManager
      );
    });

    it('should throw error when title is empty', async () => {
      const invalidCommand: CreateCalendarEventCommand = {
        ...validCommand,
        title: '',
      };

      await expect(target.apply(invalidCommand)).rejects.toThrow(
        'Title is required'
      );
      expect(mockCalendarEventRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when title is only whitespace', async () => {
      const invalidCommand: CreateCalendarEventCommand = {
        ...validCommand,
        title: '   ',
      };

      await expect(target.apply(invalidCommand)).rejects.toThrow(
        'Title is required'
      );
      expect(mockCalendarEventRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when title exceeds 255 characters', async () => {
      const invalidCommand: CreateCalendarEventCommand = {
        ...validCommand,
        title: 'a'.repeat(256),
      };

      await expect(target.apply(invalidCommand)).rejects.toThrow(
        'Title cannot exceed 255 characters'
      );
      expect(mockCalendarEventRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when end date is before start date', async () => {
      const invalidCommand: CreateCalendarEventCommand = {
        ...validCommand,
        startDate: new Date('2024-01-15T11:00:00Z'),
        endDate: new Date('2024-01-15T10:00:00Z'),
      };

      await expect(target.apply(invalidCommand)).rejects.toThrow(
        'End date must be after start date'
      );
      expect(mockCalendarEventRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when end date equals start date', async () => {
      const sameDate = new Date('2024-01-15T10:00:00Z');
      const invalidCommand: CreateCalendarEventCommand = {
        ...validCommand,
        startDate: sameDate,
        endDate: sameDate,
      };

      await expect(target.apply(invalidCommand)).rejects.toThrow(
        'End date must be after start date'
      );
      expect(mockCalendarEventRepository.create).not.toHaveBeenCalled();
    });

    it('should handle optional description', async () => {
      const commandWithoutDescription: CreateCalendarEventCommand = {
        ...validCommand,
        description: undefined,
      };

      const mockEvent: CalendarEvent = {
        id: generateRandomNumbers(),
        userId: mockUser.userId,
        title: validCommand.title,
        startDate: validCommand.startDate,
        endDate: validCommand.endDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCalendarEventRepository.create.mockResolvedValue(mockEvent);

      await target.apply(commandWithoutDescription);

      expect(mockCalendarEventRepository.create).toHaveBeenCalledWith(
        {
          userId: mockUser.userId,
          title: validCommand.title,
          description: undefined,
          startDate: validCommand.startDate,
          endDate: validCommand.endDate,
        },
        undefined
      );
    });
  });
});
