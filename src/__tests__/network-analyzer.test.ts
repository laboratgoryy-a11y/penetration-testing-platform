import { Pool } from 'pg';
import { NetworkAnalyzer } from '../services/NetworkAnalyzer';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { NetworkTestSession, NetworkVulnerability, DiscoveredDevice } from '../models';

// Mock the database pool
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

// Mock AuthorizationManager
const mockAuthManager = {
  validateAuthorization: jest.fn(),
  isTargetInScope: jest.fn(),
} as unknown as AuthorizationManager;

describe('NetworkAnalyzer', () => {
  let networkAnalyzer: NetworkAnalyzer;

  beforeEach(() => {
    jest.clearAllMocks();
    networkAnalyzer = new NetworkAnalyzer(mockPool, mockAuthManager);
  });

  describe('discoverAccessPoints', () => {
    it('should require valid authorization', async () => {
      // Mock authorization failure
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: false,
        reason: 'No valid authorization found',
      });

      await expect(
        networkAnalyzer.discoverAccessPoints('user-123', 'auth-123')
      ).rejects.toThrow('No valid authorization found');
    });

    it('should return access points when authorized', async () => {
      // Mock authorization success
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });

      const accessPoints = await networkAnalyzer.discoverAccessPoints(
        'user-123',
        'auth-123'
      );

      expect(accessPoints).toBeDefined();
      expect(Array.isArray(accessPoints)).toBe(true);
      expect(accessPoints.length).toBeGreaterThan(0);
      
      // Verify access point structure
      const ap = accessPoints[0];
      expect(ap).toHaveProperty('ssid');
      expect(ap).toHaveProperty('bssid');
      expect(ap).toHaveProperty('channel');
      expect(ap).toHaveProperty('encryption');
      expect(ap).toHaveProperty('signalStrength');
    });
  });

  describe('startNetworkTest', () => {
    it('should require valid authorization', async () => {
      // Mock authorization failure
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: false,
        reason: 'No valid authorization found',
      });

      const target = {
        ssid: 'TestNetwork',
        bssid: '00:11:22:33:44:55',
        authorizationId: 'auth-123',
      };

      const config = {
        testTypes: ['WEP_CRACK' as const],
        maxAttempts: 1000,
      };

      await expect(
        networkAnalyzer.startNetworkTest('user-123', target, config)
      ).rejects.toThrow('No valid authorization found');
    });

    it('should reject target outside scope', async () => {
      // Mock authorization success but scope check failure
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });
      (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(false);

      const target = {
        ssid: 'TestNetwork',
        bssid: '00:11:22:33:44:55',
        authorizationId: 'auth-123',
      };

      const config = {
        testTypes: ['WEP_CRACK' as const],
        maxAttempts: 1000,
      };

      await expect(
        networkAnalyzer.startNetworkTest('user-123', target, config)
      ).rejects.toThrow('outside authorized scope');
    });

    it('should create test session when authorized and in scope', async () => {
      // Mock authorization and scope check success
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });
      (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

      // Mock database queries
      const sessionId = 'session-123';
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: sessionId }] }) // create session
        .mockResolvedValueOnce({ rows: [] }) // update status
        .mockResolvedValueOnce({
          // findById
          rows: [
            {
              id: sessionId,
              user_id: 'user-123',
              authorization_id: 'auth-123',
              ssid: 'TestNetwork',
              bssid: '00:11:22:33:44:55',
              status: 'RUNNING',
              started_at: new Date(),
              config: { testTypes: ['WEP_CRACK'], maxAttempts: 1000 },
            },
          ],
        });

      const target = {
        ssid: 'TestNetwork',
        bssid: '00:11:22:33:44:55',
        authorizationId: 'auth-123',
      };

      const config = {
        testTypes: ['WEP_CRACK' as const],
        maxAttempts: 1000,
      };

      const session = await networkAnalyzer.startNetworkTest('user-123', target, config);

      expect(session).toBeDefined();
      expect(session.id).toBe(sessionId);
      expect(session.status).toBe('RUNNING');
      expect(session.ssid).toBe('TestNetwork');
    });
  });

  describe('getTestStatus', () => {
    it('should throw error if session not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(networkAnalyzer.getTestStatus('invalid-id')).rejects.toThrow(
        'Network test session not found'
      );
    });

    it('should return test status', async () => {
      const sessionId = 'session-123';
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: sessionId,
            user_id: 'user-123',
            authorization_id: 'auth-123',
            ssid: 'TestNetwork',
            bssid: '00:11:22:33:44:55',
            status: 'COMPLETED',
            started_at: new Date('2024-01-01'),
            completed_at: new Date('2024-01-01T01:00:00'),
            config: {},
          },
        ],
      });

      const status = await networkAnalyzer.getTestStatus(sessionId);

      expect(status).toBeDefined();
      expect(status.sessionId).toBe(sessionId);
      expect(status.status).toBe('COMPLETED');
      expect(status.startedAt).toBeDefined();
      expect(status.completedAt).toBeDefined();
    });
  });

  describe('stopTest', () => {
    it('should throw error if session not found', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await expect(networkAnalyzer.stopTest('invalid-id')).rejects.toThrow(
        'Network test session not found'
      );
    });

    it('should throw error if test is not running', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'session-123',
            status: 'COMPLETED',
            user_id: 'user-123',
            authorization_id: 'auth-123',
            ssid: 'TestNetwork',
            bssid: '00:11:22:33:44:55',
            started_at: new Date(),
            config: {},
          },
        ],
      });

      await expect(networkAnalyzer.stopTest('session-123')).rejects.toThrow(
        'Network test is not running'
      );
    });
  });

  // Additional unit tests for NetworkAnalyzer - Task 16.4
  describe('اكتشاف نقاط الوصول', () => {
    it('should discover multiple access points', async () => {
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });

      const accessPoints = await networkAnalyzer.discoverAccessPoints(
        'user-123',
        'auth-123'
      );

      expect(accessPoints.length).toBeGreaterThan(0);
      
      // Verify each access point has required fields
      accessPoints.forEach(ap => {
        expect(ap.ssid).toBeDefined();
        expect(ap.bssid).toBeDefined();
        expect(ap.channel).toBeDefined();
        expect(ap.encryption).toBeDefined();
        expect(ap.signalStrength).toBeDefined();
        expect(['OPEN', 'WEP', 'WPA', 'WPA2', 'WPA3']).toContain(ap.encryption);
      });
    });

    it('should include signal strength in discovery', async () => {
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });

      const accessPoints = await networkAnalyzer.discoverAccessPoints(
        'user-123',
        'auth-123'
      );

      accessPoints.forEach(ap => {
        expect(typeof ap.signalStrength).toBe('number');
        expect(ap.signalStrength).toBeGreaterThanOrEqual(-100);
        expect(ap.signalStrength).toBeLessThanOrEqual(0);
      });
    });

    it('should identify encryption type correctly', async () => {
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });

      const accessPoints = await networkAnalyzer.discoverAccessPoints(
        'user-123',
        'auth-123'
      );

      const validEncryptions = ['OPEN', 'WEP', 'WPA', 'WPA2', 'WPA3'];
      accessPoints.forEach(ap => {
        expect(validEncryptions).toContain(ap.encryption);
      });
    });
  });

  describe('تنفيذ الاختبارات المصرح بها فقط', () => {
    it('should only execute authorized test types', async () => {
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });
      (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

      const sessionId = 'session-123';
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: sessionId }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: sessionId,
              user_id: 'user-123',
              authorization_id: 'auth-123',
              ssid: 'TestNetwork',
              bssid: '00:11:22:33:44:55',
              status: 'RUNNING',
              started_at: new Date(),
              config: {
                testTypes: ['WEP_CRACK', 'WPA_HANDSHAKE_CAPTURE'],
                maxAttempts: 1000,
              },
            },
          ],
        });

      const target = {
        ssid: 'TestNetwork',
        bssid: '00:11:22:33:44:55',
        authorizationId: 'auth-123',
      };

      const config = {
        testTypes: ['WEP_CRACK' as const, 'WPA_HANDSHAKE_CAPTURE' as const],
        maxAttempts: 1000,
      };

      const session = await networkAnalyzer.startNetworkTest('user-123', target, config);

      expect(session.config.testTypes).toEqual(['WEP_CRACK', 'WPA_HANDSHAKE_CAPTURE']);
      expect(session.config.testTypes).not.toContain('EVIL_TWIN');
      expect(session.config.testTypes).not.toContain('DEAUTH_ATTACK');
    });

    it('should validate test types against authorization', async () => {
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });
      (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

      const sessionId = 'session-123';
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: sessionId }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: sessionId,
              user_id: 'user-123',
              authorization_id: 'auth-123',
              ssid: 'TestNetwork',
              bssid: '00:11:22:33:44:55',
              status: 'RUNNING',
              started_at: new Date(),
              config: {
                testTypes: ['TRAFFIC_ANALYSIS'],
                maxAttempts: 1000,
              },
            },
          ],
        });

      const target = {
        ssid: 'TestNetwork',
        bssid: '00:11:22:33:44:55',
        authorizationId: 'auth-123',
      };

      const config = {
        testTypes: ['TRAFFIC_ANALYSIS' as const],
        maxAttempts: 1000,
      };

      const session = await networkAnalyzer.startNetworkTest('user-123', target, config);

      expect(session.config.testTypes).toContain('TRAFFIC_ANALYSIS');
    });

    it('should reject unauthorized test types', async () => {
      (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: false,
        reason: 'Test type not authorized',
      });

      const target = {
        ssid: 'TestNetwork',
        bssid: '00:11:22:33:44:55',
        authorizationId: 'auth-123',
      };

      const config = {
        testTypes: ['EVIL_TWIN' as const],
        maxAttempts: 1000,
      };

      await expect(
        networkAnalyzer.startNetworkTest('user-123', target, config)
      ).rejects.toThrow();
    });
  });

  describe('توثيق الثغرات', () => {
    it('should document discovered vulnerabilities without exploitation', async () => {
      const sessionId = 'session-123';
      const vulnerabilities = [
        {
          id: 'vuln-1',
          test_session_id: sessionId,
          type: 'WEAK_ENCRYPTION',
          severity: 'HIGH',
          description: 'Network uses WEP encryption which is easily crackable',
          evidence: 'WEP encryption detected',
          remediation: 'Upgrade to WPA2 or WPA3',
          discovered_at: new Date(),
        },
        {
          id: 'vuln-2',
          test_session_id: sessionId,
          type: 'WEAK_PASSWORD',
          severity: 'CRITICAL',
          description: 'Network password is weak and easily guessable',
          evidence: 'Password cracked in 30 seconds',
          remediation: 'Use strong password with at least 12 characters',
          discovered_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              id: sessionId,
              status: 'COMPLETED',
              user_id: 'user-123',
              authorization_id: 'auth-123',
              ssid: 'TestNetwork',
              bssid: '00:11:22:33:44:55',
              started_at: new Date(),
              completed_at: new Date(),
              config: {},
            },
          ],
        })
        .mockResolvedValueOnce({ rows: vulnerabilities });

      const results = await networkAnalyzer.getNetworkResults(sessionId);

      expect(results.vulnerabilities).toHaveLength(2);
      expect(results.vulnerabilities[0].type).toBe('WEAK_ENCRYPTION');
      expect(results.vulnerabilities[0].description).toBeDefined();
      expect(results.vulnerabilities[0].remediation).toBeDefined();
      expect(results.vulnerabilities[1].type).toBe('WEAK_PASSWORD');
    });

    it('should include remediation recommendations for each vulnerability', async () => {
      const sessionId = 'session-123';
      const vulnerabilities = [
        {
          id: 'vuln-1',
          test_session_id: sessionId,
          type: 'INSECURE_PROTOCOL',
          severity: 'MEDIUM',
          description: 'Insecure protocol detected',
          evidence: 'HTTP traffic observed',
          remediation: 'Use HTTPS for all communications',
          discovered_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              id: sessionId,
              status: 'COMPLETED',
              user_id: 'user-123',
              authorization_id: 'auth-123',
              ssid: 'TestNetwork',
              bssid: '00:11:22:33:44:55',
              started_at: new Date(),
              completed_at: new Date(),
              config: {},
            },
          ],
        })
        .mockResolvedValueOnce({ rows: vulnerabilities });

      const results = await networkAnalyzer.getNetworkResults(sessionId);

      results.vulnerabilities.forEach(vuln => {
        expect(vuln.remediation).toBeDefined();
        expect(vuln.remediation.length).toBeGreaterThan(0);
      });
    });

    it('should classify vulnerabilities by severity', async () => {
      const sessionId = 'session-123';
      const vulnerabilities = [
        {
          id: 'vuln-1',
          test_session_id: sessionId,
          type: 'WEAK_ENCRYPTION',
          severity: 'CRITICAL',
          description: 'Critical vulnerability',
          evidence: 'Evidence',
          remediation: 'Fix it',
          discovered_at: new Date(),
        },
        {
          id: 'vuln-2',
          test_session_id: sessionId,
          type: 'WEAK_PASSWORD',
          severity: 'HIGH',
          description: 'High vulnerability',
          evidence: 'Evidence',
          remediation: 'Fix it',
          discovered_at: new Date(),
        },
        {
          id: 'vuln-3',
          test_session_id: sessionId,
          type: 'INSECURE_PROTOCOL',
          severity: 'MEDIUM',
          description: 'Medium vulnerability',
          evidence: 'Evidence',
          remediation: 'Fix it',
          discovered_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [
            {
              id: sessionId,
              status: 'COMPLETED',
              user_id: 'user-123',
              authorization_id: 'auth-123',
              ssid: 'TestNetwork',
              bssid: '00:11:22:33:44:55',
              started_at: new Date(),
              completed_at: new Date(),
              config: {},
            },
          ],
        })
        .mockResolvedValueOnce({ rows: vulnerabilities });

      const results = await networkAnalyzer.getNetworkResults(sessionId);

      const criticalVulns = results.vulnerabilities.filter(v => v.severity === 'CRITICAL');
      const highVulns = results.vulnerabilities.filter(v => v.severity === 'HIGH');
      const mediumVulns = results.vulnerabilities.filter(v => v.severity === 'MEDIUM');

      expect(criticalVulns.length).toBe(1);
      expect(highVulns.length).toBe(1);
      expect(mediumVulns.length).toBe(1);
    });
  });
});
