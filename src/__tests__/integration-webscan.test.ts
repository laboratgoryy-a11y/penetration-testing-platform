/**
 * Integration Tests - Web Scan Workflow
 * 
 * Tests the complete workflow:
 * Authorization Upload → Start Scan → Get Results → Generate Report
 * 
 * Requirements: 0.1, 1.1, 1.5, 2.1
 */

import { Pool } from 'pg';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { WebScanner } from '../services/WebScanner';
import { ReportGenerator } from '../services/ReportGenerator';
import { AuthorizationDocument, OperationType, Scope } from '../types';

// Mock database pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
} as unknown as Pool;

describe('Integration: Web Scan Complete Workflow', () => {
  let authManager: AuthorizationManager;
  let webScanner: WebScanner;
  let reportGenerator: ReportGenerator;

  const testUserId = 'test-user-123';
  const testTarget = 'https://example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    authManager = new AuthorizationManager(mockPool);
    webScanner = new WebScanner(mockPool, authManager);
    reportGenerator = new ReportGenerator(mockPool, './test-reports');
  });

  describe('Complete Workflow: Authorization → Scan → Results → Report', () => {
    it('should complete full web scan workflow successfully', async () => {
      // Step 1: Upload Authorization
      const authDocument: AuthorizationDocument = {
        organizationName: 'Test Organization',
        scope: {
          domains: ['example.com', '*.example.com'],
          ipRanges: [],
          networks: [],
          emailDomains: [],
        },
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        signedBy: 'John Doe',
        digitalSignature: 'test-signature-123',
        allowedOperations: ['WEB_SCAN'] as OperationType[],
      };

      // Mock authorization creation
      const authId = 'auth-123';
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: authId }] }) // INSERT authorization
        .mockResolvedValueOnce({ rows: [] }) // INSERT scopes
        .mockResolvedValueOnce({ rows: [] }); // INSERT operations

      const uploadedAuthId = await authManager.uploadAuthorization(
        testUserId,
        authDocument,
        '/path/to/document.pdf'
      );

      expect(uploadedAuthId).toBe(authId);

      // Step 2: Start Scan
      const sessionId = 'session-123';

      // Mock authorization validation
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // findActiveByUserAndOperation
          rows: [
            {
              id: authId,
              user_id: testUserId,
              organization_name: 'Test Organization',
              valid_from: authDocument.validFrom,
              valid_until: authDocument.validUntil,
              signed_by: 'John Doe',
              digital_signature: 'test-signature-123',
              document_path: '/path/to/document.pdf',
              status: 'ACTIVE',
              created_at: new Date(),
              revoked_at: null,
              revocation_reason: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // findById for authorization
          rows: [
            {
              id: authId,
              user_id: testUserId,
              organization_name: 'Test Organization',
              valid_from: authDocument.validFrom,
              valid_until: authDocument.validUntil,
              signed_by: 'John Doe',
              digital_signature: 'test-signature-123',
              document_path: '/path/to/document.pdf',
              status: 'ACTIVE',
              created_at: new Date(),
              revoked_at: null,
              revocation_reason: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // findScopesByAuthorizationId
          rows: [
            {
              id: 'scope-1',
              authorization_id: authId,
              scope_type: 'DOMAIN',
              scope_value: 'example.com',
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          // findOperationsByAuthorizationId
          rows: [
            {
              authorization_id: authId,
              operation_type: 'WEB_SCAN',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ id: sessionId }] }) // INSERT scan_session
        .mockResolvedValueOnce({ rows: [] }) // UPDATE scan_session status
        .mockResolvedValueOnce({
          // SELECT scan_session
          rows: [
            {
              id: sessionId,
              user_id: testUserId,
              authorization_id: authId,
              target_url: testTarget,
              status: 'RUNNING',
              started_at: new Date(),
              completed_at: null,
              total_requests: 0,
              total_vulnerabilities: 0,
              config: {
                vulnerabilityTypes: ['SQL_INJECTION', 'XSS'],
                maxDepth: 2,
                maxRequests: 100,
                respectRobotsTxt: true,
              },
            },
          ],
        });

      const scanSession = await webScanner.startScan(
        testUserId,
        {
          url: testTarget,
          authorizationId: authId,
        },
        {
          vulnerabilityTypes: ['SQL_INJECTION', 'XSS'],
          maxDepth: 2,
          maxRequests: 100,
          respectRobotsTxt: true,
        }
      );

      expect(scanSession.id).toBe(sessionId);
      expect(scanSession.status).toBe('RUNNING');
      expect(scanSession.targetUrl).toBe(testTarget);

      // Step 3: Get Results (after scan completes)
      const vulnerabilities = [
        {
          id: 'vuln-1',
          scan_session_id: sessionId,
          type: 'SQL_INJECTION',
          severity: 'CRITICAL',
          location: 'https://example.com/search?q=test',
          description: 'SQL Injection vulnerability detected',
          evidence: 'SQL error in response',
          remediation: 'Use parameterized queries',
          cvss_score: 9.8,
          discovered_at: new Date(),
        },
        {
          id: 'vuln-2',
          scan_session_id: sessionId,
          type: 'XSS',
          severity: 'HIGH',
          location: 'https://example.com/comment',
          description: 'XSS vulnerability detected',
          evidence: 'Script reflected in response',
          remediation: 'Encode user input',
          cvss_score: 7.3,
          discovered_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // SELECT scan_session
          rows: [
            {
              id: sessionId,
              user_id: testUserId,
              authorization_id: authId,
              target_url: testTarget,
              status: 'COMPLETED',
              started_at: new Date(),
              completed_at: new Date(),
              total_requests: 50,
              total_vulnerabilities: 2,
              config: {
                vulnerabilityTypes: ['SQL_INJECTION', 'XSS'],
                maxDepth: 2,
                maxRequests: 100,
                respectRobotsTxt: true,
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT vulnerabilities
          rows: vulnerabilities,
        });

      const results = await webScanner.getResults(sessionId);

      expect(results.sessionId).toBe(sessionId);
      expect(results.target).toBe(testTarget);
      expect(results.vulnerabilities).toHaveLength(2);
      expect(results.summary.totalVulnerabilities).toBe(2);
      expect(results.summary.criticalCount).toBe(1);
      expect(results.summary.highCount).toBe(1);

      // Step 4: Generate Report
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // SELECT scan_session for report
          rows: [
            {
              id: sessionId,
              user_id: testUserId,
              authorization_id: authId,
              target_url: testTarget,
              status: 'COMPLETED',
              started_at: new Date(),
              completed_at: new Date(),
              total_requests: 50,
              total_vulnerabilities: 2,
              config: {},
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT vulnerabilities for report
          rows: vulnerabilities,
        })
        .mockResolvedValueOnce({
          // INSERT report
          rows: [{ id: 'report-123' }],
        });

      const report = await reportGenerator.generateWebScanReport(
        sessionId,
        'JSON',
        {
          title: 'Web Scan Report',
          author: 'Test User',
          organization: 'Test Organization',
          confidentialityLevel: 'CONFIDENTIAL',
        }
      );

      expect(report.id).toBeDefined();
      expect(report.type).toBe('WEB_SCAN');
      expect(report.format).toBe('JSON');
      expect(report.content).toBeDefined();

      // Verify report content
      const reportContent = JSON.parse(report.content as string);
      expect(reportContent.sessionId).toBe(sessionId);
      expect(reportContent.target).toBe(testTarget);
      expect(reportContent.vulnerabilities).toHaveLength(2);
    });

    it('should reject scan without valid authorization', async () => {
      // Mock no authorization found
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        webScanner.startScan(
          testUserId,
          {
            url: testTarget,
            authorizationId: 'invalid-auth-id',
          },
          {
            vulnerabilityTypes: ['SQL_INJECTION'],
            maxDepth: 2,
            maxRequests: 100,
            respectRobotsTxt: true,
          }
        )
      ).rejects.toThrow('No valid authorization found');
    });

    it('should reject scan for target outside authorized scope', async () => {
      const authId = 'auth-123';

      // Mock authorization exists but target not in scope
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // findActiveByUserAndOperation
          rows: [
            {
              id: authId,
              user_id: testUserId,
              organization_name: 'Test Organization',
              valid_from: new Date(),
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              signed_by: 'John Doe',
              digital_signature: 'test-signature-123',
              document_path: '/path/to/document.pdf',
              status: 'ACTIVE',
              created_at: new Date(),
              revoked_at: null,
              revocation_reason: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // findById for authorization
          rows: [
            {
              id: authId,
              user_id: testUserId,
              organization_name: 'Test Organization',
              valid_from: new Date(),
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              signed_by: 'John Doe',
              digital_signature: 'test-signature-123',
              document_path: '/path/to/document.pdf',
              status: 'ACTIVE',
              created_at: new Date(),
              revoked_at: null,
              revocation_reason: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // findScopesByAuthorizationId - different domain
          rows: [
            {
              id: 'scope-1',
              authorization_id: authId,
              scope_type: 'DOMAIN',
              scope_value: 'different-domain.com',
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          // findOperationsByAuthorizationId
          rows: [
            {
              authorization_id: authId,
              operation_type: 'WEB_SCAN',
            },
          ],
        });

      await expect(
        webScanner.startScan(
          testUserId,
          {
            url: 'https://unauthorized-domain.com',
            authorizationId: authId,
          },
          {
            vulnerabilityTypes: ['SQL_INJECTION'],
            maxDepth: 2,
            maxRequests: 100,
            respectRobotsTxt: true,
          }
        )
      ).rejects.toThrow('outside authorized scope');
    });

    it('should generate report in multiple formats', async () => {
      const sessionId = 'session-123';
      const vulnerabilities = [
        {
          id: 'vuln-1',
          scan_session_id: sessionId,
          type: 'SQL_INJECTION',
          severity: 'CRITICAL',
          location: 'https://example.com/search',
          description: 'SQL Injection',
          evidence: 'SQL error',
          remediation: 'Use prepared statements',
          cvss_score: 9.8,
          discovered_at: new Date(),
        },
      ];

      const formats: ReportFormat[] = ['JSON', 'HTML', 'PDF', 'CSV'];

      for (const format of formats) {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            // SELECT scan_session
            rows: [
              {
                id: sessionId,
                user_id: testUserId,
                authorization_id: 'auth-123',
                target_url: testTarget,
                status: 'COMPLETED',
                started_at: new Date(),
                completed_at: new Date(),
                total_requests: 50,
                total_vulnerabilities: 1,
                config: {},
              },
            ],
          })
          .mockResolvedValueOnce({
            // SELECT vulnerabilities
            rows: vulnerabilities,
          })
          .mockResolvedValueOnce({
            // INSERT report
            rows: [{ id: `report-${format}` }],
          });

        const report = await reportGenerator.generateWebScanReport(
          sessionId,
          format,
          {
            title: `Web Scan Report - ${format}`,
            author: 'Test User',
            organization: 'Test Organization',
            confidentialityLevel: 'CONFIDENTIAL',
          }
        );

        expect(report.format).toBe(format);
        expect(report.content).toBeDefined();
      }
    });
  });
});
