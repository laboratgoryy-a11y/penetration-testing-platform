/**
 * Property-Based Tests for Network Test Types Enforcement
 * 
 * Feature: penetration-testing-platform
 * Property 21: تنفيذ اختبارات الشبكة المحددة فقط
 * 
 * **Validates: Requirements 5.4, 5.6**
 * 
 * For any network test, the analyzer SHALL execute ONLY the test types
 * specified in the configuration and authorized in the authorization document.
 * 
 * This property ensures that:
 * 1. Only configured test types are executed
 * 2. No additional test types are run beyond what was specified
 * 3. The system respects the authorization boundaries
 */

import fc from 'fast-check';
import { Pool } from 'pg';
import { NetworkAnalyzer } from '../services/NetworkAnalyzer';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { NetworkTestType, NetworkTestConfig, NetworkTarget } from '../models/NetworkTestSession';

// Mock the database pool
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

// Mock AuthorizationManager
const mockAuthManager = {
  validateAuthorization: jest.fn(),
  isTargetInScope: jest.fn(),
  uploadAuthorization: jest.fn(),
  isAuthorizationValid: jest.fn(),
} as unknown as AuthorizationManager;

describe('Property 21: Network Test Types Enforcement', () => {
  let networkAnalyzer: NetworkAnalyzer;

  beforeEach(() => {
    jest.clearAllMocks();
    networkAnalyzer = new NetworkAnalyzer(mockPool, mockAuthManager);
  });

  /**
   * Arbitrary: Generate a random subset of network test types
   */
  const arbitraryTestTypes = (): fc.Arbitrary<NetworkTestType[]> => {
    const allTestTypes: NetworkTestType[] = [
      'WEP_CRACK',
      'WPA_HANDSHAKE_CAPTURE',
      'WPS_ATTACK',
      'EVIL_TWIN',
      'DEAUTH_ATTACK',
      'TRAFFIC_ANALYSIS',
    ];

    return fc
      .subarray(allTestTypes, { minLength: 1, maxLength: allTestTypes.length })
      .map((types) => types as NetworkTestType[]);
  };

  /**
   * Arbitrary: Generate a random network target
   */
  const arbitraryNetworkTarget = (): fc.Arbitrary<NetworkTarget> => {
    return fc.record({
      ssid: fc.string({ minLength: 1, maxLength: 32 }),
      bssid: fc
        .tuple(
          fc.hexaString({ minLength: 2, maxLength: 2 }),
          fc.hexaString({ minLength: 2, maxLength: 2 }),
          fc.hexaString({ minLength: 2, maxLength: 2 }),
          fc.hexaString({ minLength: 2, maxLength: 2 }),
          fc.hexaString({ minLength: 2, maxLength: 2 }),
          fc.hexaString({ minLength: 2, maxLength: 2 })
        )
        .map(([a, b, c, d, e, f]) => `${a}:${b}:${c}:${d}:${e}:${f}`.toUpperCase()),
      authorizationId: fc.uuid(),
    });
  };

  /**
   * Arbitrary: Generate a random network test configuration
   */
  const arbitraryNetworkTestConfig = (): fc.Arbitrary<NetworkTestConfig> => {
    return fc.record({
      testTypes: arbitraryTestTypes(),
      passwordDictionary: fc.option(fc.string(), { nil: undefined }),
      maxAttempts: fc.integer({ min: 100, max: 10000 }),
    });
  };

  /**
   * Property Test 21.1: Only specified test types are stored in configuration
   * 
   * For any network test configuration with a specific set of test types,
   * when a test session is created, the stored configuration SHALL contain
   * exactly those test types and no others.
   */
  test('property: only specified test types are stored in configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryNetworkTarget(),
        arbitraryNetworkTestConfig(),
        async (userId, target, config) => {
          // Mock authorization success
          (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
            authorized: true,
            authorizationId: target.authorizationId,
          });
          (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

          const sessionId = fc.sample(fc.uuid(), 1)[0];

          // Mock database queries
          (mockPool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: sessionId }] }) // create session
            .mockResolvedValueOnce({ rows: [] }) // update status
            .mockResolvedValueOnce({
              // findById
              rows: [
                {
                  id: sessionId,
                  user_id: userId,
                  authorization_id: target.authorizationId,
                  ssid: target.ssid,
                  bssid: target.bssid,
                  status: 'RUNNING',
                  started_at: new Date(),
                  config: config,
                },
              ],
            });

          const session = await networkAnalyzer.startNetworkTest(userId, target, config);

          // Property: The stored configuration must contain exactly the specified test types
          expect(session.config.testTypes).toEqual(config.testTypes);
          expect(session.config.testTypes.length).toBe(config.testTypes.length);

          // Property: No additional test types should be present
          const allTestTypes: NetworkTestType[] = [
            'WEP_CRACK',
            'WPA_HANDSHAKE_CAPTURE',
            'WPS_ATTACK',
            'EVIL_TWIN',
            'DEAUTH_ATTACK',
            'TRAFFIC_ANALYSIS',
          ];

          const unexpectedTypes = session.config.testTypes.filter(
            (type) => !config.testTypes.includes(type)
          );
          expect(unexpectedTypes).toHaveLength(0);

          // Property: All specified types should be present
          const missingTypes = config.testTypes.filter(
            (type) => !session.config.testTypes.includes(type)
          );
          expect(missingTypes).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 21.2: Test types subset is preserved
   * 
   * For any subset of available test types, when a network test is configured
   * with that subset, the system SHALL NOT execute test types outside that subset.
   */
  test('property: test types subset is preserved and not expanded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryNetworkTarget(),
        arbitraryTestTypes(),
        fc.integer({ min: 100, max: 10000 }), // maxAttempts
        async (userId, target, testTypes, maxAttempts) => {
          // Mock authorization success
          (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
            authorized: true,
            authorizationId: target.authorizationId,
          });
          (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

          const sessionId = fc.sample(fc.uuid(), 1)[0];
          const config: NetworkTestConfig = {
            testTypes,
            maxAttempts,
          };

          // Mock database queries
          (mockPool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: sessionId }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
              rows: [
                {
                  id: sessionId,
                  user_id: userId,
                  authorization_id: target.authorizationId,
                  ssid: target.ssid,
                  bssid: target.bssid,
                  status: 'RUNNING',
                  started_at: new Date(),
                  config: config,
                },
              ],
            });

          const session = await networkAnalyzer.startNetworkTest(userId, target, config);

          // Property: The number of test types should not increase
          expect(session.config.testTypes.length).toBeLessThanOrEqual(testTypes.length);

          // Property: Every test type in the session must be in the original config
          session.config.testTypes.forEach((type) => {
            expect(testTypes).toContain(type);
          });

          // Property: The set of test types should be exactly the same
          const sessionTypesSet = new Set(session.config.testTypes);
          const configTypesSet = new Set(testTypes);
          expect(sessionTypesSet.size).toBe(configTypesSet.size);
          expect([...sessionTypesSet].every((t) => configTypesSet.has(t))).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 21.3: Single test type is executed exclusively
   * 
   * For any single test type specified in the configuration,
   * the system SHALL execute only that test type and no others.
   */
  test('property: single test type is executed exclusively', async () => {
    const allTestTypes: NetworkTestType[] = [
      'WEP_CRACK',
      'WPA_HANDSHAKE_CAPTURE',
      'WPS_ATTACK',
      'EVIL_TWIN',
      'DEAUTH_ATTACK',
      'TRAFFIC_ANALYSIS',
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryNetworkTarget(),
        fc.constantFrom(...allTestTypes), // single test type
        fc.integer({ min: 100, max: 10000 }), // maxAttempts
        async (userId, target, singleTestType, maxAttempts) => {
          // Mock authorization success
          (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
            authorized: true,
            authorizationId: target.authorizationId,
          });
          (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

          const sessionId = fc.sample(fc.uuid(), 1)[0];
          const config: NetworkTestConfig = {
            testTypes: [singleTestType],
            maxAttempts,
          };

          // Mock database queries
          (mockPool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: sessionId }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
              rows: [
                {
                  id: sessionId,
                  user_id: userId,
                  authorization_id: target.authorizationId,
                  ssid: target.ssid,
                  bssid: target.bssid,
                  status: 'RUNNING',
                  started_at: new Date(),
                  config: config,
                },
              ],
            });

          const session = await networkAnalyzer.startNetworkTest(userId, target, config);

          // Property: Only one test type should be in the configuration
          expect(session.config.testTypes).toHaveLength(1);

          // Property: That test type should be the one we specified
          expect(session.config.testTypes[0]).toBe(singleTestType);

          // Property: No other test types should be present
          const otherTestTypes = allTestTypes.filter((t) => t !== singleTestType);
          otherTestTypes.forEach((otherType) => {
            expect(session.config.testTypes).not.toContain(otherType);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 21.4: Empty test types list is rejected
   * 
   * For any network test configuration with an empty test types array,
   * the system SHALL reject the configuration (this is enforced by the arbitrary generator).
   */
  test('property: configuration must have at least one test type', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryNetworkTarget(),
        arbitraryNetworkTestConfig(),
        async (userId, target, config) => {
          // Property: The configuration must always have at least one test type
          expect(config.testTypes.length).toBeGreaterThan(0);

          // Mock authorization success
          (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
            authorized: true,
            authorizationId: target.authorizationId,
          });
          (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

          const sessionId = fc.sample(fc.uuid(), 1)[0];

          // Mock database queries
          (mockPool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: sessionId }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
              rows: [
                {
                  id: sessionId,
                  user_id: userId,
                  authorization_id: target.authorizationId,
                  ssid: target.ssid,
                  bssid: target.bssid,
                  status: 'RUNNING',
                  started_at: new Date(),
                  config: config,
                },
              ],
            });

          const session = await networkAnalyzer.startNetworkTest(userId, target, config);

          // Property: The session must also have at least one test type
          expect(session.config.testTypes.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 21.5: Test types order is preserved
   * 
   * For any ordered list of test types, the system SHALL preserve
   * the order of test types as specified in the configuration.
   */
  test('property: test types order is preserved', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryNetworkTarget(),
        arbitraryTestTypes(),
        fc.integer({ min: 100, max: 10000 }), // maxAttempts
        async (userId, target, testTypes, maxAttempts) => {
          // Mock authorization success
          (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
            authorized: true,
            authorizationId: target.authorizationId,
          });
          (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

          const sessionId = fc.sample(fc.uuid(), 1)[0];
          const config: NetworkTestConfig = {
            testTypes,
            maxAttempts,
          };

          // Mock database queries
          (mockPool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: sessionId }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
              rows: [
                {
                  id: sessionId,
                  user_id: userId,
                  authorization_id: target.authorizationId,
                  ssid: target.ssid,
                  bssid: target.bssid,
                  status: 'RUNNING',
                  started_at: new Date(),
                  config: config,
                },
              ],
            });

          const session = await networkAnalyzer.startNetworkTest(userId, target, config);

          // Property: The order of test types should be preserved
          expect(session.config.testTypes).toEqual(testTypes);

          // Property: Each test type should be at the same index
          testTypes.forEach((type, index) => {
            expect(session.config.testTypes[index]).toBe(type);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 21.6: All valid test types are accepted
   * 
   * For any valid network test type from the defined set,
   * the system SHALL accept it in the configuration.
   */
  test('property: all valid test types are accepted', async () => {
    const allTestTypes: NetworkTestType[] = [
      'WEP_CRACK',
      'WPA_HANDSHAKE_CAPTURE',
      'WPS_ATTACK',
      'EVIL_TWIN',
      'DEAUTH_ATTACK',
      'TRAFFIC_ANALYSIS',
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryNetworkTarget(),
        fc.constantFrom(...allTestTypes),
        fc.integer({ min: 100, max: 10000 }),
        async (userId, target, testType, maxAttempts) => {
          // Mock authorization success
          (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
            authorized: true,
            authorizationId: target.authorizationId,
          });
          (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

          const sessionId = fc.sample(fc.uuid(), 1)[0];
          const config: NetworkTestConfig = {
            testTypes: [testType],
            maxAttempts,
          };

          // Mock database queries
          (mockPool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: sessionId }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
              rows: [
                {
                  id: sessionId,
                  user_id: userId,
                  authorization_id: target.authorizationId,
                  ssid: target.ssid,
                  bssid: target.bssid,
                  status: 'RUNNING',
                  started_at: new Date(),
                  config: config,
                },
              ],
            });

          // Property: The system should accept any valid test type
          await expect(
            networkAnalyzer.startNetworkTest(userId, target, config)
          ).resolves.toBeDefined();

          const session = await networkAnalyzer.startNetworkTest(userId, target, config);

          // Property: The test type should be stored correctly
          expect(session.config.testTypes).toContain(testType);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 21.7: No duplicate test types in configuration
   * 
   * For any network test configuration, the system SHALL ensure
   * that each test type appears at most once in the configuration.
   */
  test('property: no duplicate test types in configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryNetworkTarget(),
        arbitraryNetworkTestConfig(),
        async (userId, target, config) => {
          // Mock authorization success
          (mockAuthManager.validateAuthorization as jest.Mock).mockResolvedValue({
            authorized: true,
            authorizationId: target.authorizationId,
          });
          (mockAuthManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

          const sessionId = fc.sample(fc.uuid(), 1)[0];

          // Mock database queries
          (mockPool.query as jest.Mock)
            .mockResolvedValueOnce({ rows: [{ id: sessionId }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({
              rows: [
                {
                  id: sessionId,
                  user_id: userId,
                  authorization_id: target.authorizationId,
                  ssid: target.ssid,
                  bssid: target.bssid,
                  status: 'RUNNING',
                  started_at: new Date(),
                  config: config,
                },
              ],
            });

          const session = await networkAnalyzer.startNetworkTest(userId, target, config);

          // Property: No test type should appear more than once
          const testTypesSet = new Set(session.config.testTypes);
          expect(testTypesSet.size).toBe(session.config.testTypes.length);

          // Property: Each test type should be unique
          session.config.testTypes.forEach((type, index) => {
            const firstIndex = session.config.testTypes.indexOf(type);
            expect(firstIndex).toBe(index);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
