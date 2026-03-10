import { Logger } from 'nestjs-pino';
import { DataSource, EntityManager } from 'typeorm';

export const generateRandomNumbers = (min: number = 0, max: number = 20) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const createMock = <T>(overrides: Partial<T> = {}): jest.Mocked<T> =>
  overrides as unknown as jest.Mocked<T>;

export const createMockWithApply = <T>(
  overrides: Partial<T> = {}
): jest.Mocked<T> => {
  return {
    apply: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<T>;
};

export const createLoggerMock = () =>
  createMock<Logger>({
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  });

type MockScriptConfig<T = any> = {
  script: { apply: jest.MockInstance<any, any> | jest.Mock };
  return?: T;
  error?: Error;
};

/**
 * Sets up a transaction mock for testing.
 * Creates a mock EntityManager and configures the DataSource.transaction mock
 * to call the callback with the mock manager.
 *
 * @param mockDataSource - The mocked DataSource instance
 * @param mockConfigs - Optional array of mock configurations for transaction scripts
 * @returns The mock EntityManager that will be passed to the transaction callback
 *
 * @example
 * ```typescript
 * // With successful returns
 * const mockManager = setupTransactionMock(mockDataSource, [
 *   { script: mockCreateEventScript, return: mockEvent },
 *   { script: mockCreateReminderScript, return: mockReminder },
 * ]);
 *
 * // With error
 * const mockManager = setupTransactionMock(mockDataSource, [
 *   { script: mockCreateEventScript, return: mockEvent },
 *   { script: mockCreateReminderScript, error: new Error('Failed') },
 * ]);
 * ```
 */
export const setupTransactionMock = (
  mockDataSource: jest.Mocked<DataSource>,
  mockConfigs?: MockScriptConfig[]
): jest.Mocked<EntityManager> => {
  const mockManager = createMock<EntityManager>();
  (mockDataSource.transaction as jest.Mock).mockImplementation(
    async callback => {
      if (mockConfigs) {
        for (const config of mockConfigs) {
          if (config.error) {
            config.script.apply.mockRejectedValue(config.error);
          } else if (config.return !== undefined) {
            config.script.apply.mockResolvedValue(config.return);
          }
        }
      }
      return await callback(mockManager);
    }
  );
  return mockManager;
};
