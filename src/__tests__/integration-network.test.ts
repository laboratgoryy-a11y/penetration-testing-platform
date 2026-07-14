/**
 * Integration Tests - Network Analysis Workflow
 * 
 * Tests the complete workflow:
 * Discover → Start Test → Get Results → Generate Report
 * 
 * Requirements: 5.1, 5.3, 5.7
 */

import { Pool } from 'pg';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { NetworkAnalyzer } from '../services/NetworkAnalyzer';
import { ReportGenerator } from '../services/ReportGenerator';
import { AuthorizationDocument, OperationType } from '../types';

// Mock database pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
} as unknown as Pool;

describe('Integration: Network Analysis Complete Workflow', () => {
  let authManager: AuthorizationManager;
  let networkAnalyzer: NetworkAnalyzer;
  let reportGenerator: ReportGenerator;

  const testUserId = 'test-user-123';
  const testAuthId = 'auth-123';

  beforeEach(() => {
    jest.clearAllMocks();
    authManager = new AuthorizationManager(mockPool);
    networkAnalyzer = new NetworkAnalyzer(mockPool, authManager);
    reportGenerator = new ReportGenerator(mockPool, './test-reports');
  });

  describe('Complete Workflow: Discover → Test → Results → Report', () => {
    it('should complete full network analysis workflow successfully', async () => {
      // Step 1: Discover Access Points
      // Mock authorization validation
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // findActiveByUserAndOperation
          rows: [
            {
              id: testAuthId,
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
        });

      const accessPoints = await networkAnalyzer.discoverAccessPoints(
        testUserId,
        testAuthId
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

      // Step 2: Start Network Test
      const targetNetwork = {
        ssid: accessPoints[0].ssid,
        bssid: accessPoints[0].bssid,
        authorizationId: testAuthId,
      };

      const testConfig = {
        testTypes: ['WPA_HANDSHAKE_CAPTURE', 'TRAFFIC_ANALYSIS'] as const,
        maxAttempts: 100,
      };

      const sessionId = 'session-123';

      // Mock authorization validation and test session creation
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // findActiveByUserAndOperation
          rows: [
            {
              id: testAuthId,
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
              id: testAuthId,
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
          // findScopesByAuthorizationId
          rows: [
            {
              id: 'scope-1',
              authorization_id: testAuthId,
              scope_type: 'NETWORK',
              scope_value: targetNetwork.ssid,
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          // findOperationsByAuthorizationId
          rows: [
            {
              authorization_id: testAuthId,
              operation_type: 'NETWORK_ANALYSIS',
            },
          ],
        })
        .mockResolvedValueOnce({
          // INSERT network_test_session
          rows: [{ id: sessionId }],
        })
        .mockResolvedValueOnce({
          // UPDATE session status
          rows: [],
        })
        .mockResolvedValueOnce({
          // SELECT session
          rows: [
            {
              id: sessionId,
              user_id: testUserId,
              authorization_id: testAuthId,
              ssid: targetNetwork.ssid,
              bssid: targetNetwork.bssid,
              status: 'RUNNING',
              started_at: new Date(),
              completed_at: null,
              config: testConfig,
            },
          ],
        });

      const testSession = await networkAnalyzer.startNetworkTest(
        testUserId,
        targetNetwork,
        testConfig
      );

      expect(testSession.id).toBe(sessionId);
      expect(testSession.status).toBe('RUNNING');
      expect(testSession.ssid).toBe(targetNetwork.ssid);

      // Step 3: Get Test Status
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        // SELECT session
        rows: [
          {
            id: sessionId,
            user_id: testUserId,
            authorization_id: testAuthId,
            ssid: targetNetwork.ssid,
            bssid: targetNetwork.bssid,
            status: 'COMPLETED',
            started_at: new Date(),
            completed_at: new Date(),
            config: testConfig,
          },
        ],
      });

      const status = await networkAnalyzer.getTestStatus(sessionId);
      expect(status.status).toBe('COMPLETED');

      // Step 4: Get Network Results
      const vulnerabilities = [
        {
          id: 'vuln-1',
          test_session_id: sessionId,
          type: 'WEAK_ENCRYPTION',
          severity: 'HIGH',
          description: 'Network uses WPA instead of WPA2/WPA3',
          evidence: 'Detected WPA encryption',
          remediation: 'Upgrade to WPA2 or WPA3',
          discovered_at: new Date(),
        },
        {
          id: 'vuln-2',
          test_session_id: sessionId,
          type: 'INSECURE_PROTOCOL',
          severity: 'MEDIUM',
          description: 'Unencrypted HTTP traffic detected',
          evidence: 'HTTP packets captured',
          remediation: 'Use HTTPS for all communications',
          discovered_at: new Date(),
        },
      ];

      const devices = [
        {
          id: 'device-1',
          test_session_id: sessionId,
          mac_address: '00:11:22:33:44:55',
          ip_address: '192.168.1.100',
          hostname: 'laptop-01',
          vendor: 'Dell',
          discovered_at: new Date(),
        },
        {
          id: 'device-2',
          test_session_id: sessionId,
          mac_address: 'AA:BB:CC:DD:EE:FF',
          ip_address: '192.168.1.101',
          hostname: 'phone-01',
          vendor: 'Apple',
          discovered_at: new Date(),
        },
      ];

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // SELECT session
          rows: [
            {
              id: sessionId,
              user_id: testUserId,
              authorization_id: testAuthId,
              ssid: targetNetwork.ssid,
              bssid: targetNetwork.bssid,
              status: 'COMPLETED',
              started_at: new Date(),
              completed_at: new Date(),
              config: testConfig,
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT vulnerabilities
          rows: vulnerabilities,
        })
        .mockResolvedValueOnce({
          // SELECT devices
          rows: devices,
        });

      const results = await networkAnalyzer.getNetworkResults(sessionId);

      expect(results.sessionId).toBe(sessionId);
      expect(results.target.ssid).toBe(targetNetwork.ssid);
      expect(results.vulnerabilities).toHaveLength(2);
      expect(results.connectedDevices).toHaveLength(2);
      expect(results.trafficAnalysis).toBeDefined();

      // Step 5: Generate Report
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // SELECT session for report
          rows: [
            {
              id: sessionId,
              user_id: testUserId,
              authorization_id: testAuthId,
              ssid: targetNetwork.ssid,
              bssid: targetNetwork.bssid,
              status: 'COMPLETED',
              started_at: new Date(),
              completed_at: new Date(),
              config: testConfig,
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT vulnerabilities for report
          rows: vulnerabilities,
        })
        .mockResolvedValueOnce({
          // SELECT devices for report
          rows: devices,
        })
        .mockResolvedValueOnce({
          // INSERT report
          rows: [{ id: 'report-123' }],
        });

      const report = await reportGenerator.generateNetworkReport(
        sessionId,
        'JSON',
        {
          title: 'Network Analysis Report',
          author: 'Test User',
          organization: 'Test Organization',
          confidentialityLevel: 'CONFIDENTIAL',
        }
      );

      expect(report.id).toBeDefined();
      expect(report.type).toBe('NETWORK_ANALYSIS');
      expect(report.format).toBe('JSON');
      expect(report.content).toBeDefined();

      // Verify report content
      const reportContent = JSON.parse(report.content as string);
      expect(reportContent.sessionId).toBe(sessionId);
      expect(reportContent.ssid).toBe(targetNetwork.ssid);
      expect(reportContent.vulnerabilities).toHaveLength(2);
      expect(reportContent.connectedDevices).toHaveLength(2);
    });

    it('should reject network test without valid authorization', async () => {
      // Mock no authorization found
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        networkAnalyzer.startNetworkTest(
          testUserId,
          {
            ssid: 'TestNetwork',
            bssid: '00:11:22:33:44:55',
            authorizationId: 'invalid-auth-id',
          },
          {
            testTypes: ['WPA_HANDSHAKE_CAPTURE'],
            maxAttempts: 100,
          }
        )
      ).rejects.toThrow('No valid authorization found');
    });

    it('should reject network test for target outside authorized scope', async () => {
      // Mock authorization exists but network not in scope
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // findActiveByUserAndOperation
          rows: [
            {
              id: testAuthId,
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
              id: testAuthId,
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
          // findScopesByAuthorizationId - different network
          rows: [
            {
              id: 'scope-1',
              authorization_id: testAuthId,
              scope_type: 'NETWORK',
              scope_value: 'AuthorizedNetwork',
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          // findOperationsByAuthorizationId
          rows: [
            {
              authorization_id: testAuthId,
              operation_type: 'NETWORK_ANALYSIS',
            },
          ],
        });

      await expect(
        networkAnalyzer.startNetworkTest(
          testUserId,
          {
            ssid: 'UnauthorizedNetwork',
            bssid: '00:11:22:33:44:55',
            authorizationId: testAuthId,
          },
          {
            testTypes: ['WPA_HANDSHAKE_CAPTURE'],
            maxAttempts: 100,
          }
        )
      ).rejects.toThrow('outside authorized scope');
    });

    it('should execute only authorized test types', async () => {
      const sessionId = 'session-123';
      const targetNetwork = {
        ssid: 'TestNetwork',
        bssid: '00:11:22:33:44:55',
        authorizationId: testAuthId,
      };

      // Only authorize specific test types
      const authorizedTestTypes = ['TRAFFIC_ANALYSIS'] as const;
      const testConfig = {
        testTypes: authorizedTestTypes,
        maxAttempts: 100,
      };

      // Mock authorization and test session creation
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // findActiveByUserAndOperation
          rows: [
            {
              id: testAuthId,
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
              id: testAuthId,
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
          // findScopesByAuthorizationId
          rows: [
            {
              id: 'scope-1',
              authorization_id: testAuthId,
              scope_type: 'NETWORK',
              scope_value: targetNetwork.ssid,
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          // findOperationsByAuthorizationId
          rows: [
            {
              authorization_id: testAuthId,
              operation_type: 'NETWORK_ANALYSIS',
            },
          ],
        })
        .mockResolvedValueOnce({
          // INSERT network_test_session
          rows: [{ id: sessionId }],
        })
        .mockResolvedValueOnce({
          // UPDATE session status
          rows: [],
        })
        .mockResolvedValueOnce({
          // SELECT session
          rows: [
            {
              id: sessionId,
              user_id: testUserId,
              authorization_id: testAuthId,
              ssid: targetNetwork.ssid,
              bssid: targetNetwork.bssid,
              status: 'RUNNING',
              started_at: new Date(),
              completed_at: null,
              config: testConfig,
            },
          ],
        });

      const testSession = await networkAnalyzer.startNetworkTest(
        testUserId,
        targetNetwork,
        testConfig
      );

      expect(testSession.config.testTypes).toEqual(authorizedTestTypes);
      expect(testSession.config.testTypes).not.toContain('WEP_CRACK');
      expect(testSession.config.testTypes).not.toContain('DEAUTH_ATTACK');
    });

    it('should discover multiple access points', async () => {
      // Mock authorization validation
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        // findActiveByUserAndOperation
        rows: [
          {
            id: testAuthId,
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
      });

      const accessPoints = await networkAnalyzer.discoverAccessPoints(
        testUserId,
        testAuthId
      );

      expect(accessPoints.length).toBeGreaterThan(0);

      // Verify each access point has required fields
      accessPoints.forEach(ap => {
        expect(ap.ssid).toBeDefined();
        expect(ap.bssid).toBeDefined();
        expect(ap.channel).toBeDefined();
        expect(ap.encryption).toBeDefined();
        expect(ap.signalStrength).toBeDefined();
        expect(typeof ap.signalStrength).toBe('number');
        expect(ap.signalStrength).toBeLessThan(0); // Signal strength is negative
      });
    });

    it('should include traffic analysis in results', async () => {
      const sessionId = 'session-123';

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // SELECT session
          rows: [
            {
              id: sessionId,
              user_id: testUserId,
              authorization_id: testAuthId,
              ssid: 'TestNetwork',
              bssid: '00:11:22:33:44:55',
              status: 'COMPLETED',
              started_at: new Date(),
              completed_at: new Date(),
              config: {
                testTypes: ['TRAFFIC_ANALYSIS'],
                maxAttempts: 100,
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT vulnerabilities
          rows: [],
        })
        .mockResolvedValueOnce({
          // SELECT devices
          rows: [],
        });

      const results = await networkAnalyzer.getNetworkResults(sessionId);

      expect(results.trafficAnalysis).toBeDefined();
      expect(results.trafficAnalysis?.totalPackets).toBeGreaterThan(0);
      expect(results.trafficAnalysis?.protocols).toBeDefined();
      expect(results.trafficAnalysis?.insecureProtocols).toBeDefined();
      expect(Array.isArray(results.trafficAnalysis?.insecureProtocols)).toBe(true);
    });
  });
});
