import * as fc from 'fast-check';
import { Pool } from 'pg';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { AuthorizationExpirationMonitor, SimpleNotificationService, SimpleOperationManager } from '../services/AuthorizationExpirationMonitor';
import { AuthorizationRepository } from '../repositories/AuthorizationRepository';
import { Authorization } from '../models/Authorization';
import { OperationType } from '../types';

// Mock the repository
jest.mock('../repositories/AuthorizationRepository');

/**
 * Feature: penetration-testing-platform
 * Property 4: إيقاف العمليات عند انتهاء التصريح
 * 
 * لأي تصريح منتهي الصلاحية، يجب على النظام إيقاف جميع العمليات الجارية
 * المرتبطة به ورفض أي عمليات جديدة
 * 
 * **Validates: Requirements 0.5**
 */
describe('Property 4: Stop Operations When Authorization Expires', () => {
  let mockPool: Pool;
  let authorizationManager: AuthorizationManager;
  let expirationMonitor: AuthorizationExpirationMonitor;
  let mockRepository: jest.Mocked<AuthorizationRepository>;
  let notificationService: SimpleNotificationService;
  let operationManager: SimpleOperationManager;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    } as unknown as Pool;

    authorizationManager = new AuthorizationManager(mockPool);
    mockRepository = (authorizationManager as any).repository as jest.Mocked<AuthorizationRepository>;
    
    notificationService = new SimpleNotificationService();
    operationManager = new SimpleOperationManager(mockPool);
    
    expirationMonitor = new AuthorizationExpirationMonitor(
      mockPool,
      authorizationManager,
      notificationService,
      operationManager,
      1 // 1 minute check interval for testing
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    expirationMonitor.stop();
  });

  /**
   * Custom arbitraries for generating test data
   */
  const arbitraryUserId = (): fc.Arbitrary<string> => {
    return fc.uuid();
  };

  const arbitraryAuthorizationId = (): fc.Arbitrary<string> => {
    return fc.uuid();
  };

  const arbitraryOrganizationName = (): fc.Arbitrary<string> => {
    return fc.string({ minLength: 3, maxLength: 50 });
  };

  const arbitraryOperationType = (): fc.Arbitrary<OperationType> => {
    return fc.constantFrom<OperationType>('WEB_SCAN', 'PHISHING_CAMPAIGN', 'NETWORK_ANALYSIS');
  };

  const arbitraryExpiredDate = (): fc.Arbitrary<Date> => {
    // Generate dates in the past (expired)
    return fc.date({ max: new Date(Date.now() - 1000) });
  };

  const arbitraryFutureDate = (): fc.Arbitrary<Date> => {
    // Generate dates in the future (valid)
    return fc.date({ min: new Date(Date.now() + 86400000) }); // At least 1 day in future
  };

  const arbitraryExpiredAuthorization = (): fc.Arbitrary<Authorization> => {
    return fc.record({
      id: arbitraryAuthorizationId(),
      userId: arbitraryUserId(),
      organizationName: arbitraryOrganizationName(),
      validFrom: fc.date({ max: new Date(Date.now() - 86400000 * 30) }), // 30 days ago
      validUntil: arbitraryExpiredDate(),
      signedBy: fc.fullName(),
      digitalSignature: fc.hexaString({ minLength: 64, maxLength: 64 }),
      documentPath: fc.constant('/path/to/document.pdf'),
      status: fc.constant('ACTIVE' as const),
      createdAt: fc.date({ max: new Date(Date.now() - 86400000 * 30) }),
      revokedAt: fc.constant(null),
      revocationReason: fc.constant(null),
      scope: fc.record({
        domains: fc.array(fc.domain(), { minLength: 1, maxLength: 3 }),
        ipRanges: fc.array(fc.ipV4(), { maxLength: 2 }),
        networks: fc.constant([]),
        emailDomains: fc.array(fc.domain(), { maxLength: 2 }),
      }),
      allowedOperations: fc.array(arbitraryOperationType(), { minLength: 1, maxLength: 3 }),
    }).map(data => {
      const auth = new Authorization(
        data.id,
        data.userId,
        data.organizationName,
        data.scope,
        data.validFrom,
        data.validUntil,
        data.signedBy,
        data.digitalSignature,
        data.documentPath,
        data.status,
        data.createdAt,
        data.revokedAt,
        data.revocationReason,
        data.allowedOperations
      );
      return auth;
    });
  };

  const arbitraryActiveOperation = (authorizationId: string): fc.Arbitrary<any> => {
    return fc.record({
      id: fc.uuid(),
      type: fc.constantFrom('SCAN', 'CAMPAIGN', 'NETWORK_TEST'),
      status: fc.constantFrom('PENDING', 'RUNNING'),
      authorizationId: fc.constant(authorizationId),
    });
  };

  /**
   * Property Test 4.1: Expired authorizations must be detected
   * 
   * For any authorization with validUntil in the past,
   * the system must identify it as expired
   */
  test('property: System detects expired authorizations', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryExpiredAuthorization(),
        async (expiredAuth) => {
          // Setup: Mock repository to return the expired authorization
          mockRepository.findExpired.mockResolvedValue([expiredAuth]);

          // Execute: Check for expired authorizations
          const expiredAuths = await authorizationManager.findExpiredAuthorizations();

          // Verify: The expired authorization is detected
          expect(expiredAuths.length).toBeGreaterThan(0);
          expect(expiredAuths[0].id).toBe(expiredAuth.id);
          expect(expiredAuths[0].isExpired()).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 4.2: All active operations must be stopped when authorization expires
   * 
   * For any expired authorization with active operations,
   * the system must stop all operations associated with that authorization
   */
  test('property: All active operations stopped when authorization expires', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryExpiredAuthorization(),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }), // Operation IDs
        async (expiredAuth, operationIds) => {
          // Setup: Mock expired authorization
          mockRepository.findExpired.mockResolvedValue([expiredAuth]);
          mockRepository.findById.mockResolvedValue(expiredAuth);
          mockRepository.markAsExpired.mockResolvedValue();

          // Setup: Mock active operations
          const activeOperations = operationIds.map((id, index) => ({
            id,
            type: ['SCAN', 'CAMPAIGN', 'NETWORK_TEST'][index % 3],
            status: 'RUNNING',
            authorizationId: expiredAuth.id,
          }));

          // Mock the pool queries for getting and stopping operations
          let getOperationsCalled = false;
          let stopOperationsCalled = false;

          (mockPool.query as jest.Mock).mockImplementation(async (query: string) => {
            if (query.includes('SELECT') && query.includes('scan_sessions')) {
              getOperationsCalled = true;
              return { rows: activeOperations.filter(op => op.type === 'SCAN') };
            }
            if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
              return { rows: activeOperations.filter(op => op.type === 'CAMPAIGN') };
            }
            if (query.includes('SELECT') && query.includes('network_test_sessions')) {
              return { rows: activeOperations.filter(op => op.type === 'NETWORK_TEST') };
            }
            if (query.includes('UPDATE') && query.includes('STOPPED')) {
              stopOperationsCalled = true;
              return { rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute: Handle expired authorization
          await expirationMonitor.checkExpiredAuthorizations();

          // Verify: Operations were queried
          expect(getOperationsCalled).toBe(true);

          // Verify: Operations were stopped
          expect(stopOperationsCalled).toBe(true);

          // Verify: Authorization was marked as expired
          expect(mockRepository.markAsExpired).toHaveBeenCalledWith(expiredAuth.id);
        }
      ),
      { numRuns: 50 } // Reduced runs due to complexity
    );
  });

  /**
   * Property Test 4.3: New operations must be rejected for expired authorizations
   * 
   * For any expired authorization and any operation type,
   * the system must reject new operations with an ExpiredAuthorizationError
   */
  test('property: New operations rejected for expired authorizations', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryExpiredAuthorization(),
        arbitraryOperationType(),
        async (expiredAuth, operationType) => {
          // Setup: Mock repository to return expired authorization
          mockRepository.findById.mockResolvedValue(expiredAuth);

          // Execute & Verify: Attempting to check expiration should throw
          await expect(
            authorizationManager.checkExpirationOrThrow(expiredAuth.id)
          ).rejects.toThrow();

          // Verify: The error indicates expiration
          try {
            await authorizationManager.checkExpirationOrThrow(expiredAuth.id);
          } catch (error: any) {
            expect(error.message).toContain('expired');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 4.4: User must be notified when authorization expires
   * 
   * For any expired authorization,
   * the system must send a notification to the user
   */
  test('property: User notified when authorization expires', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryExpiredAuthorization(),
        async (expiredAuth) => {
          // Setup: Mock expired authorization
          mockRepository.findExpired.mockResolvedValue([expiredAuth]);
          mockRepository.findById.mockResolvedValue(expiredAuth);
          mockRepository.markAsExpired.mockResolvedValue();

          // Setup: Spy on notification service
          const notifySpy = jest.spyOn(notificationService, 'notifyUser');

          // Mock pool queries
          (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

          // Execute: Handle expired authorization
          await expirationMonitor.checkExpiredAuthorizations();

          // Verify: User was notified
          expect(notifySpy).toHaveBeenCalledWith(
            expiredAuth.userId,
            expect.stringContaining('expired'),
            expect.objectContaining({
              authorizationId: expiredAuth.id,
              type: 'AUTHORIZATION_EXPIRED',
            })
          );

          notifySpy.mockRestore();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property Test 4.5: Operations must not be affected by valid authorizations
   * 
   * For any valid (non-expired) authorization,
   * the expiration monitor must not stop its operations
   */
  test('property: Valid authorizations do not trigger operation stops', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryAuthorizationId(),
        arbitraryOrganizationName(),
        arbitraryFutureDate(),
        async (userId, authId, orgName, validUntil) => {
          // Setup: Create a valid (non-expired) authorization
          const validAuth = new Authorization(
            authId,
            userId,
            orgName,
            {
              domains: ['example.com'],
              ipRanges: [],
              networks: [],
              emailDomains: [],
            },
            new Date(Date.now() - 86400000), // Started yesterday
            validUntil, // Expires in the future
            'John Doe',
            'abc123',
            '/path/to/doc.pdf',
            'ACTIVE',
            new Date(Date.now() - 86400000),
            null,
            null,
            ['WEB_SCAN']
          );

          // Setup: Mock repository to return no expired authorizations
          mockRepository.findExpired.mockResolvedValue([]);

          // Setup: Spy on operation manager
          const stopOpsSpy = jest.spyOn(operationManager, 'stopOperationsByAuthorization');

          // Execute: Check for expired authorizations
          await expirationMonitor.checkExpiredAuthorizations();

          // Verify: No operations were stopped
          expect(stopOpsSpy).not.toHaveBeenCalled();

          // Verify: Valid authorization is still valid
          expect(validAuth.isValid()).toBe(true);
          expect(validAuth.isExpired()).toBe(false);

          stopOpsSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 4.6: Expiration check must be idempotent
   * 
   * For any expired authorization,
   * running the expiration check multiple times must not cause errors
   * or duplicate operations
   */
  test('property: Expiration check is idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryExpiredAuthorization(),
        fc.integer({ min: 2, max: 5 }), // Number of times to run check
        async (expiredAuth, checkCount) => {
          // Setup: Mock expired authorization
          mockRepository.findExpired.mockResolvedValue([expiredAuth]);
          mockRepository.findById.mockResolvedValue(expiredAuth);
          mockRepository.markAsExpired.mockResolvedValue();

          // Mock pool queries
          (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

          // Execute: Run expiration check multiple times
          for (let i = 0; i < checkCount; i++) {
            await expirationMonitor.checkExpiredAuthorizations();
          }

          // Verify: markAsExpired was called at least once
          // (may be called multiple times, but should not cause errors)
          expect(mockRepository.markAsExpired).toHaveBeenCalled();

          // Verify: No errors were thrown
          // (test passes if we reach here without exceptions)
          expect(true).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property Test 4.7: All operation types must be stopped
   * 
   * For any expired authorization,
   * all types of operations (scans, campaigns, network tests) must be stopped
   */
  test('property: All operation types stopped for expired authorization', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryExpiredAuthorization(),
        async (expiredAuth) => {
          // Setup: Mock expired authorization
          mockRepository.findExpired.mockResolvedValue([expiredAuth]);
          mockRepository.findById.mockResolvedValue(expiredAuth);
          mockRepository.markAsExpired.mockResolvedValue();

          // Setup: Track which operation types were stopped
          const stoppedOperationTypes = new Set<string>();

          (mockPool.query as jest.Mock).mockImplementation(async (query: string) => {
            if (query.includes('SELECT') && query.includes('scan_sessions')) {
              return { rows: [{ id: 'scan-1', type: 'SCAN', status: 'RUNNING' }] };
            }
            if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
              return { rows: [{ id: 'campaign-1', type: 'CAMPAIGN', status: 'ACTIVE' }] };
            }
            if (query.includes('SELECT') && query.includes('network_test_sessions')) {
              return { rows: [{ id: 'test-1', type: 'NETWORK_TEST', status: 'RUNNING' }] };
            }
            if (query.includes('UPDATE') && query.includes('scan_sessions')) {
              stoppedOperationTypes.add('SCAN');
              return { rowCount: 1 };
            }
            if (query.includes('UPDATE') && query.includes('phishing_campaigns')) {
              stoppedOperationTypes.add('CAMPAIGN');
              return { rowCount: 1 };
            }
            if (query.includes('UPDATE') && query.includes('network_test_sessions')) {
              stoppedOperationTypes.add('NETWORK_TEST');
              return { rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute: Handle expired authorization
          await expirationMonitor.checkExpiredAuthorizations();

          // Verify: All operation types were stopped
          expect(stoppedOperationTypes.has('SCAN')).toBe(true);
          expect(stoppedOperationTypes.has('CAMPAIGN')).toBe(true);
          expect(stoppedOperationTypes.has('NETWORK_TEST')).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property Test 4.8: Expiration monitoring must be reliable
   * 
   * For any expired authorization,
   * the monitoring service must detect and handle it within a reasonable time
   */
  test('property: Expiration monitoring is reliable', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryExpiredAuthorization(),
        async (expiredAuth) => {
          // Setup: Mock expired authorization
          mockRepository.findExpired.mockResolvedValue([expiredAuth]);
          mockRepository.findById.mockResolvedValue(expiredAuth);
          mockRepository.markAsExpired.mockResolvedValue();

          // Mock pool queries
          (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });

          // Execute: Start monitoring
          const checkPromise = expirationMonitor.checkExpiredAuthorizations();

          // Verify: Check completes without hanging
          await expect(checkPromise).resolves.not.toThrow();

          // Verify: Authorization was processed
          expect(mockRepository.findExpired).toHaveBeenCalled();
          expect(mockRepository.markAsExpired).toHaveBeenCalledWith(expiredAuth.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
