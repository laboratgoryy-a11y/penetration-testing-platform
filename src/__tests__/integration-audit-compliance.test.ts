/**
 * Integration Tests - Audit and Compliance Workflow
 * 
 * Tests the complete workflow:
 * - Log all operations
 * - Auditor notifications
 * - Generate compliance reports
 * 
 * Requirements: 11.1, 11.2, 11.5
 */

import { Pool } from 'pg';
import { AuditLogger } from '../services/AuditLogger';
import { ReportGenerator } from '../services/ReportGenerator';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { WebScanner } from '../services/WebScanner';
import { EventType, EventResult } from '../models';

// Mock database pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
} as unknown as Pool;

describe('Integration: Audit and Compliance Workflow', () => {
  let auditLogger: AuditLogger;
  let reportGenerator: ReportGenerator;
  let authManager: AuthorizationManager;
  let webScanner: WebScanner;

  const testUserId = 'test-user-123';
  const auditorUserId = 'auditor-123';

  beforeEach(() => {
    jest.clearAllMocks();
    auditLogger = new AuditLogger(mockPool);
    reportGenerator = new ReportGenerator(mockPool, './test-reports');
    authManager = new AuthorizationManager(mockPool);
    webScanner = new WebScanner(mockPool, authManager);
  });

  describe('Complete Workflow: Log Operations → Notify Auditor → Generate Compliance Report', () => {
    it('should log all operations throughout the system', async () => {
      const operations = [
        {
          userId: testUserId,
          eventType: 'AUTHENTICATION' as EventType,
          resource: 'auth/login',
          action: 'LOGIN',
          result: 'SUCCESS' as EventResult,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        },
        {
          userId: testUserId,
          eventType: 'AUTHORIZATION_CHECK' as EventType,
          resource: 'authorization/validate',
          action: 'VALIDATE',
          result: 'SUCCESS' as EventResult,
          details: { authorizationId: 'auth-123' },
        },
        {
          userId: testUserId,
          eventType: 'SCAN_STARTED' as EventType,
          resource: 'https://example.com',
          action: 'START_SCAN',
          result: 'SUCCESS' as EventResult,
          details: { sessionId: 'session-123' },
        },
        {
          userId: testUserId,
          eventType: 'SCAN_COMPLETED' as EventType,
          resource: 'https://example.com',
          action: 'COMPLETE_SCAN',
          result: 'SUCCESS' as EventResult,
          details: { sessionId: 'session-123', vulnerabilitiesFound: 2 },
        },
      ];

      // Log each operation
      for (const operation of operations) {
        (mockPool.query as jest.Mock).mockResolvedValueOnce({
          // INSERT audit_log
          rows: [
            {
              id: `log-${operation.eventType}`,
              timestamp: new Date(),
              user_id: operation.userId,
              event_type: operation.eventType,
              resource: operation.resource,
              action: operation.action,
              result: operation.result,
              details: operation.details || null,
              ip_address: operation.ipAddress || null,
              user_agent: operation.userAgent || null,
            },
          ],
        });

        const logEntry = await auditLogger.logEvent(operation);

        expect(logEntry.id).toBeDefined();
        expect(logEntry.eventType).toBe(operation.eventType);
        expect(logEntry.resource).toBe(operation.resource);
        expect(logEntry.action).toBe(operation.action);
        expect(logEntry.result).toBe(operation.result);
      }

      // Verify all operations were logged
      expect(mockPool.query).toHaveBeenCalledTimes(operations.length);
    });

    it('should search audit logs with criteria', async () => {
      const searchCriteria = {
        userId: testUserId,
        eventTypes: ['SCAN_STARTED', 'SCAN_COMPLETED'] as EventType[],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        result: 'SUCCESS' as EventResult,
      };

      const mockLogs = [
        {
          id: 'log-1',
          timestamp: new Date(),
          user_id: testUserId,
          event_type: 'SCAN_STARTED',
          resource: 'https://example.com',
          action: 'START_SCAN',
          result: 'SUCCESS',
          details: { sessionId: 'session-123' },
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0',
        },
        {
          id: 'log-2',
          timestamp: new Date(),
          user_id: testUserId,
          event_type: 'SCAN_COMPLETED',
          resource: 'https://example.com',
          action: 'COMPLETE_SCAN',
          result: 'SUCCESS',
          details: { sessionId: 'session-123', vulnerabilitiesFound: 2 },
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0',
        },
      ];

      // Mock access control check
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // Check user role for access control
          rows: [
            {
              user_id: auditorUserId,
              role_name: 'AUDITOR',
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT audit logs with criteria
          rows: mockLogs,
        });

      const logs = await auditLogger.searchLogs(searchCriteria, auditorUserId);

      expect(logs).toHaveLength(2);
      expect(logs[0].eventType).toBe('SCAN_STARTED');
      expect(logs[1].eventType).toBe('SCAN_COMPLETED');
    });

    it('should get user activity for specific time period', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockActivity = [
        {
          id: 'log-1',
          timestamp: new Date('2024-01-15'),
          user_id: testUserId,
          event_type: 'AUTHENTICATION',
          resource: 'auth/login',
          action: 'LOGIN',
          result: 'SUCCESS',
          details: null,
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0',
        },
        {
          id: 'log-2',
          timestamp: new Date('2024-01-15'),
          user_id: testUserId,
          event_type: 'SCAN_STARTED',
          resource: 'https://example.com',
          action: 'START_SCAN',
          result: 'SUCCESS',
          details: { sessionId: 'session-123' },
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0',
        },
      ];

      // Mock access control check
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // Check if auditor can access user logs
          rows: [
            {
              user_id: auditorUserId,
              role_name: 'AUDITOR',
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT user activity
          rows: mockActivity,
        });

      const activity = await auditLogger.getUserActivity(
        testUserId,
        startDate,
        endDate,
        auditorUserId
      );

      expect(activity).toHaveLength(2);
      expect(activity[0].userId).toBe(testUserId);
      expect(activity[1].userId).toBe(testUserId);
    });

    it('should export audit logs in JSON format', async () => {
      const searchCriteria = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const mockLogs = [
        {
          id: 'log-1',
          timestamp: new Date('2024-01-15'),
          user_id: testUserId,
          event_type: 'SCAN_STARTED',
          resource: 'https://example.com',
          action: 'START_SCAN',
          result: 'SUCCESS',
          details: { sessionId: 'session-123' },
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0',
        },
      ];

      // Mock access control and log retrieval
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // Check export permission
          rows: [
            {
              user_id: auditorUserId,
              role_name: 'AUDITOR',
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT logs
          rows: mockLogs,
        });

      const exportedData = await auditLogger.exportLogs(
        searchCriteria,
        { format: 'JSON' },
        auditorUserId
      );

      expect(exportedData).toBeInstanceOf(Buffer);
      const jsonData = JSON.parse(exportedData.toString());
      expect(Array.isArray(jsonData)).toBe(true);
      expect(jsonData).toHaveLength(1);
      expect(jsonData[0].eventType).toBe('SCAN_STARTED');
    });

    it('should export audit logs in CSV format', async () => {
      const searchCriteria = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const mockLogs = [
        {
          id: 'log-1',
          timestamp: new Date('2024-01-15'),
          user_id: testUserId,
          event_type: 'SCAN_STARTED',
          resource: 'https://example.com',
          action: 'START_SCAN',
          result: 'SUCCESS',
          details: { sessionId: 'session-123' },
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0',
        },
      ];

      // Mock access control and log retrieval
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // Check export permission
          rows: [
            {
              user_id: auditorUserId,
              role_name: 'AUDITOR',
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT logs
          rows: mockLogs,
        });

      const exportedData = await auditLogger.exportLogs(
        searchCriteria,
        { format: 'CSV', includeHeaders: true },
        auditorUserId
      );

      expect(exportedData).toBeInstanceOf(Buffer);
      const csvData = exportedData.toString();
      expect(csvData).toContain('id,timestamp,userId,eventType');
      expect(csvData).toContain('SCAN_STARTED');
    });

    it('should generate compliance report for time period', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockOperations = [
        {
          id: 'session-1',
          operation_type: 'WEB_SCAN',
          timestamp: new Date('2024-01-15'),
          user_id: testUserId,
          target: 'https://example.com',
          authorization_id: 'auth-123',
          result: 'COMPLETED',
        },
        {
          id: 'campaign-1',
          operation_type: 'PHISHING_CAMPAIGN',
          timestamp: new Date('2024-02-01'),
          user_id: testUserId,
          target: 'Q1 Security Test',
          authorization_id: 'auth-123',
          result: 'COMPLETED',
        },
        {
          id: 'session-2',
          operation_type: 'WEB_SCAN',
          timestamp: new Date('2024-03-01'),
          user_id: testUserId,
          target: 'https://unauthorized.com',
          authorization_id: null,
          result: 'FAILED',
        },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // SELECT all operations in time period
          rows: mockOperations,
        })
        .mockResolvedValueOnce({
          // INSERT report
          rows: [{ id: 'report-123' }],
        });

      const report = await reportGenerator.generateComplianceReport(
        startDate,
        endDate,
        'JSON',
        {
          title: 'Compliance Report Q1 2024',
          author: 'Auditor',
          organization: 'Test Organization',
          confidentialityLevel: 'RESTRICTED',
        }
      );

      expect(report.id).toBeDefined();
      expect(report.type).toBe('COMPLIANCE');
      expect(report.format).toBe('JSON');
      expect(report.content).toBeDefined();

      // Verify report content
      const reportContent = JSON.parse(report.content as string);
      expect(reportContent.totalOperations).toBe(3);
      expect(reportContent.authorizedOperations).toBe(2);
      expect(reportContent.unauthorizedAttempts).toBe(1);
      expect(reportContent.operations).toHaveLength(3);
    });

    it('should track unauthorized access attempts', async () => {
      const unauthorizedAttempt = {
        userId: testUserId,
        eventType: 'SECURITY_VIOLATION' as EventType,
        resource: 'https://unauthorized.com',
        action: 'ATTEMPT_SCAN',
        result: 'FAILURE' as EventResult,
        details: {
          reason: 'No valid authorization',
          attemptedTarget: 'https://unauthorized.com',
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        // INSERT audit_log
        rows: [
          {
            id: 'log-violation',
            timestamp: new Date(),
            user_id: unauthorizedAttempt.userId,
            event_type: unauthorizedAttempt.eventType,
            resource: unauthorizedAttempt.resource,
            action: unauthorizedAttempt.action,
            result: unauthorizedAttempt.result,
            details: unauthorizedAttempt.details,
            ip_address: unauthorizedAttempt.ipAddress,
            user_agent: unauthorizedAttempt.userAgent,
          },
        ],
      });

      const logEntry = await auditLogger.logEvent(unauthorizedAttempt);

      expect(logEntry.eventType).toBe('SECURITY_VIOLATION');
      expect(logEntry.result).toBe('FAILURE');
      expect(logEntry.details).toHaveProperty('reason');
    });

    it('should enforce access control for audit logs', async () => {
      const regularUserId = 'regular-user-123';
      const searchCriteria = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      // Mock access control check - regular user doesn't have access
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        // Check user role
        rows: [
          {
            user_id: regularUserId,
            role_name: 'USER',
          },
        ],
      });

      await expect(
        auditLogger.searchLogs(searchCriteria, regularUserId)
      ).rejects.toThrow();
    });

    it('should log authorization upload events', async () => {
      const authDocument = {
        organizationName: 'Test Organization',
        scope: {
          domains: ['example.com'],
          ipRanges: [],
          networks: [],
          emailDomains: [],
        },
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        signedBy: 'John Doe',
        digitalSignature: 'test-signature-123',
        allowedOperations: ['WEB_SCAN'] as const,
      };

      const authId = 'auth-123';

      // Mock authorization creation and audit logging
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // INSERT authorization
          rows: [{ id: authId }],
        })
        .mockResolvedValueOnce({
          // INSERT scopes
          rows: [],
        })
        .mockResolvedValueOnce({
          // INSERT operations
          rows: [],
        })
        .mockResolvedValueOnce({
          // INSERT audit_log for authorization upload
          rows: [
            {
              id: 'log-auth-upload',
              timestamp: new Date(),
              user_id: testUserId,
              event_type: 'AUTHORIZATION_UPLOADED',
              resource: authId,
              action: 'UPLOAD',
              result: 'SUCCESS',
              details: {
                organizationName: authDocument.organizationName,
                validUntil: authDocument.validUntil,
              },
              ip_address: null,
              user_agent: null,
            },
          ],
        });

      const uploadedAuthId = await authManager.uploadAuthorization(
        testUserId,
        authDocument,
        '/path/to/document.pdf'
      );

      // Log the authorization upload event
      const logEntry = await auditLogger.logEvent({
        userId: testUserId,
        eventType: 'AUTHORIZATION_UPLOADED' as EventType,
        resource: uploadedAuthId,
        action: 'UPLOAD',
        result: 'SUCCESS' as EventResult,
        details: {
          organizationName: authDocument.organizationName,
          validUntil: authDocument.validUntil,
        },
      });

      expect(logEntry.eventType).toBe('AUTHORIZATION_UPLOADED');
      expect(logEntry.result).toBe('SUCCESS');
    });

    it('should log scan operations with full context', async () => {
      const scanEvent = {
        userId: testUserId,
        eventType: 'SCAN_STARTED' as EventType,
        resource: 'https://example.com',
        action: 'START_SCAN',
        result: 'SUCCESS' as EventResult,
        details: {
          sessionId: 'session-123',
          authorizationId: 'auth-123',
          vulnerabilityTypes: ['SQL_INJECTION', 'XSS'],
          maxDepth: 2,
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        // INSERT audit_log
        rows: [
          {
            id: 'log-scan',
            timestamp: new Date(),
            user_id: scanEvent.userId,
            event_type: scanEvent.eventType,
            resource: scanEvent.resource,
            action: scanEvent.action,
            result: scanEvent.result,
            details: scanEvent.details,
            ip_address: scanEvent.ipAddress,
            user_agent: scanEvent.userAgent,
          },
        ],
      });

      const logEntry = await auditLogger.logEvent(scanEvent);

      expect(logEntry.details).toHaveProperty('sessionId');
      expect(logEntry.details).toHaveProperty('authorizationId');
      expect(logEntry.details).toHaveProperty('vulnerabilityTypes');
      expect(logEntry.ipAddress).toBe('192.168.1.100');
      expect(logEntry.userAgent).toBe('Mozilla/5.0');
    });

    it('should generate compliance report in multiple formats', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      const mockOperations = [
        {
          id: 'session-1',
          operation_type: 'WEB_SCAN',
          timestamp: new Date('2024-01-15'),
          user_id: testUserId,
          target: 'https://example.com',
          authorization_id: 'auth-123',
          result: 'COMPLETED',
        },
      ];

      const formats: ('JSON' | 'HTML' | 'PDF' | 'CSV')[] = ['JSON', 'HTML', 'PDF', 'CSV'];

      for (const format of formats) {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            // SELECT operations
            rows: mockOperations,
          })
          .mockResolvedValueOnce({
            // INSERT report
            rows: [{ id: `report-${format}` }],
          });

        const report = await reportGenerator.generateComplianceReport(
          startDate,
          endDate,
          format,
          {
            title: `Compliance Report - ${format}`,
            author: 'Auditor',
            organization: 'Test Organization',
            confidentialityLevel: 'RESTRICTED',
          }
        );

        expect(report.format).toBe(format);
        expect(report.content).toBeDefined();
      }
    });
  });
});
