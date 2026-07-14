import * as fc from 'fast-check';
import { Pool } from 'pg';
import { AuthorizationBypassDetector, BypassAttemptType } from '../services/AuthorizationBypassDetector';
import { NotificationService } from '../services/AuthorizationExpirationMonitor';

/**
 * Feature: penetration-testing-platform
 * Property 6: حظر محاولات تجاوز التصريح
 * 
 * لأي محاولة لتجاوز ضوابط التصريح، يجب على النظام حظر الحساب فوراً،
 * تسجيل المحاولة، وإرسال تنبيه للمدقق
 * 
 * **Validates: Requirements 0.7، 11.4**
 */
describe('Property 6: Blocking Authorization Bypass Attempts', () => {
  let mockPool: Pool;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let bypassDetector: AuthorizationBypassDetector;
  let queryMock: jest.Mock;

  beforeEach(() => {
    queryMock = jest.fn();
    mockPool = {
      query: queryMock,
      connect: jest.fn(),
      end: jest.fn(),
    } as unknown as Pool;

    mockNotificationService = {
      notifyUser: jest.fn().mockResolvedValue(undefined),
      notifyAuditor: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationService>;

    bypassDetector = new AuthorizationBypassDetector(
      mockPool,
      mockNotificationService,
      {
        maxAttemptsBeforeLock: 3,
        attemptWindowMinutes: 15,
        autoLockEnabled: true,
        notifyAuditorEnabled: true,
      }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Custom arbitraries for generating test data
   */
  const arbitraryUserId = (): fc.Arbitrary<string> => {
    return fc.uuid();
  };

  const arbitraryBypassAttemptType = (): fc.Arbitrary<BypassAttemptType> => {
    return fc.constantFrom<BypassAttemptType>(
      'MISSING_AUTHORIZATION',
      'EXPIRED_AUTHORIZATION',
      'SCOPE_VIOLATION',
      'OPERATION_NOT_ALLOWED',
      'TAMPERED_AUTHORIZATION',
      'MULTIPLE_FAILED_VALIDATIONS'
    );
  };

  const arbitraryIpAddress = (): fc.Arbitrary<string> => {
    return fc.ipV4();
  };

  const arbitraryUserAgent = (): fc.Arbitrary<string> => {
    return fc.constantFrom(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    );
  };

  const arbitraryDetails = (): fc.Arbitrary<Record<string, any>> => {
    return fc.record({
      target: fc.webUrl(),
      operationType: fc.constantFrom('WEB_SCAN', 'PHISHING_CAMPAIGN', 'NETWORK_ANALYSIS'),
      reason: fc.string({ minLength: 10, maxLength: 100 }),
    });
  };

  /**
   * Property Test 6.1: Bypass attempt must be logged in audit logs
   * 
   * For any bypass attempt, the system must create an audit log entry
   * with all relevant details (user, type, timestamp, IP, user agent)
   */
  test('property: Bypass attempts are logged in audit logs', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryBypassAttemptType(),
        arbitraryDetails(),
        arbitraryIpAddress(),
        arbitraryUserAgent(),
        async (userId, attemptType, details, ipAddress, userAgent) => {
          // Setup: Mock database responses
          queryMock
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // INSERT audit log
            .mockResolvedValueOnce({ rows: [{ attempt_count: '1' }], rowCount: 1 }); // COUNT attempts

          // Execute: Record bypass attempt
          await bypassDetector.recordBypassAttempt(
            userId,
            attemptType,
            details,
            ipAddress,
            userAgent
          );

          // Verify: Audit log was created
          expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO audit_logs'),
            expect.arrayContaining([
              userId,
              'SECURITY_VIOLATION',
              'authorization',
              attemptType,
              'FAILURE',
              expect.any(String), // JSON details
              ipAddress,
              userAgent,
            ])
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 6.2: Account is locked after threshold attempts
   * 
   * For any user, after N bypass attempts within the time window,
   * the account must be automatically locked
   */
  test('property: Account locked after threshold bypass attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryBypassAttemptType(),
        arbitraryDetails(),
        arbitraryIpAddress(),
        arbitraryUserAgent(),
        async (userId, attemptType, details, ipAddress, userAgent) => {
          // Setup: Mock that user has reached threshold (3 attempts)
          queryMock
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // INSERT audit log
            .mockResolvedValueOnce({ rows: [{ attempt_count: '3' }], rowCount: 1 }) // COUNT attempts (threshold reached)
            .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE users (lock account)
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // INSERT audit log (account locked)

          // Execute: Record bypass attempt
          await bypassDetector.recordBypassAttempt(
            userId,
            attemptType,
            details,
            ipAddress,
            userAgent
          );

          // Verify: Account was locked
          expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE users'),
            expect.arrayContaining([userId])
          );

          // Verify: Account lock was logged
          const lockLogCall = queryMock.mock.calls.find(
            (call) =>
              call[0].includes('INSERT INTO audit_logs') &&
              call[1].includes('ACCOUNT_LOCKED')
          );
          expect(lockLogCall).toBeDefined();

          // Verify: User was notified
          expect(mockNotificationService.notifyUser).toHaveBeenCalledWith(
            userId,
            expect.stringContaining('locked'),
            expect.objectContaining({
              reason: attemptType,
              type: 'ACCOUNT_LOCKED',
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 6.3: Auditor is notified of bypass attempts
   * 
   * For any bypass attempt, the auditor must receive a notification
   * with details about the attempt and whether the account was locked
   */
  test('property: Auditor notified of bypass attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryBypassAttemptType(),
        arbitraryDetails(),
        arbitraryIpAddress(),
        arbitraryUserAgent(),
        fc.boolean(), // Whether threshold is reached
        async (userId, attemptType, details, ipAddress, userAgent, thresholdReached) => {
          // Setup: Mock database responses
          const attemptCount = thresholdReached ? '3' : '1';
          queryMock
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // INSERT audit log
            .mockResolvedValueOnce({ rows: [{ attempt_count: attemptCount }], rowCount: 1 }); // COUNT attempts

          if (thresholdReached) {
            queryMock
              .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE users (lock)
              .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // INSERT audit log (lock)
          }

          // Execute: Record bypass attempt
          await bypassDetector.recordBypassAttempt(
            userId,
            attemptType,
            details,
            ipAddress,
            userAgent
          );

          // Verify: Auditor was notified
          expect(mockNotificationService.notifyAuditor).toHaveBeenCalledWith(
            expect.stringContaining(userId),
            expect.objectContaining({
              userId,
              attemptType,
              details,
              accountLocked: thresholdReached,
              type: 'AUTHORIZATION_BYPASS_ATTEMPT',
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 6.4: Multiple bypass attempt types are all detected
   * 
   * For any type of bypass attempt, the system must detect and handle it
   * consistently (log, check threshold, lock if needed, notify)
   */
  test('property: All bypass attempt types are detected and handled', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryBypassAttemptType(),
        arbitraryDetails(),
        arbitraryIpAddress(),
        arbitraryUserAgent(),
        async (userId, attemptType, details, ipAddress, userAgent) => {
          // Setup: Mock database responses (below threshold)
          queryMock
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // INSERT audit log
            .mockResolvedValueOnce({ rows: [{ attempt_count: '1' }], rowCount: 1 }); // COUNT attempts

          // Execute: Record bypass attempt
          await bypassDetector.recordBypassAttempt(
            userId,
            attemptType,
            details,
            ipAddress,
            userAgent
          );

          // Verify: Attempt was logged with correct type
          expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO audit_logs'),
            expect.arrayContaining([
              userId,
              'SECURITY_VIOLATION',
              'authorization',
              attemptType, // Specific attempt type
              'FAILURE',
              expect.any(String),
              ipAddress,
              userAgent,
            ])
          );

          // Verify: Threshold check was performed
          expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining('SELECT COUNT(*)'),
            expect.arrayContaining([userId, expect.any(Date)])
          );

          // Verify: Auditor was notified
          expect(mockNotificationService.notifyAuditor).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 6.5: Bypass attempts within time window are counted
   * 
   * For any user, only bypass attempts within the configured time window
   * should count towards the threshold for account locking
   */
  test('property: Only recent attempts within time window count', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryBypassAttemptType(),
        arbitraryDetails(),
        arbitraryIpAddress(),
        arbitraryUserAgent(),
        async (userId, attemptType, details, ipAddress, userAgent) => {
          // Setup: Mock database responses
          queryMock
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // INSERT audit log
            .mockResolvedValueOnce({ rows: [{ attempt_count: '2' }], rowCount: 1 }); // COUNT attempts

          // Execute: Record bypass attempt
          await bypassDetector.recordBypassAttempt(
            userId,
            attemptType,
            details,
            ipAddress,
            userAgent
          );

          // Verify: Count query includes time window filter
          const countCall = queryMock.mock.calls.find(
            (call) => call[0].includes('SELECT COUNT(*)')
          );
          expect(countCall).toBeDefined();
          expect(countCall![0]).toContain('timestamp >=');
          
          // Verify: Time threshold is passed as parameter
          const timeParam = countCall![1][1];
          expect(timeParam).toBeInstanceOf(Date);
          
          // Verify: Time is within configured window (15 minutes)
          const now = new Date();
          const timeDiff = now.getTime() - timeParam.getTime();
          const expectedWindow = 15 * 60 * 1000; // 15 minutes in milliseconds
          expect(timeDiff).toBeLessThanOrEqual(expectedWindow + 1000); // Allow 1 second tolerance
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 6.6: Account lock is immediate upon threshold
   * 
   * For any user reaching the bypass attempt threshold,
   * the account must be locked immediately in the same transaction
   */
  test('property: Account lock is immediate upon reaching threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryBypassAttemptType(),
        arbitraryDetails(),
        arbitraryIpAddress(),
        arbitraryUserAgent(),
        async (userId, attemptType, details, ipAddress, userAgent) => {
          // Setup: Mock that threshold is reached
          queryMock
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // INSERT audit log
            .mockResolvedValueOnce({ rows: [{ attempt_count: '3' }], rowCount: 1 }) // COUNT (threshold)
            .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE users (lock)
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // INSERT audit log (lock)

          // Execute: Record bypass attempt
          await bypassDetector.recordBypassAttempt(
            userId,
            attemptType,
            details,
            ipAddress,
            userAgent
          );

          // Verify: Lock happens after count check
          const callOrder = queryMock.mock.calls.map((call) => {
            if (call[0].includes('SELECT COUNT(*)')) return 'count';
            if (call[0].includes('UPDATE users')) return 'lock';
            return 'other';
          });

          const countIndex = callOrder.indexOf('count');
          const lockIndex = callOrder.indexOf('lock');

          expect(countIndex).toBeGreaterThanOrEqual(0);
          expect(lockIndex).toBeGreaterThan(countIndex);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 6.7: Bypass detection can be configured
   * 
   * For any valid configuration, the bypass detector must respect
   * the configured thresholds and behaviors
   */
  test('property: Bypass detection respects configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // maxAttemptsBeforeLock
        fc.integer({ min: 5, max: 60 }), // attemptWindowMinutes
        fc.boolean(), // autoLockEnabled
        fc.boolean(), // notifyAuditorEnabled
        arbitraryUserId(),
        arbitraryBypassAttemptType(),
        arbitraryDetails(),
        arbitraryIpAddress(),
        arbitraryUserAgent(),
        async (
          maxAttempts,
          windowMinutes,
          autoLock,
          notifyAuditor,
          userId,
          attemptType,
          details,
          ipAddress,
          userAgent
        ) => {
          // Setup: Create detector with custom config
          const customDetector = new AuthorizationBypassDetector(
            mockPool,
            mockNotificationService,
            {
              maxAttemptsBeforeLock: maxAttempts,
              attemptWindowMinutes: windowMinutes,
              autoLockEnabled: autoLock,
              notifyAuditorEnabled: notifyAuditor,
            }
          );

          // Setup: Mock that threshold is reached
          queryMock
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // INSERT audit log
            .mockResolvedValueOnce({
              rows: [{ attempt_count: maxAttempts.toString() }],
              rowCount: 1,
            }); // COUNT (threshold)

          if (autoLock) {
            queryMock
              .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE users (lock)
              .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // INSERT audit log (lock)
          }

          // Execute: Record bypass attempt
          await customDetector.recordBypassAttempt(
            userId,
            attemptType,
            details,
            ipAddress,
            userAgent
          );

          // Verify: Auto-lock behavior matches configuration
          const lockCalls = queryMock.mock.calls.filter((call) =>
            call[0].includes('UPDATE users')
          );
          if (autoLock) {
            expect(lockCalls.length).toBeGreaterThan(0);
          } else {
            expect(lockCalls.length).toBe(0);
          }

          // Verify: Auditor notification matches configuration
          if (notifyAuditor) {
            expect(mockNotificationService.notifyAuditor).toHaveBeenCalled();
          } else {
            expect(mockNotificationService.notifyAuditor).not.toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 50 } // Fewer runs due to complexity
    );
  });

  /**
   * Property Test 6.8: Bypass attempts are retrievable for audit
   * 
   * For any user with bypass attempts, the system must be able to
   * retrieve all attempts for audit purposes
   */
  test('property: Bypass attempts are retrievable for audit', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        fc.array(
          fc.record({
            attemptType: arbitraryBypassAttemptType(),
            details: arbitraryDetails(),
            ipAddress: arbitraryIpAddress(),
            userAgent: arbitraryUserAgent(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (userId, attempts) => {
          // Setup: Mock retrieval of attempts
          const mockAttempts = attempts.map((attempt, index) => ({
            id: `attempt-${index}`,
            user_id: userId,
            attempt_type: attempt.attemptType,
            timestamp: new Date(),
            details: attempt.details,
            ip_address: attempt.ipAddress,
            user_agent: attempt.userAgent,
          }));

          queryMock.mockResolvedValueOnce({
            rows: mockAttempts,
            rowCount: mockAttempts.length,
          });

          // Execute: Get user bypass attempts
          const retrieved = await bypassDetector.getUserBypassAttempts(userId);

          // Verify: Query was made with correct parameters
          expect(queryMock).toHaveBeenCalledWith(
            expect.stringContaining('SELECT'),
            expect.arrayContaining([userId, expect.any(Number)])
          );

          // Verify: Retrieved attempts match expected structure
          expect(retrieved).toHaveLength(mockAttempts.length);
          retrieved.forEach((attempt, index) => {
            expect(attempt.userId).toBe(userId);
            expect(attempt.attemptType).toBe(attempts[index].attemptType);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 6.9: Bypass statistics are accurate
   * 
   * For any set of bypass attempts, the system must provide
   * accurate statistics (total attempts, unique users, locked accounts)
   */
  test('property: Bypass statistics are accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 100 }), // totalAttempts
        fc.integer({ min: 0, max: 50 }), // uniqueUsers
        fc.integer({ min: 0, max: 20 }), // lockedAccounts
        async (totalAttempts, uniqueUsers, lockedAccounts) => {
          // Setup: Mock statistics queries
          queryMock
            .mockResolvedValueOnce({ rows: [{ total: totalAttempts.toString() }], rowCount: 1 }) // Total
            .mockResolvedValueOnce({ rows: [{ unique_users: uniqueUsers.toString() }], rowCount: 1 }) // Unique users
            .mockResolvedValueOnce({ rows: [{ locked: lockedAccounts.toString() }], rowCount: 1 }) // Locked
            .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // By type

          // Execute: Get statistics
          const stats = await bypassDetector.getBypassStatistics(24);

          // Verify: Statistics match expected values
          expect(stats.totalAttempts).toBe(totalAttempts);
          expect(stats.uniqueUsers).toBe(uniqueUsers);
          expect(stats.lockedAccounts).toBe(lockedAccounts);

          // Verify: Queries were made with time filter
          queryMock.mock.calls.forEach((call) => {
            if (call[0].includes('SELECT')) {
              expect(call[1]).toContain(expect.any(Date));
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 6.10: No bypass attempt goes undetected
   * 
   * For any authorization violation, the bypass detector must be invoked
   * and the attempt must be recorded
   */
  test('property: All bypass attempts are detected', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryBypassAttemptType(),
        arbitraryDetails(),
        arbitraryIpAddress(),
        arbitraryUserAgent(),
        async (userId, attemptType, details, ipAddress, userAgent) => {
          // Setup: Track if logging occurred
          let logCalled = false;
          queryMock.mockImplementation(async (query: string) => {
            if (query.includes('INSERT INTO audit_logs')) {
              logCalled = true;
            }
            if (query.includes('SELECT COUNT(*)')) {
              return { rows: [{ attempt_count: '1' }], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute: Record bypass attempt
          await bypassDetector.recordBypassAttempt(
            userId,
            attemptType,
            details,
            ipAddress,
            userAgent
          );

          // Verify: Logging must have occurred
          expect(logCalled).toBe(true);

          // Verify: All required information was logged
          const logCall = queryMock.mock.calls.find((call) =>
            call[0].includes('INSERT INTO audit_logs')
          );
          expect(logCall).toBeDefined();
          expect(logCall![1]).toEqual(
            expect.arrayContaining([
              userId,
              'SECURITY_VIOLATION',
              'authorization',
              attemptType,
              'FAILURE',
              expect.any(String),
              ipAddress,
              userAgent,
            ])
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
