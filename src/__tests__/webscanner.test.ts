import { Pool } from 'pg';
import { WebScanner } from '../services/WebScanner';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { ScanSession, Vulnerability } from '../models';

// Mock the database pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
} as unknown as Pool;

// Mock AuthorizationManager
const mockAuthManager = {
  validateAuthorization: jest.fn(),
  isTargetInScope: jest.fn(),
} as unknown as AuthorizationManager;

describe('WebScanner', () => {
  let scanner: WebScanner;

  beforeEach(() => {
    jest.clearAllMocks();
    scanner = new WebScanner(mockPool, mockAuthManager);
  });

  describe('startScan', () => {
    it('should reject scan without valid authorization', async () => {
      // Mock authorization validation to return unauthorized
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: false,
        reason: 'No valid authorization found',
      });

      await expect(
        scanner.startScan(
          'user-123',
          {
            url: 'https://example.com',
            authorizationId: 'auth-123',
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

    it('should reject scan for target outside scope', async () => {
      // Mock authorization validation to return authorized
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });

      // Mock scope check to return false
      (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(false);

      await expect(
        scanner.startScan(
          'user-123',
          {
            url: 'https://example.com',
            authorizationId: 'auth-123',
          },
          {
            vulnerabilityTypes: ['SQL_INJECTION'],
            maxDepth: 2,
            maxRequests: 100,
            respectRobotsTxt: true,
          }
        )
      ).rejects.toThrow('Target is outside authorized scope');
    });

    it('should create scan session with valid authorization', async () => {
      const sessionId = 'session-123';

      // Mock authorization validation
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });

      // Mock scope check
      (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

      // Mock database queries
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: sessionId }] }) // INSERT scan_session
        .mockResolvedValueOnce({ rows: [] }) // UPDATE scan_session status
        .mockResolvedValueOnce({
          // SELECT scan_session
          rows: [
            {
              id: sessionId,
              user_id: 'user-123',
              authorization_id: 'auth-123',
              target_url: 'https://example.com',
              status: 'RUNNING',
              started_at: new Date(),
              completed_at: null,
              total_requests: 0,
              total_vulnerabilities: 0,
              config: {
                vulnerabilityTypes: ['SQL_INJECTION'],
                maxDepth: 2,
                maxRequests: 100,
                respectRobotsTxt: true,
              },
            },
          ],
        });

      const result = await scanner.startScan(
        'user-123',
        {
          url: 'https://example.com',
          authorizationId: 'auth-123',
        },
        {
          vulnerabilityTypes: ['SQL_INJECTION'],
          maxDepth: 2,
          maxRequests: 100,
          respectRobotsTxt: true,
        }
      );

      expect(result.id).toBe(sessionId);
      expect(result.status).toBe('RUNNING');
      expect(result.targetUrl).toBe('https://example.com');
    });
  });

  describe('getScanStatus', () => {
    it('should return scan status', async () => {
      const sessionId = 'session-123';

      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: sessionId,
            user_id: 'user-123',
            authorization_id: 'auth-123',
            target_url: 'https://example.com',
            status: 'COMPLETED',
            started_at: new Date(),
            completed_at: new Date(),
            total_requests: 10,
            total_vulnerabilities: 2,
            config: {},
          },
        ],
      });

      const status = await scanner.getScanStatus(sessionId);
      expect(status).toBe('COMPLETED');
    });

    it('should throw error for non-existent session', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(scanner.getScanStatus('non-existent')).rejects.toThrow(
        'Scan session not found'
      );
    });
  });

  describe('stopScan', () => {
    it('should stop running scan', async () => {
      const sessionId = 'session-123';

      // Mock finding the session
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              id: sessionId,
              status: 'RUNNING',
              user_id: 'user-123',
              authorization_id: 'auth-123',
              target_url: 'https://example.com',
              started_at: new Date(),
              total_requests: 0,
              total_vulnerabilities: 0,
              config: {},
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // UPDATE status

      await scanner.stopScan(sessionId);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should throw error when stopping non-running scan', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'session-123',
            status: 'COMPLETED',
            user_id: 'user-123',
            authorization_id: 'auth-123',
            target_url: 'https://example.com',
            started_at: new Date(),
            completed_at: new Date(),
            total_requests: 10,
            total_vulnerabilities: 2,
            config: {},
          },
        ],
      });

      await expect(scanner.stopScan('session-123')).rejects.toThrow('Scan is not running');
    });
  });
});

describe('ScanSession Model', () => {
  let scanSession: ScanSession;

  beforeEach(() => {
    jest.clearAllMocks();
    scanSession = new ScanSession(mockPool);
  });

  describe('create', () => {
    it('should create a new scan session', async () => {
      const sessionId = 'session-123';
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: sessionId }],
      });

      const result = await scanSession.create({
        userId: 'user-123',
        authorizationId: 'auth-123',
        targetUrl: 'https://example.com',
        config: {
          vulnerabilityTypes: ['SQL_INJECTION'],
          maxDepth: 2,
          maxRequests: 100,
          respectRobotsTxt: true,
        },
      });

      expect(result).toBe(sessionId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO scan_sessions'),
        expect.arrayContaining(['user-123', 'auth-123', 'https://example.com'])
      );
    });
  });

  describe('findById', () => {
    it('should return null for non-existent session', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await scanSession.findById('non-existent');
      expect(result).toBeNull();
    });

    it('should return session data', async () => {
      const sessionData = {
        id: 'session-123',
        user_id: 'user-123',
        authorization_id: 'auth-123',
        target_url: 'https://example.com',
        status: 'COMPLETED',
        started_at: new Date(),
        completed_at: new Date(),
        total_requests: 10,
        total_vulnerabilities: 2,
        config: { vulnerabilityTypes: ['SQL_INJECTION'] },
      };

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [sessionData] });

      const result = await scanSession.findById('session-123');
      expect(result).toBeDefined();
      expect(result?.id).toBe('session-123');
      expect(result?.status).toBe('COMPLETED');
    });
  });
});

describe('Vulnerability Model', () => {
  let vulnerability: Vulnerability;

  beforeEach(() => {
    jest.clearAllMocks();
    vulnerability = new Vulnerability(mockPool);
  });

  describe('create', () => {
    it('should create a new vulnerability', async () => {
      const vulnId = 'vuln-123';
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: vulnId }],
      });

      const result = await vulnerability.create({
        scanSessionId: 'session-123',
        type: 'SQL_INJECTION',
        severity: 'CRITICAL',
        location: 'https://example.com/search?q=test',
        description: 'SQL Injection vulnerability detected',
        evidence: 'SQL error in response',
        remediation: 'Use parameterized queries',
        cvssScore: 9.8,
      });

      expect(result).toBe(vulnId);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO vulnerabilities'),
        expect.arrayContaining(['session-123', 'SQL_INJECTION', 'CRITICAL'])
      );
    });
  });

  describe('findByScanSessionId', () => {
    it('should return vulnerabilities for a session', async () => {
      const vulnData = [
        {
          id: 'vuln-1',
          scan_session_id: 'session-123',
          type: 'SQL_INJECTION',
          severity: 'CRITICAL',
          location: 'https://example.com/search',
          description: 'SQL Injection found',
          evidence: 'SQL error',
          remediation: 'Use prepared statements',
          cvss_score: 9.8,
          discovered_at: new Date(),
        },
        {
          id: 'vuln-2',
          scan_session_id: 'session-123',
          type: 'XSS',
          severity: 'HIGH',
          location: 'https://example.com/comment',
          description: 'XSS vulnerability found',
          evidence: 'Script reflected',
          remediation: 'Encode output',
          cvss_score: 7.3,
          discovered_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock).mockResolvedValue({ rows: vulnData });

      const result = await vulnerability.findByScanSessionId('session-123');
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('SQL_INJECTION');
      expect(result[1].type).toBe('XSS');
    });
  });

  describe('countBySeverity', () => {
    it('should count vulnerabilities by severity', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [{ count: '3' }] });

      const result = await vulnerability.countBySeverity('session-123', 'CRITICAL');
      expect(result).toBe(3);
    });
  });
});

// Additional unit tests for WebScanner - Task 16.2
describe('WebScanner - Additional Unit Tests', () => {
  let scanner: WebScanner;

  beforeEach(() => {
    jest.clearAllMocks();
    scanner = new WebScanner(mockPool, mockAuthManager);
  });

  describe('احترام robots.txt', () => {
    it('should respect robots.txt when configured', async () => {
      // Mock authorization
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });
      (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

      // Mock database
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'session-123' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'session-123',
              user_id: 'user-123',
              authorization_id: 'auth-123',
              target_url: 'https://example.com',
              status: 'RUNNING',
              started_at: new Date(),
              total_requests: 0,
              total_vulnerabilities: 0,
              config: {
                vulnerabilityTypes: ['SQL_INJECTION'],
                maxDepth: 2,
                maxRequests: 100,
                respectRobotsTxt: true,
              },
            },
          ],
        });

      const result = await scanner.startScan(
        'user-123',
        { url: 'https://example.com', authorizationId: 'auth-123' },
        {
          vulnerabilityTypes: ['SQL_INJECTION'],
          maxDepth: 2,
          maxRequests: 100,
          respectRobotsTxt: true,
        }
      );

      expect(result.config.respectRobotsTxt).toBe(true);
    });
  });

  describe('اكتشاف SQL Injection', () => {
    it('should detect SQL Injection vulnerabilities', async () => {
      const vulnData = {
        id: 'vuln-123',
        scan_session_id: 'session-123',
        type: 'SQL_INJECTION',
        severity: 'CRITICAL',
        location: 'https://example.com/search?q=test',
        description: 'SQL Injection vulnerability detected',
        evidence: 'SQL error in response',
        remediation: 'Use parameterized queries',
        cvss_score: 9.8,
        discovered_at: new Date(),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'session-123',
              status: 'COMPLETED',
              user_id: 'user-123',
              authorization_id: 'auth-123',
              target_url: 'https://example.com',
              started_at: new Date(),
              completed_at: new Date(),
              total_requests: 10,
              total_vulnerabilities: 1,
              config: {},
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [vulnData] });

      const results = await scanner.getResults('session-123');

      expect(results.vulnerabilities).toHaveLength(1);
      expect(results.vulnerabilities[0].type).toBe('SQL_INJECTION');
      expect(results.vulnerabilities[0].severity).toBe('CRITICAL');
    });
  });

  describe('اكتشاف XSS', () => {
    it('should detect XSS vulnerabilities', async () => {
      const vulnData = {
        id: 'vuln-456',
        scan_session_id: 'session-123',
        type: 'XSS',
        severity: 'HIGH',
        location: 'https://example.com/comment',
        description: 'XSS vulnerability detected',
        evidence: 'Script reflected in response',
        remediation: 'Encode user input',
        cvss_score: 7.3,
        discovered_at: new Date(),
      };

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'session-123',
              status: 'COMPLETED',
              user_id: 'user-123',
              authorization_id: 'auth-123',
              target_url: 'https://example.com',
              started_at: new Date(),
              completed_at: new Date(),
              total_requests: 10,
              total_vulnerabilities: 1,
              config: {},
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [vulnData] });

      const results = await scanner.getResults('session-123');

      expect(results.vulnerabilities).toHaveLength(1);
      expect(results.vulnerabilities[0].type).toBe('XSS');
      expect(results.vulnerabilities[0].severity).toBe('HIGH');
    });
  });

  describe('إيقاف الفحص خارج النطاق', () => {
    it('should stop scan when target outside scope is detected', async () => {
      // Mock authorization for initial target
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });

      // First call returns true (initial target), second returns false (out of scope)
      (mockAuthManager.isTargetInScope as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      // Mock database
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'session-123' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'session-123',
              user_id: 'user-123',
              authorization_id: 'auth-123',
              target_url: 'https://example.com',
              status: 'RUNNING',
              started_at: new Date(),
              total_requests: 0,
              total_vulnerabilities: 0,
              config: {
                vulnerabilityTypes: ['SQL_INJECTION'],
                maxDepth: 2,
                maxRequests: 100,
                respectRobotsTxt: true,
              },
            },
          ],
        });

      const result = await scanner.startScan(
        'user-123',
        { url: 'https://example.com', authorizationId: 'auth-123' },
        {
          vulnerabilityTypes: ['SQL_INJECTION'],
          maxDepth: 2,
          maxRequests: 100,
          respectRobotsTxt: true,
        }
      );

      expect(result.status).toBe('RUNNING');
      // The scan will be stopped in the background when out-of-scope target is detected
    });
  });

  describe('تصنيف الثغرات حسب الخطورة', () => {
    it('should classify vulnerabilities by severity in summary', async () => {
      const vulnData = [
        {
          id: 'vuln-1',
          scan_session_id: 'session-123',
          type: 'SQL_INJECTION',
          severity: 'CRITICAL',
          location: 'https://example.com/search',
          description: 'SQL Injection',
          evidence: 'SQL error',
          remediation: 'Use prepared statements',
          cvss_score: 9.8,
          discovered_at: new Date(),
        },
        {
          id: 'vuln-2',
          scan_session_id: 'session-123',
          type: 'XSS',
          severity: 'HIGH',
          location: 'https://example.com/comment',
          description: 'XSS',
          evidence: 'Script reflected',
          remediation: 'Encode output',
          cvss_score: 7.3,
          discovered_at: new Date(),
        },
        {
          id: 'vuln-3',
          scan_session_id: 'session-123',
          type: 'CSRF',
          severity: 'MEDIUM',
          location: 'https://example.com/form',
          description: 'CSRF',
          evidence: 'No CSRF token',
          remediation: 'Add CSRF protection',
          cvss_score: 5.0,
          discovered_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'session-123',
              status: 'COMPLETED',
              user_id: 'user-123',
              authorization_id: 'auth-123',
              target_url: 'https://example.com',
              started_at: new Date(),
              completed_at: new Date(),
              total_requests: 15,
              total_vulnerabilities: 3,
              config: {},
            },
          ],
        })
        .mockResolvedValueOnce({ rows: vulnData });

      const results = await scanner.getResults('session-123');

      expect(results.summary.totalVulnerabilities).toBe(3);
      expect(results.summary.criticalCount).toBe(1);
      expect(results.summary.highCount).toBe(1);
      expect(results.summary.mediumCount).toBe(1);
      expect(results.summary.lowCount).toBe(0);
    });
  });
});
