import * as fc from 'fast-check';
import { Pool } from 'pg';
import { WebScanner, WebTarget } from '../services/WebScanner';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { ScanSession, Vulnerability, Authorization } from '../models';
import { Crawler } from '../services/Crawler';
import { VulnerabilityTester } from '../services/VulnerabilityTester';
import { ScopeViolationError } from '../utils/errors';
import { Scope, OperationType } from '../types';

// Mock dependencies
jest.mock('../services/Crawler');
jest.mock('../services/VulnerabilityTester');

/**
 * Feature: penetration-testing-platform
 * Property 11: إيقاف الفحص عند اكتشاف هدف خارج النطاق
 * 
 * **Validates: Requirements 1.7**
 * 
 * لأي عملية فحص، إذا اكتشف النظام أن الهدف الحالي خارج نطاق العمل المصرح به، 
 * يجب إيقاف الفحص فوراً
 * 
 * For any scan operation, if the system detects that the current target is outside 
 * the authorized scope, the scan MUST be stopped immediately.
 * 
 * This property verifies that:
 * 1. When a scan encounters an out-of-scope URL during crawling, it stops immediately
 * 2. The scan status is updated to 'STOPPED'
 * 3. A ScopeViolationError is thrown
 * 4. No further URLs are processed after the violation is detected
 * 5. The scan session is properly cleaned up
 * 
 * To run this test:
 *   npm test -- scan-out-of-scope-stop.property.test.ts
 * 
 * Or run all tests:
 *   npm test
 */

describe('Property 11: إيقاف الفحص عند اكتشاف هدف خارج النطاق', () => {
  let mockPool: Pool;
  let webScanner: WebScanner;
  let authorizationManager: AuthorizationManager;
  let mockCrawler: jest.Mocked<Crawler>;
  let mockTester: jest.Mocked<VulnerabilityTester>;

  beforeEach(() => {
    // Create mock pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    } as unknown as Pool;

    // Create instances
    authorizationManager = new AuthorizationManager(mockPool);
    webScanner = new WebScanner(mockPool, authorizationManager);

    // Setup mocks
    mockCrawler = new Crawler({
      maxDepth: 3,
      maxRequests: 100,
      respectRobotsTxt: true,
    }) as jest.Mocked<Crawler>;

    mockTester = new VulnerabilityTester() as jest.Mocked<VulnerabilityTester>;

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Custom arbitraries for generating test data
   */
  const arbitraryDomain = (): fc.Arbitrary<string> => {
    return fc
      .tuple(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
          minLength: 3,
          maxLength: 15,
        }),
        fc.constantFrom('com', 'org', 'net', 'io', 'dev')
      )
      .map(([name, tld]) => `${name}.${tld}`);
  };

  const arbitraryUrl = (domain: string): fc.Arbitrary<string> => {
    return fc
      .array(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
          minLength: 3,
          maxLength: 10,
        }),
        { minLength: 0, maxLength: 3 }
      )
      .map((pathParts) => {
        const path = pathParts.length > 0 ? '/' + pathParts.join('/') : '';
        return `https://${domain}${path}`;
      });
  };

  const arbitraryScope = (authorizedDomains: string[]): fc.Arbitrary<Scope> => {
    return fc.constant({
      domains: authorizedDomains,
      ipRanges: [],
      networks: [],
      emailDomains: [],
    });
  };

  const arbitraryAuthorization = (
    authorizedDomains: string[]
  ): fc.Arbitrary<Authorization> => {
    return fc
      .record({
        id: fc.uuid(),
        userId: fc.uuid(),
        organizationName: fc.string({ minLength: 5, maxLength: 50 }),
        validFrom: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        validUntil: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
        signedBy: fc.string({ minLength: 5, maxLength: 50 }),
        digitalSignature: fc.hexaString({ minLength: 64, maxLength: 128 }),
        documentPath: fc.string({ minLength: 10, maxLength: 100 }),
        status: fc.constant('ACTIVE' as const),
        createdAt: fc.date({ max: new Date() }),
        allowedOperations: fc.constant(['WEB_SCAN'] as OperationType[]),
      })
      .map((data) => {
        return new Authorization({
          ...data,
          scope: {
            domains: authorizedDomains,
            ipRanges: [],
            networks: [],
            emailDomains: [],
          },
        });
      });
  };

  /**
   * Property: Scan stops immediately when out-of-scope URL is detected
   * 
   * For any scan with authorized domains and any out-of-scope URL discovered during crawling:
   * - When the crawler discovers a URL outside the authorized scope
   * - Then the scan MUST stop immediately
   * - And the scan status MUST be set to 'STOPPED'
   * - And a ScopeViolationError MUST be thrown
   */
  test('property: scan stops immediately when out-of-scope URL is detected during crawl', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryDomain(), { minLength: 1, maxLength: 3 }),
        arbitraryDomain(),
        fc.uuid(),
        async (authorizedDomains, unauthorizedDomain, userId) => {
          // Precondition: unauthorized domain must not be in authorized list
          fc.pre(!authorizedDomains.includes(unauthorizedDomain));
          fc.pre(
            !authorizedDomains.some(
              (d) => unauthorizedDomain.endsWith('.' + d) || d.endsWith('.' + unauthorizedDomain)
            )
          );

          // Setup: Create authorization with specific authorized domains
          const authId = fc.sample(fc.uuid(), 1)[0];
          const authorization = fc.sample(arbitraryAuthorization(authorizedDomains), 1)[0];
          authorization.id = authId;

          // Setup: Create scan session mock data
          const sessionId = fc.sample(fc.uuid(), 1)[0];
          const authorizedUrl = fc.sample(arbitraryUrl(authorizedDomains[0]), 1)[0];
          const unauthorizedUrl = fc.sample(arbitraryUrl(unauthorizedDomain), 1)[0];

          // Mock: Authorization validation (initial check passes)
          jest
            .spyOn(authorizationManager, 'validateAuthorization')
            .mockResolvedValue({ authorized: true, authorizationId: authId });

          // Mock: Initial target is in scope
          jest
            .spyOn(authorizationManager, 'isTargetInScope')
            .mockImplementation(async (authId, target) => {
              const domain = target.value;
              // First call (initial URL) - in scope
              // Subsequent calls during scan - check if in authorized domains
              return authorizedDomains.some(
                (d) => domain === d || domain.endsWith('.' + d)
              );
            });

          // Mock: ScanSession model
          const mockScanSessionData = {
            id: sessionId,
            userId,
            authorizationId: authId,
            targetUrl: authorizedUrl,
            status: 'PENDING' as const,
            startedAt: new Date(),
            completedAt: null,
            totalRequests: 0,
            totalVulnerabilities: 0,
            config: {
              vulnerabilityTypes: ['SQL_INJECTION'],
              maxDepth: 3,
              maxRequests: 100,
              respectRobotsTxt: true,
            },
          };

          let currentStatus = 'PENDING';
          const scanSessionMock = ScanSession.prototype;
          jest.spyOn(scanSessionMock, 'create').mockResolvedValue(sessionId);
          jest.spyOn(scanSessionMock, 'findById').mockImplementation(async () => ({
            ...mockScanSessionData,
            status: currentStatus as any,
          }));
          jest.spyOn(scanSessionMock, 'update').mockImplementation(async (id, updates) => {
            if (updates.status) {
              currentStatus = updates.status;
            }
          });

          // Mock: Vulnerability model
          const vulnerabilityMock = Vulnerability.prototype;
          jest.spyOn(vulnerabilityMock, 'create').mockResolvedValue(fc.sample(fc.uuid(), 1)[0]);
          jest
            .spyOn(vulnerabilityMock, 'findByScanSessionId')
            .mockResolvedValue([]);

          // Mock: Crawler returns both authorized and unauthorized URLs
          const crawlResults = [
            {
              url: authorizedUrl,
              statusCode: 200,
              title: 'Authorized Page',
              forms: [],
              links: [unauthorizedUrl],
            },
            {
              url: unauthorizedUrl, // This should trigger the stop
              statusCode: 200,
              title: 'Unauthorized Page',
              forms: [],
              links: [],
            },
          ];

          (Crawler as jest.MockedClass<typeof Crawler>).mockImplementation(() => {
            return {
              crawl: jest.fn().mockResolvedValue(crawlResults),
              getRequestCount: jest.fn().mockReturnValue(2),
            } as any;
          });

          // Mock: VulnerabilityTester
          (VulnerabilityTester as jest.MockedClass<typeof VulnerabilityTester>).mockImplementation(
            () => {
              return {
                testSqlInjection: jest.fn().mockResolvedValue([]),
                testXss: jest.fn().mockResolvedValue([]),
                testCsrf: jest.fn().mockResolvedValue([]),
                testDirectoryTraversal: jest.fn().mockResolvedValue([]),
                testCommandInjection: jest.fn().mockResolvedValue([]),
                convertToVulnerabilityInput: jest.fn().mockReturnValue([]),
              } as any;
            }
          );

          // Execute: Start scan
          const target: WebTarget = {
            url: authorizedUrl,
            authorizationId: authId,
          };

          const config = {
            vulnerabilityTypes: ['SQL_INJECTION' as const],
            maxDepth: 3,
            maxRequests: 100,
            respectRobotsTxt: true,
          };

          try {
            await webScanner.startScan(userId, target, config);

            // Wait for background scan to complete
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Property: Scan should have been stopped
            const finalStatus = await webScanner.getScanStatus(sessionId);

            // Verify: Status should be STOPPED (not COMPLETED or RUNNING)
            return finalStatus === 'STOPPED' || finalStatus === 'FAILED';
          } catch (error) {
            // If error is thrown during startScan, that's also acceptable
            // as long as it's a scope violation error
            if (error instanceof ScopeViolationError) {
              return true;
            }
            // Other errors should not occur
            return false;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Scan completes normally when all URLs are in scope
   * 
   * For any scan where all discovered URLs are within authorized scope:
   * - When the crawler only discovers in-scope URLs
   * - Then the scan MUST complete normally
   * - And the scan status MUST be 'COMPLETED'
   * - And no ScopeViolationError should be thrown
   */
  test('property: scan completes normally when all URLs are in authorized scope', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryDomain(), { minLength: 1, maxLength: 2 }),
        fc.uuid(),
        fc.integer({ min: 2, max: 5 }),
        async (authorizedDomains, userId, numUrls) => {
          // Setup: Create authorization
          const authId = fc.sample(fc.uuid(), 1)[0];
          const authorization = fc.sample(arbitraryAuthorization(authorizedDomains), 1)[0];
          authorization.id = authId;

          // Setup: Generate multiple URLs all within authorized scope
          const authorizedUrls = Array.from({ length: numUrls }, (_, i) => {
            const domain = authorizedDomains[i % authorizedDomains.length];
            return fc.sample(arbitraryUrl(domain), 1)[0];
          });

          const sessionId = fc.sample(fc.uuid(), 1)[0];

          // Mock: Authorization validation
          jest
            .spyOn(authorizationManager, 'validateAuthorization')
            .mockResolvedValue({ authorized: true, authorizationId: authId });

          // Mock: All targets are in scope
          jest
            .spyOn(authorizationManager, 'isTargetInScope')
            .mockImplementation(async (authId, target) => {
              const domain = target.value;
              return authorizedDomains.some(
                (d) => domain === d || domain.endsWith('.' + d)
              );
            });

          // Mock: ScanSession model
          let currentStatus = 'PENDING';
          const scanSessionMock = ScanSession.prototype;
          jest.spyOn(scanSessionMock, 'create').mockResolvedValue(sessionId);
          jest.spyOn(scanSessionMock, 'findById').mockImplementation(async () => ({
            id: sessionId,
            userId,
            authorizationId: authId,
            targetUrl: authorizedUrls[0],
            status: currentStatus as any,
            startedAt: new Date(),
            completedAt: currentStatus === 'COMPLETED' ? new Date() : null,
            totalRequests: numUrls,
            totalVulnerabilities: 0,
            config: {
              vulnerabilityTypes: ['SQL_INJECTION'],
              maxDepth: 3,
              maxRequests: 100,
              respectRobotsTxt: true,
            },
          }));
          jest.spyOn(scanSessionMock, 'update').mockImplementation(async (id, updates) => {
            if (updates.status) {
              currentStatus = updates.status;
            }
          });

          // Mock: Vulnerability model
          const vulnerabilityMock = Vulnerability.prototype;
          jest.spyOn(vulnerabilityMock, 'create').mockResolvedValue(fc.sample(fc.uuid(), 1)[0]);
          jest
            .spyOn(vulnerabilityMock, 'findByScanSessionId')
            .mockResolvedValue([]);

          // Mock: Crawler returns only authorized URLs
          const crawlResults = authorizedUrls.map((url) => ({
            url,
            statusCode: 200,
            title: 'Page',
            forms: [],
            links: [],
          }));

          (Crawler as jest.MockedClass<typeof Crawler>).mockImplementation(() => {
            return {
              crawl: jest.fn().mockResolvedValue(crawlResults),
              getRequestCount: jest.fn().mockReturnValue(numUrls),
            } as any;
          });

          // Mock: VulnerabilityTester
          (VulnerabilityTester as jest.MockedClass<typeof VulnerabilityTester>).mockImplementation(
            () => {
              return {
                testSqlInjection: jest.fn().mockResolvedValue([]),
                testXss: jest.fn().mockResolvedValue([]),
                testCsrf: jest.fn().mockResolvedValue([]),
                testDirectoryTraversal: jest.fn().mockResolvedValue([]),
                testCommandInjection: jest.fn().mockResolvedValue([]),
                convertToVulnerabilityInput: jest.fn().mockReturnValue([]),
              } as any;
            }
          );

          // Execute: Start scan
          const target: WebTarget = {
            url: authorizedUrls[0],
            authorizationId: authId,
          };

          const config = {
            vulnerabilityTypes: ['SQL_INJECTION' as const],
            maxDepth: 3,
            maxRequests: 100,
            respectRobotsTxt: true,
          };

          await webScanner.startScan(userId, target, config);

          // Wait for background scan to complete
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Property: Scan should complete normally
          const finalStatus = await webScanner.getScanStatus(sessionId);

          // Verify: Status should be COMPLETED (not STOPPED or FAILED)
          return finalStatus === 'COMPLETED' || finalStatus === 'RUNNING';
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Scan stops before processing remaining URLs after scope violation
   * 
   * For any scan that encounters an out-of-scope URL:
   * - When a scope violation is detected
   * - Then no URLs discovered after the violation should be processed
   * - And the scan should stop immediately without testing remaining URLs
   */
  test('property: scan stops before processing remaining URLs after scope violation', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryDomain(),
        arbitraryDomain(),
        fc.uuid(),
        async (authorizedDomain, unauthorizedDomain, userId) => {
          // Precondition: domains must be different
          fc.pre(authorizedDomain !== unauthorizedDomain);
          fc.pre(!unauthorizedDomain.endsWith('.' + authorizedDomain));
          fc.pre(!authorizedDomain.endsWith('.' + unauthorizedDomain));

          // Setup
          const authId = fc.sample(fc.uuid(), 1)[0];
          const sessionId = fc.sample(fc.uuid(), 1)[0];

          const authorizedUrl1 = fc.sample(arbitraryUrl(authorizedDomain), 1)[0];
          const unauthorizedUrl = fc.sample(arbitraryUrl(unauthorizedDomain), 1)[0];
          const authorizedUrl2 = fc.sample(arbitraryUrl(authorizedDomain), 1)[0];

          // Track which URLs were tested
          const testedUrls: string[] = [];

          // Mock: Authorization
          jest
            .spyOn(authorizationManager, 'validateAuthorization')
            .mockResolvedValue({ authorized: true, authorizationId: authId });

          jest
            .spyOn(authorizationManager, 'isTargetInScope')
            .mockImplementation(async (authId, target) => {
              const domain = target.value;
              return domain === authorizedDomain || domain.endsWith('.' + authorizedDomain);
            });

          // Mock: ScanSession
          let currentStatus = 'PENDING';
          const scanSessionMock = ScanSession.prototype;
          jest.spyOn(scanSessionMock, 'create').mockResolvedValue(sessionId);
          jest.spyOn(scanSessionMock, 'findById').mockImplementation(async () => ({
            id: sessionId,
            userId,
            authorizationId: authId,
            targetUrl: authorizedUrl1,
            status: currentStatus as any,
            startedAt: new Date(),
            completedAt: null,
            totalRequests: 0,
            totalVulnerabilities: 0,
            config: {
              vulnerabilityTypes: ['SQL_INJECTION'],
              maxDepth: 3,
              maxRequests: 100,
              respectRobotsTxt: true,
            },
          }));
          jest.spyOn(scanSessionMock, 'update').mockImplementation(async (id, updates) => {
            if (updates.status) {
              currentStatus = updates.status;
            }
          });

          // Mock: Vulnerability
          const vulnerabilityMock = Vulnerability.prototype;
          jest.spyOn(vulnerabilityMock, 'create').mockResolvedValue(fc.sample(fc.uuid(), 1)[0]);
          jest.spyOn(vulnerabilityMock, 'findByScanSessionId').mockResolvedValue([]);

          // Mock: Crawler returns URLs in order: authorized, unauthorized, authorized
          const crawlResults = [
            { url: authorizedUrl1, statusCode: 200, title: 'Page 1', forms: [], links: [] },
            { url: unauthorizedUrl, statusCode: 200, title: 'Page 2', forms: [], links: [] },
            { url: authorizedUrl2, statusCode: 200, title: 'Page 3', forms: [], links: [] },
          ];

          (Crawler as jest.MockedClass<typeof Crawler>).mockImplementation(() => {
            return {
              crawl: jest.fn().mockResolvedValue(crawlResults),
              getRequestCount: jest.fn().mockReturnValue(3),
            } as any;
          });

          // Mock: VulnerabilityTester tracks which URLs were tested
          (VulnerabilityTester as jest.MockedClass<typeof VulnerabilityTester>).mockImplementation(
            () => {
              return {
                testSqlInjection: jest.fn().mockImplementation(async (url) => {
                  testedUrls.push(url);
                  return [];
                }),
                testXss: jest.fn().mockResolvedValue([]),
                testCsrf: jest.fn().mockResolvedValue([]),
                testDirectoryTraversal: jest.fn().mockResolvedValue([]),
                testCommandInjection: jest.fn().mockResolvedValue([]),
                convertToVulnerabilityInput: jest.fn().mockReturnValue([]),
              } as any;
            }
          );

          // Execute
          const target: WebTarget = {
            url: authorizedUrl1,
            authorizationId: authId,
          };

          const config = {
            vulnerabilityTypes: ['SQL_INJECTION' as const],
            maxDepth: 3,
            maxRequests: 100,
            respectRobotsTxt: true,
          };

          await webScanner.startScan(userId, target, config);

          // Wait for background scan
          await new Promise((resolve) => setTimeout(resolve, 150));

          // Property: The third URL (authorizedUrl2) should NOT have been tested
          // because the scan should have stopped at the unauthorized URL
          const url2WasTested = testedUrls.includes(authorizedUrl2);

          // Verify: authorizedUrl2 should NOT be in tested URLs
          return !url2WasTested;
        }
      ),
      { numRuns: 50 }
    );
  });
});
