import { RetryPolicy, createRetryPolicy, withRetry, defaultRetryPolicy } from '../services/RetryPolicy';
import { ExternalServiceError, NetworkError } from '../utils/errors';

describe('RetryPolicy', () => {
  describe('Basic Functionality', () => {
    test('should succeed on first attempt', async () => {
      const policy = new RetryPolicy();
      const operation = jest.fn().mockResolvedValue('success');

      const result = await policy.execute(operation, 'test-operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry on retryable error and eventually succeed', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 3,
        initialDelay: 10,
      });

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('Connection failed'))
        .mockRejectedValueOnce(new NetworkError('Connection failed'))
        .mockResolvedValue('success');

      const result = await policy.execute(operation, 'test-operation');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should throw error after max attempts', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 3,
        initialDelay: 10,
      });

      const error = new NetworkError('Persistent failure');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(policy.execute(operation, 'test-operation')).rejects.toThrow(
        'Persistent failure'
      );

      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should not retry on non-retryable error', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 3,
        initialDelay: 10,
      });

      const error = new Error('Non-retryable error');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(policy.execute(operation, 'test-operation')).rejects.toThrow(
        'Non-retryable error'
      );

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('Retryable Errors', () => {
    test('should retry on ExternalServiceError', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 2,
        initialDelay: 10,
      });

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new ExternalServiceError('Service unavailable'))
        .mockResolvedValue('success');

      const result = await policy.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should retry on NetworkError', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 2,
        initialDelay: 10,
      });

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('Network timeout'))
        .mockResolvedValue('success');

      const result = await policy.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should retry on ECONNREFUSED error', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 2,
        initialDelay: 10,
      });

      const error = new Error('ECONNREFUSED: Connection refused');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await policy.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should retry on ETIMEDOUT error', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 2,
        initialDelay: 10,
      });

      const error = new Error('ETIMEDOUT: Operation timed out');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await policy.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should retry on socket hang up error', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 2,
        initialDelay: 10,
      });

      const error = new Error('socket hang up');
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      const result = await policy.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Backoff Strategies', () => {
    test('should use linear backoff strategy', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 3,
        backoffStrategy: 'LINEAR',
        initialDelay: 100,
      });

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('Fail 1'))
        .mockRejectedValueOnce(new NetworkError('Fail 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await policy.execute(operation);
      const duration = Date.now() - startTime;

      // Linear: 100ms + 200ms = 300ms (plus jitter)
      expect(duration).toBeGreaterThanOrEqual(250);
      expect(duration).toBeLessThan(500);
    });

    test('should use exponential backoff strategy', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 3,
        backoffStrategy: 'EXPONENTIAL',
        initialDelay: 100,
      });

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('Fail 1'))
        .mockRejectedValueOnce(new NetworkError('Fail 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await policy.execute(operation);
      const duration = Date.now() - startTime;

      // Exponential: 100ms + 200ms = 300ms (plus jitter)
      expect(duration).toBeGreaterThanOrEqual(250);
      expect(duration).toBeLessThan(500);
    });

    test('should respect max delay', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 5,
        backoffStrategy: 'EXPONENTIAL',
        initialDelay: 1000,
        maxDelay: 2000,
      });

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('Fail 1'))
        .mockRejectedValueOnce(new NetworkError('Fail 2'))
        .mockRejectedValueOnce(new NetworkError('Fail 3'))
        .mockRejectedValueOnce(new NetworkError('Fail 4'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await policy.execute(operation);
      const duration = Date.now() - startTime;

      // Should not exceed maxDelay * attempts
      expect(duration).toBeLessThan(10000);
    });
  });

  describe('Configuration', () => {
    test('should use default configuration', () => {
      const policy = new RetryPolicy();
      const config = policy.getConfig();

      expect(config.maxAttempts).toBe(defaultRetryPolicy.maxAttempts);
      expect(config.backoffStrategy).toBe(defaultRetryPolicy.backoffStrategy);
      expect(config.initialDelay).toBe(defaultRetryPolicy.initialDelay);
      expect(config.maxDelay).toBe(defaultRetryPolicy.maxDelay);
    });

    test('should merge custom configuration with defaults', () => {
      const policy = new RetryPolicy({
        maxAttempts: 5,
      });
      const config = policy.getConfig();

      expect(config.maxAttempts).toBe(5);
      expect(config.backoffStrategy).toBe(defaultRetryPolicy.backoffStrategy);
    });

    test('should update configuration', () => {
      const policy = new RetryPolicy();
      
      policy.updateConfig({
        maxAttempts: 10,
        initialDelay: 500,
      });

      const config = policy.getConfig();
      expect(config.maxAttempts).toBe(10);
      expect(config.initialDelay).toBe(500);
    });
  });

  describe('Helper Functions', () => {
    test('createRetryPolicy should create a new instance', () => {
      const policy = createRetryPolicy({
        maxAttempts: 5,
      });

      expect(policy).toBeInstanceOf(RetryPolicy);
      expect(policy.getConfig().maxAttempts).toBe(5);
    });

    test('withRetry should execute operation with default policy', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('Fail'))
        .mockResolvedValue('success');

      const result = await withRetry(operation, 'test-op');

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Edge Cases', () => {
    test('should handle operation that returns undefined', async () => {
      const policy = new RetryPolicy();
      const operation = jest.fn().mockResolvedValue(undefined);

      const result = await policy.execute(operation);

      expect(result).toBeUndefined();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should handle operation that returns null', async () => {
      const policy = new RetryPolicy();
      const operation = jest.fn().mockResolvedValue(null);

      const result = await policy.execute(operation);

      expect(result).toBeNull();
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should handle operation that returns complex object', async () => {
      const policy = new RetryPolicy();
      const complexObject = { data: [1, 2, 3], nested: { value: 'test' } };
      const operation = jest.fn().mockResolvedValue(complexObject);

      const result = await policy.execute(operation);

      expect(result).toEqual(complexObject);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should handle maxAttempts of 1', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 1,
      });

      const error = new NetworkError('Fail');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(policy.execute(operation)).rejects.toThrow('Fail');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should handle very large maxAttempts', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 100,
        initialDelay: 1,
      });

      const operation = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('Fail'))
        .mockResolvedValue('success');

      const result = await policy.execute(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle email service retry', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 3,
        initialDelay: 50,
      });

      const sendEmail = jest
        .fn()
        .mockRejectedValueOnce(new ExternalServiceError('SMTP timeout'))
        .mockRejectedValueOnce(new ExternalServiceError('SMTP connection refused'))
        .mockResolvedValue({ messageId: '123', status: 'sent' });

      const result = await policy.execute(sendEmail, 'send-email');

      expect(result).toEqual({ messageId: '123', status: 'sent' });
      expect(sendEmail).toHaveBeenCalledTimes(3);
    });

    test('should handle database connection retry', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 3,
        initialDelay: 50,
      });

      const dbQuery = jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue([{ id: 1, name: 'test' }]);

      const result = await policy.execute(dbQuery, 'db-query');

      expect(result).toEqual([{ id: 1, name: 'test' }]);
      expect(dbQuery).toHaveBeenCalledTimes(2);
    });

    test('should handle API call retry', async () => {
      const policy = new RetryPolicy({
        maxAttempts: 3,
        initialDelay: 50,
      });

      const apiCall = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('timeout'))
        .mockResolvedValue({ data: 'response' });

      const result = await policy.execute(apiCall, 'api-call');

      expect(result).toEqual({ data: 'response' });
      expect(apiCall).toHaveBeenCalledTimes(2);
    });
  });
});
