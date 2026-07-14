import * as fc from 'fast-check';
import { Pool } from 'pg';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { Authorization } from '../models/Authorization';
import { Target, Scope, NetworkIdentifier, OperationType } from '../types';
import { AuthorizationRepository } from '../repositories/AuthorizationRepository';

// Mock the repository
jest.mock('../repositories/AuthorizationRepository');

/**
 * Feature: penetration-testing-platform
 * Property 2: التحقق من النطاق المصرح به
 * 
 * **يتحقق من: المتطلبات 0.2، 0.4، 3.2، 5.2**
 * 
 * لأي تصريح وأي هدف، يجب على النظام قبول العملية فقط إذا كان الهدف ضمن نطاق العمل 
 * المحدد في التصريح (النطاقات، نطاقات IP، الشبكات، نطاقات البريد الإلكتروني)
 * 
 * This property verifies that:
 * 1. Targets within authorized domains are accepted
 * 2. Targets outside authorized domains are rejected
 * 3. Subdomain matching works correctly (e.g., sub.example.com matches example.com)
 * 4. IP addresses within authorized ranges are accepted
 * 5. IP addresses outside authorized ranges are rejected
 * 6. Email domains are validated correctly
 * 7. Network identifiers (SSID/BSSID) are validated correctly
 */

describe('Property 2: Scope Validation', () => {
  let mockPool: Pool;
  let authorizationManager: AuthorizationManager;
  let mockRepository: jest.Mocked<AuthorizationRepository>;

  beforeEach(() => {
    // Create a mock pool for testing
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    } as unknown as Pool;

    authorizationManager = new AuthorizationManager(mockPool);
    mockRepository = (authorizationManager as any).repository as jest.Mocked<AuthorizationRepository>;
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
        fc.constantFrom('com', 'org', 'net', 'io', 'dev', 'co')
      )
      .map(([name, tld]) => `${name}.${tld}`);
  };

  const arbitrarySubdomain = (baseDomain: string): fc.Arbitrary<string> => {
    return fc
      .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
        minLength: 3,
        maxLength: 10,
      })
      .map((sub) => `${sub}.${baseDomain}`);
  };

  const arbitraryIpAddress = (): fc.Arbitrary<string> => {
    return fc
      .tuple(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 })
      )
      .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);
  };

  const arbitraryEmail = (domain: string): fc.Arbitrary<string> => {
    return fc
      .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789._-'.split('')), {
        minLength: 3,
        maxLength: 15,
      })
      .map((username) => `${username}@${domain}`);
  };

  const arbitraryNetworkIdentifier = (): fc.Arbitrary<NetworkIdentifier> => {
    return fc.record({
      ssid: fc.stringOf(fc.char(), { minLength: 1, maxLength: 32 }),
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
    });
  };

  const arbitraryScope = (): fc.Arbitrary<Scope> => {
    return fc.record({
      domains: fc.array(arbitraryDomain(), { minLength: 1, maxLength: 5 }),
      ipRanges: fc.array(arbitraryIpAddress(), { minLength: 0, maxLength: 3 }),
      networks: fc.array(arbitraryNetworkIdentifier(), { minLength: 0, maxLength: 3 }),
      emailDomains: fc.array(arbitraryDomain(), { minLength: 0, maxLength: 3 }),
    });
  };

  const arbitraryAuthorization = (): fc.Arbitrary<Authorization> => {
    return fc
      .record({
        id: fc.uuid(),
        userId: fc.uuid(),
        organizationName: fc.string({ minLength: 5, maxLength: 50 }),
        scope: arbitraryScope(),
        validFrom: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
        validUntil: fc.date({ min: new Date(), max: new Date('2030-12-31') }),
        signedBy: fc.string({ minLength: 5, maxLength: 50 }),
        digitalSignature: fc.hexaString({ minLength: 64, maxLength: 128 }),
        documentPath: fc.string({ minLength: 10, maxLength: 100 }),
        status: fc.constant('ACTIVE' as const),
        createdAt: fc.date({ max: new Date() }),
        allowedOperations: fc.array(
          fc.constantFrom<OperationType>('WEB_SCAN', 'PHISHING_CAMPAIGN', 'NETWORK_ANALYSIS'),
          { minLength: 1, maxLength: 3 }
        ),
      })
      .map((data) => new Authorization(data));
  };

  /**
   * Property: Domains within scope are accepted
   */
  test('property: domains within authorized scope are accepted', () => {
    fc.assert(
      fc.asyncProperty(arbitraryAuthorization(), async (authorization) => {
        // Mock the repository to return the authorization
        mockRepository.findById.mockResolvedValue(authorization);

        // Pick a random domain from the authorized scope
        fc.pre(authorization.scope.domains.length > 0);
        const authorizedDomain = fc.sample(fc.constantFrom(...authorization.scope.domains), 1)[0];

        const target: Target = {
          type: 'DOMAIN',
          value: authorizedDomain,
        };

        const result = await authorizationManager.isTargetInScope(authorization.id, target);

        // Property: Domain in scope should be accepted
        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Subdomains of authorized domains are accepted
   */
  test('property: subdomains of authorized domains are accepted', () => {
    fc.assert(
      fc.asyncProperty(arbitraryAuthorization(), async (authorization) => {
        // Mock the repository to return the authorization
        mockRepository.findById.mockResolvedValue(authorization);

        // Pick a random domain from the authorized scope
        fc.pre(authorization.scope.domains.length > 0);
        const authorizedDomain = fc.sample(fc.constantFrom(...authorization.scope.domains), 1)[0];

        // Generate a subdomain
        const subdomain = fc.sample(arbitrarySubdomain(authorizedDomain), 1)[0];

        const target: Target = {
          type: 'DOMAIN',
          value: subdomain,
        };

        const result = await authorizationManager.isTargetInScope(authorization.id, target);

        // Property: Subdomain should be accepted
        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Domains outside scope are rejected
   */
  test('property: domains outside authorized scope are rejected', () => {
    fc.assert(
      fc.asyncProperty(
        arbitraryAuthorization(),
        arbitraryDomain(),
        async (authorization, unauthorizedDomain) => {
          // Mock the repository to return the authorization
          mockRepository.findById.mockResolvedValue(authorization);

          // Ensure the domain is not in the authorized scope
          fc.pre(!authorization.scope.domains.includes(unauthorizedDomain));
          fc.pre(
            !authorization.scope.domains.some((d) => unauthorizedDomain.endsWith('.' + d))
          );

          const target: Target = {
            type: 'DOMAIN',
            value: unauthorizedDomain,
          };

          const result = await authorizationManager.isTargetInScope(authorization.id, target);

          // Property: Domain outside scope should be rejected
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: IP addresses within authorized ranges are accepted
   */
  test('property: IP addresses within authorized ranges are accepted', () => {
    fc.assert(
      fc.asyncProperty(arbitraryAuthorization(), async (authorization) => {
        // Mock the repository to return the authorization
        mockRepository.findById.mockResolvedValue(authorization);

        // Pick a random IP from the authorized scope
        fc.pre(authorization.scope.ipRanges.length > 0);
        const authorizedIp = fc.sample(fc.constantFrom(...authorization.scope.ipRanges), 1)[0];

        const target: Target = {
          type: 'IP',
          value: authorizedIp,
        };

        const result = await authorizationManager.isTargetInScope(authorization.id, target);

        // Property: IP in scope should be accepted
        expect(result).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property: IP addresses outside authorized ranges are rejected
   */
  test('property: IP addresses outside authorized ranges are rejected', () => {
    fc.assert(
      fc.asyncProperty(
        arbitraryAuthorization(),
        arbitraryIpAddress(),
        async (authorization, unauthorizedIp) => {
          // Mock the repository to return the authorization
          mockRepository.findById.mockResolvedValue(authorization);

          // Ensure the IP is not in the authorized scope
          fc.pre(!authorization.scope.ipRanges.includes(unauthorizedIp));

          const target: Target = {
            type: 'IP',
            value: unauthorizedIp,
          };

          const result = await authorizationManager.isTargetInScope(authorization.id, target);

          // Property: IP outside scope should be rejected
          expect(result).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Email addresses with authorized domains are accepted
   */
  test('property: emails with authorized domains are accepted', () => {
    fc.assert(
      fc.asyncProperty(arbitraryAuthorization(), async (authorization) => {
        // Mock the repository to return the authorization
        mockRepository.findById.mockResolvedValue(authorization);

        // Pick a random email domain from the authorized scope
        fc.pre(authorization.scope.emailDomains.length > 0);
        const authorizedEmailDomain = fc.sample(
          fc.constantFrom(...authorization.scope.emailDomains),
          1
        )[0];

        // Generate an email with this domain
        const email = fc.sample(arbitraryEmail(authorizedEmailDomain), 1)[0];

        const target: Target = {
          type: 'EMAIL',
          value: email,
        };

        const result = await authorizationManager.isTargetInScope(authorization.id, target);

        // Property: Email with authorized domain should be accepted
        expect(result).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Email addresses with unauthorized domains are rejected
   */
  test('property: emails with unauthorized domains are rejected', () => {
    fc.assert(
      fc.asyncProperty(
        arbitraryAuthorization(),
        arbitraryDomain(),
        async (authorization, unauthorizedDomain) => {
          // Mock the repository to return the authorization
          mockRepository.findById.mockResolvedValue(authorization);

          // Ensure the domain is not in the authorized email domains
          fc.pre(!authorization.scope.emailDomains.includes(unauthorizedDomain));
          fc.pre(
            !authorization.scope.emailDomains.some((d) => unauthorizedDomain.endsWith('.' + d))
          );

          // Generate an email with this unauthorized domain
          const email = fc.sample(arbitraryEmail(unauthorizedDomain), 1)[0];

          const target: Target = {
            type: 'EMAIL',
            value: email,
          };

          const result = await authorizationManager.isTargetInScope(authorization.id, target);

          // Property: Email with unauthorized domain should be rejected
          expect(result).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Networks within authorized scope are accepted
   */
  test('property: networks within authorized scope are accepted', () => {
    fc.assert(
      fc.asyncProperty(arbitraryAuthorization(), async (authorization) => {
        // Mock the repository to return the authorization
        mockRepository.findById.mockResolvedValue(authorization);

        // Pick a random network from the authorized scope
        fc.pre(authorization.scope.networks.length > 0);
        const authorizedNetwork = fc.sample(
          fc.constantFrom(...authorization.scope.networks),
          1
        )[0];

        const target: Target = {
          type: 'NETWORK',
          value: `${authorizedNetwork.ssid}|${authorizedNetwork.bssid}`,
        };

        const result = await authorizationManager.isTargetInScope(authorization.id, target);

        // Property: Network in scope should be accepted
        expect(result).toBe(true);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Networks outside authorized scope are rejected
   */
  test('property: networks outside authorized scope are rejected', () => {
    fc.assert(
      fc.asyncProperty(
        arbitraryAuthorization(),
        arbitraryNetworkIdentifier(),
        async (authorization, unauthorizedNetwork) => {
          // Mock the repository to return the authorization
          mockRepository.findById.mockResolvedValue(authorization);

          // Ensure the network is not in the authorized scope
          fc.pre(
            !authorization.scope.networks.some(
              (n) =>
                n.ssid === unauthorizedNetwork.ssid && n.bssid === unauthorizedNetwork.bssid
            )
          );

          const target: Target = {
            type: 'NETWORK',
            value: `${unauthorizedNetwork.ssid}|${unauthorizedNetwork.bssid}`,
          };

          const result = await authorizationManager.isTargetInScope(authorization.id, target);

          // Property: Network outside scope should be rejected
          expect(result).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Scope validation is consistent across multiple checks
   */
  test('property: scope validation is consistent across multiple checks', () => {
    fc.assert(
      fc.asyncProperty(
        arbitraryAuthorization(),
        fc.constantFrom<Target['type']>('DOMAIN', 'IP', 'EMAIL', 'NETWORK'),
        async (authorization, targetType) => {
          // Mock the repository to return the authorization
          mockRepository.findById.mockResolvedValue(authorization);

          // Generate a target based on type
          let targetValue: string;
          switch (targetType) {
            case 'DOMAIN':
              fc.pre(authorization.scope.domains.length > 0);
              targetValue = fc.sample(fc.constantFrom(...authorization.scope.domains), 1)[0];
              break;
            case 'IP':
              fc.pre(authorization.scope.ipRanges.length > 0);
              targetValue = fc.sample(fc.constantFrom(...authorization.scope.ipRanges), 1)[0];
              break;
            case 'EMAIL':
              fc.pre(authorization.scope.emailDomains.length > 0);
              const emailDomain = fc.sample(
                fc.constantFrom(...authorization.scope.emailDomains),
                1
              )[0];
              targetValue = fc.sample(arbitraryEmail(emailDomain), 1)[0];
              break;
            case 'NETWORK':
              fc.pre(authorization.scope.networks.length > 0);
              const network = fc.sample(fc.constantFrom(...authorization.scope.networks), 1)[0];
              targetValue = `${network.ssid}|${network.bssid}`;
              break;
          }

          const target: Target = {
            type: targetType,
            value: targetValue,
          };

          // Check multiple times
          const result1 = await authorizationManager.isTargetInScope(authorization.id, target);
          const result2 = await authorizationManager.isTargetInScope(authorization.id, target);
          const result3 = await authorizationManager.isTargetInScope(authorization.id, target);

          // Property: Results should be consistent
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
          expect(result1).toBe(true); // Should be true since we picked from authorized scope
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty scope rejects all targets
   */
  test('property: empty scope rejects all targets', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          targetType: fc.constantFrom<Target['type']>('DOMAIN', 'IP', 'EMAIL', 'NETWORK'),
          targetValue: fc.string({ minLength: 5, maxLength: 50 }),
        }),
        async ({ targetType, targetValue }) => {
          // Create authorization with empty scope
          const emptyAuth = new Authorization({
            id: fc.sample(fc.uuid(), 1)[0],
            userId: fc.sample(fc.uuid(), 1)[0],
            organizationName: 'Test Org',
            scope: {
              domains: [],
              ipRanges: [],
              networks: [],
              emailDomains: [],
            },
            validFrom: new Date('2020-01-01'),
            validUntil: new Date('2030-12-31'),
            signedBy: 'Test Signer',
            digitalSignature: 'test-signature',
            documentPath: '/test/path',
            status: 'ACTIVE',
            createdAt: new Date(),
            allowedOperations: ['WEB_SCAN'],
          });

          // Mock the repository to return the empty authorization
          mockRepository.findById.mockResolvedValue(emptyAuth);

          const target: Target = {
            type: targetType,
            value: targetValue,
          };

          const result = await authorizationManager.isTargetInScope(emptyAuth.id, target);

          // Property: Empty scope should reject all targets
          expect(result).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});
