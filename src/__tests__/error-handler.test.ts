import { Pool } from 'pg';
import { ErrorHandler } from '../services/ErrorHandler';
import {
  ApplicationError,
  AuthorizationError,
  ValidationError,
  ScopeViolationError,
  ExpiredAuthorizationError,
  ErrorSeverity,
  ErrorCategory,
} from '../utils/errors';

// Mock dependencies
jest.mock('../utils/logger');
jest.mock('../services/AuditLogger');

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockPool: Pool;

  beforeEach(() => {
    mockPool = {} as Pool;
    errorHandler = new ErrorHandler(mockPool, {
      logToAudit: false,
      notifyAdmins: false,
      includeStackTrace: false,
    });
  });

  describe('handleError', () => {
    test('should handle ApplicationError and return error response', async () => {
      const error = new AuthorizationError('Not authorized', 'auth-123');
      const response = await errorHandler.handleError(error, 'req-123');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('AUTHORIZATION_ERROR');
      expect(response.error.message).toBe('Not authorized');
      expect(response.requestId).toBe('req-123');
      expect(response.timestamp).toBeInstanceOf(Date);
    });

    test('should handle generic Error and return safe response', async () => {
      const error = new Error('Internal error');
      const response = await errorHandler.handleError(error);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(response.error.message).toContain('حدث خطأ غير متوقع');
    });

    test('should include requestId in response', async () => {
      const error = new ValidationError('Invalid input');
      const response = await errorHandler.handleError(error, 'req-456');

      expect(response.requestId).toBe('req-456');
    });
  });

  describe('Safe Error Messages', () => {
    test('should return generic message for critical errors', async () => {
      const error = new ApplicationError(
        'Database connection failed',
        500,
        'DB_ERROR',
        ErrorSeverity.CRITICAL,
        ErrorCategory.DATABASE
      );

      const response = await errorHandler.handleError(error);

      expect(response.error.message).toBe('حدث خطأ خطير. تم إشعار فريق الدعم.');
    });

    test('should return original message for non-critical errors', async () => {
      const error = new ValidationError('Email is required', 'email');
      const response = await errorHandler.handleError(error);

      expect(response.error.message).toBe('Email is required');
    });

    test('should include safe details for validation errors', async () => {
      const error = new ValidationError('Invalid email format', 'email', 'invalid@');
      const response = await errorHandler.handleError(error);

      expect(response.error.details).toBeDefined();
      expect(response.error.details.field).toBe('email');
    });

    test('should include safe details for scope violation errors', async () => {
      const error = new ScopeViolationError(
        'Target out of scope',
        'example.com',
        { domains: ['allowed.com'] }
      );

      const response = await errorHandler.handleError(error);

      expect(response.error.details).toBeDefined();
      expect(response.error.details.target).toBe('example.com');
    });

    test('should include safe details for expired authorization errors', async () => {
      const expiredDate = new Date('2024-01-01');
      const error = new ExpiredAuthorizationError(
        'Authorization expired',
        'auth-123',
        expiredDate
      );

      const response = await errorHandler.handleError(error);

      expect(response.error.details).toBeDefined();
      expect(response.error.details.expiredAt).toBe(expiredDate);
    });

    test('should not expose sensitive information in error details', async () => {
      const error = new ApplicationError(
        'Database query failed: SELECT * FROM users WHERE password = "secret"',
        500,
        'DB_ERROR',
        ErrorSeverity.CRITICAL,
        ErrorCategory.DATABASE,
        {
          query: 'SELECT * FROM users WHERE password = "secret"',
          connectionString: 'postgresql://user:pass@localhost/db',
        }
      );

      const response = await errorHandler.handleError(error);

      // Should not include database query or connection string
      expect(response.error.details).toBeUndefined();
      expect(response.error.message).not.toContain('SELECT');
      expect(response.error.message).not.toContain('password');
    });
  });

  describe('Error Response Structure', () => {
    test('should have correct structure for ApplicationError', async () => {
      const error = new AuthorizationError('Not authorized');
      const response = await errorHandler.handleError(error);

      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response).toHaveProperty('timestamp');
    });

    test('should have correct structure for generic Error', async () => {
      const error = new Error('Something went wrong');
      const response = await errorHandler.handleError(error);

      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code', 'INTERNAL_SERVER_ERROR');
      expect(response.error).toHaveProperty('message');
      expect(response).toHaveProperty('timestamp');
    });
  });

  describe('Error Codes', () => {
    test('should return correct error code for AuthorizationError', async () => {
      const error = new AuthorizationError();
      const response = await errorHandler.handleError(error);

      expect(response.error.code).toBe('AUTHORIZATION_ERROR');
    });

    test('should return correct error code for ValidationError', async () => {
      const error = new ValidationError();
      const response = await errorHandler.handleError(error);

      expect(response.error.code).toBe('VALIDATION_ERROR');
    });

    test('should return correct error code for ScopeViolationError', async () => {
      const error = new ScopeViolationError();
      const response = await errorHandler.handleError(error);

      expect(response.error.code).toBe('SCOPE_VIOLATION');
    });

    test('should return correct error code for ExpiredAuthorizationError', async () => {
      const error = new ExpiredAuthorizationError();
      const response = await errorHandler.handleError(error);

      expect(response.error.code).toBe('EXPIRED_AUTHORIZATION');
    });
  });

  describe('Edge Cases', () => {
    test('should handle error without message', async () => {
      const error = new Error();
      const response = await errorHandler.handleError(error);

      expect(response.error.message).toBeDefined();
      expect(typeof response.error.message).toBe('string');
    });

    test('should handle error with very long message', async () => {
      const longMessage = 'A'.repeat(10000);
      const error = new ValidationError(longMessage);
      const response = await errorHandler.handleError(error);

      expect(response.error.message).toBe(longMessage);
    });

    test('should handle error with special characters in message', async () => {
      const message = 'Error: <script>alert("xss")</script>';
      const error = new ValidationError(message);
      const response = await errorHandler.handleError(error);

      expect(response.error.message).toBe(message);
    });

    test('should handle error with unicode characters', async () => {
      const message = 'خطأ في المصادقة 🔒';
      const error = new AuthorizationError(message);
      const response = await errorHandler.handleError(error);

      expect(response.error.message).toBe(message);
    });
  });

  describe('Timestamp', () => {
    test('should include current timestamp in response', async () => {
      const before = new Date();
      const error = new ValidationError('Test error');
      const response = await errorHandler.handleError(error);
      const after = new Date();

      expect(response.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(response.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});
