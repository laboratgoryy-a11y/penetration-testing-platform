import { Pool } from 'pg';
import {
  AuditLogger,
  AuditAccessControl,
  AuditRetentionService,
  AuditorNotificationService,
  ErrorHandler,
} from '../services';
import {
  ApplicationError,
  ErrorSeverity,
  ErrorCategory,
  AuthorizationError,
  ValidationError,
} from '../utils/errors';

// Mock pool for testing
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe('Audit Logging System', () => {
  describe('AuditLogger', () => {
    let auditLogger: AuditLogger;

    beforeEach(() => {
      auditLogger = new AuditLogger(mockPool);
      jest.clearAllMocks();
    });

    test('should log an audit event', async () => {
      const mockResult = {
        rows: [
          {
            id: 'test-id',
            timestamp: new Date(),
            user_id: 'user-123',
            event_type: 'AUTHENTICATION',
            resource: 'login',
            action: 'LOGIN_ATTEMPT',
            result: 'SUCCESS',
            details: null,
            ip_address: '127.0.0.1',
            user_agent: 'test-agent',
          },
        ],
      };

      (mockPool.query as jest.Mock).mockResolvedValue(mockResult);

      const event = {
        userId: 'user-123',
        eventType: 'AUTHENTICATION' as const,
        resource: 'login',
        action: 'LOGIN_ATTEMPT',
        result: 'SUCCESS' as const,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      const result = await auditLogger.logEvent(event);

      expect(result).toBeDefined();
      expect(result.event_type).toBe('AUTHENTICATION');
      expect(mockPool.query).toHaveBeenCalled();
    });

    test('should get event count', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ count: '42' }],
      });

      const count = await auditLogger.getEventCount();

      expect(count).toBe(42);
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('Error Classification', () => {
    test('should create ApplicationError with severity and category', () => {
      const error = new ApplicationError(
        'Test error',
        500,
        'TEST_ERROR',
        ErrorSeverity.ERROR,
        ErrorCategory.SYSTEM
      );

      expect(error.message).toBe('Test error');
      expect(error.severity).toBe(ErrorSeverity.ERROR);
      expect(error.category).toBe(ErrorCategory.SYSTEM);
      expect(error.statusCode).toBe(500);
    });

    test('should create AuthorizationError with correct severity', () => {
      const error = new AuthorizationError('Not authorized', 'auth-123');

      expect(error.severity).toBe(ErrorSeverity.WARNING);
      expect(error.category).toBe(ErrorCategory.AUTHORIZATION);
      expect(error.statusCode).toBe(403);
    });

    test('should create ValidationError with correct severity', () => {
      const error = new ValidationError('Invalid input', 'email', 'invalid@');

      expect(error.severity).toBe(ErrorSeverity.INFO);
      expect(error.category).toBe(ErrorCategory.VALIDATION);
      expect(error.statusCode).toBe(400);
    });

    test('should convert error to log object', () => {
      const error = new ApplicationError(
        'Test error',
        500,
        'TEST_ERROR',
        ErrorSeverity.CRITICAL,
        ErrorCategory.DATABASE,
        { detail: 'test' },
        'user-123'
      );

      const logObject = error.toLogObject();

      expect(logObject.severity).toBe(ErrorSeverity.CRITICAL);
      expect(logObject.category).toBe(ErrorCategory.DATABASE);
      expect(logObject.context).toEqual({ detail: 'test' });
      expect(logObject.userId).toBe('user-123');
      expect(logObject.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('ErrorHandler', () => {
    let errorHandler: ErrorHandler;

    beforeEach(() => {
      errorHandler = new ErrorHandler(mockPool, {
        logToAudit: false, // Disable audit logging for tests
        notifyAdmins: false,
      });
      jest.clearAllMocks();
    });

    test('should handle ApplicationError', async () => {
      const error = new ApplicationError(
        'Test error',
        400,
        'TEST_ERROR',
        ErrorSeverity.WARNING,
        ErrorCategory.VALIDATION
      );

      const response = await errorHandler.handleError(error, 'req-123');

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('TEST_ERROR');
      expect(response.error.message).toBe('Test error');
      expect(response.requestId).toBe('req-123');
    });

    test('should handle unexpected errors with generic message', async () => {
      const error = new Error('Unexpected error');

      const response = await errorHandler.handleError(error);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(response.error.message).toContain('حدث خطأ غير متوقع');
    });

    test('should return safe error message for critical errors', async () => {
      const error = new ApplicationError(
        'Database connection failed',
        500,
        'DB_ERROR',
        ErrorSeverity.CRITICAL,
        ErrorCategory.DATABASE
      );

      const response = await errorHandler.handleError(error);

      expect(response.error.message).toContain('حدث خطأ خطير');
      expect(response.error.message).not.toContain('Database connection');
    });
  });

  describe('AuditAccessControl', () => {
    let accessControl: AuditAccessControl;

    beforeEach(() => {
      accessControl = new AuditAccessControl(mockPool);
      jest.clearAllMocks();
    });

    test('should allow access for auditor role', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'AUDITOR' }],
      });

      const result = await accessControl.checkAccess('user-123', 'READ');

      expect(result.allowed).toBe(true);
      expect(result.userRole).toBe('AUDITOR');
    });

    test('should allow access for admin role', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'ADMIN' }],
      });

      const result = await accessControl.checkAccess('user-123', 'READ');

      expect(result.allowed).toBe(true);
      expect(result.userRole).toBe('ADMIN');
    });

    test('should deny access for non-auditor role', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'PENTESTER' }],
      });

      const result = await accessControl.checkAccess('user-123', 'READ');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('مقتصر على المدققين والمسؤولين');
    });

    test('should only allow admin to delete logs', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'AUDITOR' }],
      });

      const result = await accessControl.checkAccess('user-123', 'DELETE');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('مقتصر على المسؤولين فقط');
    });

    test('should allow admin to delete logs', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'ADMIN' }],
      });

      const result = await accessControl.checkAccess('user-123', 'DELETE');

      expect(result.allowed).toBe(true);
    });
  });

  describe('AuditRetentionService', () => {
    let retentionService: AuditRetentionService;

    beforeEach(() => {
      retentionService = new AuditRetentionService(mockPool, {
        retentionYears: 7,
        encryptArchived: true,
      });
      jest.clearAllMocks();
    });

    test('should get retention statistics', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              total_logs: '1000',
              oldest_log: new Date('2020-01-01'),
              newest_log: new Date(),
              storage_size: '1048576',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '800' }],
        });

      const stats = await retentionService.getRetentionStatistics();

      expect(stats.totalLogs).toBe(1000);
      expect(stats.activeLogs).toBe(800);
      expect(stats.archivedLogs).toBe(200);
      expect(stats.storageSize).toBe(1048576);
    });

    test('should check compliance', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              total_logs: '1000',
              oldest_log: new Date(),
              newest_log: new Date(),
              storage_size: '1048576',
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [{ count: '1000' }],
        });

      const report = await retentionService.checkCompliance();

      expect(report.compliant).toBe(true);
      expect(report.issues).toHaveLength(0);
      expect(report.statistics).toBeDefined();
    });
  });

  describe('AuditorNotificationService', () => {
    let notificationService: AuditorNotificationService;

    beforeEach(() => {
      notificationService = new AuditorNotificationService(mockPool);
      jest.clearAllMocks();
    });

    test('should notify auditors for critical events', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            { id: 'auditor-1', email: 'auditor@test.com' },
            { id: 'admin-1', email: 'admin@test.com' },
          ],
        })
        .mockResolvedValue({ rows: [] });

      const event = {
        eventType: 'SECURITY_VIOLATION' as const,
        resource: 'system',
        action: 'UNAUTHORIZED_ACCESS',
        result: 'FAILURE' as const,
      };

      await notificationService.notifyAuditors(event);

      expect(mockPool.query).toHaveBeenCalled();
    });

    test('should get notifications for auditor', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'AUDITOR' }],
      });

      const notifications = await notificationService.getNotifications('auditor-1');

      expect(Array.isArray(notifications)).toBe(true);
    });
  });

  // Additional unit tests for AuditLogger - Task 16.6
  describe('تسجيل الأحداث', () => {
    let auditLogger: AuditLogger;

    beforeEach(() => {
      auditLogger = new AuditLogger(mockPool);
      jest.clearAllMocks();
    });

    test('should log authentication events', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'event-1',
          timestamp: new Date(),
          user_id: 'user-123',
          event_type: 'AUTHENTICATION',
          resource: 'login',
          action: 'LOGIN_SUCCESS',
          result: 'SUCCESS',
          details: null,
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
        }],
      });

      const event = {
        userId: 'user-123',
        eventType: 'AUTHENTICATION' as const,
        resource: 'login',
        action: 'LOGIN_SUCCESS',
        result: 'SUCCESS' as const,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const result = await auditLogger.logEvent(event);

      expect(result.event_type).toBe('AUTHENTICATION');
      expect(result.action).toBe('LOGIN_SUCCESS');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO audit_logs'),
        expect.arrayContaining(['user-123', 'AUTHENTICATION', 'login', 'LOGIN_SUCCESS', 'SUCCESS'])
      );
    });

    test('should log scan operations', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'event-2',
          timestamp: new Date(),
          user_id: 'user-123',
          event_type: 'SCAN_STARTED',
          resource: 'https://example.com',
          action: 'START_SCAN',
          result: 'SUCCESS',
          details: { scanType: 'WEB_SCAN' },
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
        }],
      });

      const event = {
        userId: 'user-123',
        eventType: 'SCAN_STARTED' as const,
        resource: 'https://example.com',
        action: 'START_SCAN',
        result: 'SUCCESS' as const,
        details: { scanType: 'WEB_SCAN' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const result = await auditLogger.logEvent(event);

      expect(result.event_type).toBe('SCAN_STARTED');
      expect(result.details).toEqual({ scanType: 'WEB_SCAN' });
    });

    test('should log authorization checks', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'event-3',
          timestamp: new Date(),
          user_id: 'user-123',
          event_type: 'AUTHORIZATION_CHECK',
          resource: 'scan-session-123',
          action: 'VALIDATE_AUTHORIZATION',
          result: 'SUCCESS',
          details: { authorizationId: 'auth-123' },
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
        }],
      });

      const event = {
        userId: 'user-123',
        eventType: 'AUTHORIZATION_CHECK' as const,
        resource: 'scan-session-123',
        action: 'VALIDATE_AUTHORIZATION',
        result: 'SUCCESS' as const,
        details: { authorizationId: 'auth-123' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const result = await auditLogger.logEvent(event);

      expect(result.event_type).toBe('AUTHORIZATION_CHECK');
      expect(result.result).toBe('SUCCESS');
    });

    test('should log security violations', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{
          id: 'event-4',
          timestamp: new Date(),
          user_id: 'user-123',
          event_type: 'SECURITY_VIOLATION',
          resource: 'authorization-bypass',
          action: 'BYPASS_ATTEMPT',
          result: 'FAILURE',
          details: { reason: 'Attempted to bypass authorization check' },
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
        }],
      });

      const event = {
        userId: 'user-123',
        eventType: 'SECURITY_VIOLATION' as const,
        resource: 'authorization-bypass',
        action: 'BYPASS_ATTEMPT',
        result: 'FAILURE' as const,
        details: { reason: 'Attempted to bypass authorization check' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const result = await auditLogger.logEvent(event);

      expect(result.event_type).toBe('SECURITY_VIOLATION');
      expect(result.result).toBe('FAILURE');
    });
  });

  describe('البحث في السجلات', () => {
    let auditLogger: AuditLogger;

    beforeEach(() => {
      auditLogger = new AuditLogger(mockPool);
      jest.clearAllMocks();
    });

    test('should search logs by user ID', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'event-1',
            timestamp: new Date(),
            user_id: 'user-123',
            event_type: 'AUTHENTICATION',
            resource: 'login',
            action: 'LOGIN_SUCCESS',
            result: 'SUCCESS',
            details: null,
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
          },
        ],
      });

      const logs = await auditLogger.searchLogs({ userId: 'user-123' });

      expect(logs).toHaveLength(1);
      expect(logs[0].user_id).toBe('user-123');
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1'),
        expect.arrayContaining(['user-123'])
      );
    });

    test('should search logs by event type', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'event-1',
            timestamp: new Date(),
            user_id: 'user-123',
            event_type: 'SCAN_STARTED',
            resource: 'https://example.com',
            action: 'START_SCAN',
            result: 'SUCCESS',
            details: null,
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
          },
        ],
      });

      const logs = await auditLogger.searchLogs({ eventTypes: ['SCAN_STARTED'] });

      expect(logs).toHaveLength(1);
      expect(logs[0].event_type).toBe('SCAN_STARTED');
    });

    test('should search logs by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'event-1',
            timestamp: new Date('2024-01-15'),
            user_id: 'user-123',
            event_type: 'AUTHENTICATION',
            resource: 'login',
            action: 'LOGIN_SUCCESS',
            result: 'SUCCESS',
            details: null,
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
          },
        ],
      });

      const logs = await auditLogger.searchLogs({ startDate, endDate });

      expect(logs).toHaveLength(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('timestamp >= $1 AND timestamp <= $2'),
        expect.arrayContaining([startDate, endDate])
      );
    });

    test('should search logs by result status', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'event-1',
            timestamp: new Date(),
            user_id: 'user-123',
            event_type: 'AUTHENTICATION',
            resource: 'login',
            action: 'LOGIN_ATTEMPT',
            result: 'FAILURE',
            details: null,
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
          },
        ],
      });

      const logs = await auditLogger.searchLogs({ result: 'FAILURE' });

      expect(logs).toHaveLength(1);
      expect(logs[0].result).toBe('FAILURE');
    });

    test('should search logs with multiple criteria', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'event-1',
            timestamp: new Date('2024-01-15'),
            user_id: 'user-123',
            event_type: 'SCAN_STARTED',
            resource: 'https://example.com',
            action: 'START_SCAN',
            result: 'SUCCESS',
            details: null,
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
          },
        ],
      });

      const logs = await auditLogger.searchLogs({
        userId: 'user-123',
        eventTypes: ['SCAN_STARTED'],
        result: 'SUCCESS',
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].user_id).toBe('user-123');
      expect(logs[0].event_type).toBe('SCAN_STARTED');
      expect(logs[0].result).toBe('SUCCESS');
    });
  });

  describe('ضوابط الوصول', () => {
    let accessControl: AuditAccessControl;

    beforeEach(() => {
      accessControl = new AuditAccessControl(mockPool);
      jest.clearAllMocks();
    });

    test('should allow auditor to read logs', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'AUDITOR' }],
      });

      const result = await accessControl.checkAccess('user-123', 'READ');

      expect(result.allowed).toBe(true);
      expect(result.userRole).toBe('AUDITOR');
    });

    test('should allow admin to read logs', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'ADMIN' }],
      });

      const result = await accessControl.checkAccess('user-123', 'READ');

      expect(result.allowed).toBe(true);
      expect(result.userRole).toBe('ADMIN');
    });

    test('should deny pentester access to logs', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'PENTESTER' }],
      });

      const result = await accessControl.checkAccess('user-123', 'READ');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    test('should deny analyst access to logs', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'ANALYST' }],
      });

      const result = await accessControl.checkAccess('user-123', 'READ');

      expect(result.allowed).toBe(false);
    });

    test('should allow auditor to export logs', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'AUDITOR' }],
      });

      const result = await accessControl.checkAccess('user-123', 'EXPORT');

      expect(result.allowed).toBe(true);
    });

    test('should deny auditor from deleting logs', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'AUDITOR' }],
      });

      const result = await accessControl.checkAccess('user-123', 'DELETE');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('مقتصر على المسؤولين فقط');
    });

    test('should allow admin to delete logs', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'role-1', name: 'ADMIN' }],
      });

      const result = await accessControl.checkAccess('user-123', 'DELETE');

      expect(result.allowed).toBe(true);
    });

    test('should log access attempts', async () => {
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'role-1', name: 'PENTESTER' }],
        })
        .mockResolvedValueOnce({ rows: [] });

      await accessControl.checkAccess('user-123', 'READ');

      // Should have logged the access attempt
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });
});
