import * as fc from 'fast-check';
import { Pool } from 'pg';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { AuthorizationRepository } from '../repositories/AuthorizationRepository';
import { AuthorizationDocument } from '../models/Authorization';
import { OperationType, Scope, NetworkIdentifier } from '../types';

/**
 * Feature: penetration-testing-platform
 * Property 3: تخزين التصريح الكامل
 * 
 * لأي تصريح محمل، يجب على النظام تخزين جميع المعلومات الضرورية
 * (اسم المنظمة، النطاق، تاريخ الصلاحية، التوقيع الرقمي، العمليات المسموحة)
 * في قاعدة البيانات
 * 
 * **Validates: Requirements 0.3**
 */
describe('Property 3: Complete Authorization Storage', () => {
  let pool: Pool;
  let authorizationManager: AuthorizationManager;
  let authorizationRepository: AuthorizationRepository;

  beforeAll(async () => {
    // Initialize database connection
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'pentest_db_test',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });

    authorizationManager = new AuthorizationManager(pool);
    authorizationRepository = new AuthorizationRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await pool.query('DELETE FROM authorization_operations');
    await pool.query('DELETE FROM authorization_scopes');
    await pool.query('DELETE FROM authorizations');
  });

  /**
   * Custom arbitraries for generating test data
   */
  const arbitraryOrganizationName = (): fc.Arbitrary<string> => {
    return fc.string({ minLength: 3, maxLength: 100 }).filter(s => s.trim().length > 0);
  };

  const arbitraryDomain = (): fc.Arbitrary<string> => {
    return fc.domain();
  };

  const arbitraryIpAddress = (): fc.Arbitrary<string> => {
    return fc.ipV4();
  };

  const arbitraryIpRange = (): fc.Arbitrary<string> => {
    return fc.tuple(fc.ipV4(), fc.integer({ min: 8, max: 32 }))
      .map(([ip, bits]) => `${ip}/${bits}`);
  };

  const arbitraryEmailDomain = (): fc.Arbitrary<string> => {
    return fc.domain();
  };

  const arbitraryNetworkIdentifier = (): fc.Arbitrary<NetworkIdentifier> => {
    return fc.record({
      ssid: fc.string({ minLength: 1, maxLength: 32 }),
      bssid: fc.hexaString({ minLength: 12, maxLength: 12 })
        .map(hex => {
          // Format as MAC address: XX:XX:XX:XX:XX:XX
          return hex.match(/.{1,2}/g)?.join(':') || hex;
        }),
    });
  };

  const arbitraryScope = (): fc.Arbitrary<Scope> => {
    return fc.record({
      domains: fc.array(arbitraryDomain(), { minLength: 0, maxLength: 5 }),
      ipRanges: fc.array(
        fc.oneof(arbitraryIpAddress(), arbitraryIpRange()),
        { minLength: 0, maxLength: 3 }
      ),
      networks: fc.array(arbitraryNetworkIdentifier(), { minLength: 0, maxLength: 3 }),
      emailDomains: fc.array(arbitraryEmailDomain(), { minLength: 0, maxLength: 3 }),
    }).filter(scope => 
      // At least one scope must be defined
      scope.domains.length > 0 ||
      scope.ipRanges.length > 0 ||
      scope.networks.length > 0 ||
      scope.emailDomains.length > 0
    );
  };

  const arbitraryOperationType = (): fc.Arbitrary<OperationType> => {
    return fc.constantFrom<OperationType>('WEB_SCAN', 'PHISHING_CAMPAIGN', 'NETWORK_ANALYSIS');
  };

  const arbitraryOperationTypes = (): fc.Arbitrary<OperationType[]> => {
    return fc.array(arbitraryOperationType(), { minLength: 1, maxLength: 3 })
      .map(ops => Array.from(new Set(ops))); // Remove duplicates
  };

  const arbitraryValidDates = (): fc.Arbitrary<{ validFrom: Date; validUntil: Date }> => {
    return fc.tuple(
      fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
      fc.integer({ min: 1, max: 365 }) // Days to add
    ).map(([validFrom, daysToAdd]) => ({
      validFrom,
      validUntil: new Date(validFrom.getTime() + daysToAdd * 24 * 60 * 60 * 1000),
    }));
  };

  const arbitrarySignedBy = (): fc.Arbitrary<string> => {
    return fc.string({ minLength: 3, maxLength: 100 }).filter(s => s.trim().length > 0);
  };

  const arbitraryDigitalSignature = (): fc.Arbitrary<string> => {
    return fc.hexaString({ minLength: 64, maxLength: 128 });
  };

  const arbitraryUserId = (): fc.Arbitrary<string> => {
    return fc.uuid();
  };

  const arbitraryDocumentPath = (): fc.Arbitrary<string> => {
    return fc.tuple(
      fc.constantFrom('/uploads', '/documents', '/authorizations'),
      fc.uuid(),
      fc.constantFrom('.pdf', '.doc', '.docx')
    ).map(([dir, id, ext]) => `${dir}/${id}${ext}`);
  };

  const arbitraryAuthorizationDocument = (): fc.Arbitrary<AuthorizationDocument> => {
    return fc.record({
      organizationName: arbitraryOrganizationName(),
      scope: arbitraryScope(),
      validFrom: fc.constant(new Date()),
      validUntil: fc.constant(new Date()),
      signedBy: arbitrarySignedBy(),
      digitalSignature: arbitraryDigitalSignature(),
      allowedOperations: arbitraryOperationTypes(),
    }).chain(doc => 
      arbitraryValidDates().map(dates => ({
        ...doc,
        validFrom: dates.validFrom,
        validUntil: dates.validUntil,
      }))
    );
  };

  /**
   * Property Test 3.1: All authorization fields must be stored
   * 
   * For any authorization document uploaded,
   * all required fields must be stored in the database and retrievable
   */
  test('property: all authorization fields are stored and retrievable', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryAuthorizationDocument(),
        arbitraryDocumentPath(),
        async (userId, document, documentPath) => {
          // Upload authorization
          const authorizationId = await authorizationManager.uploadAuthorization(
            userId,
            document,
            documentPath
          );

          // Retrieve authorization
          const retrieved = await authorizationRepository.findById(authorizationId);

          // Verify all fields are stored correctly
          expect(retrieved.id).toBe(authorizationId);
          expect(retrieved.userId).toBe(userId);
          expect(retrieved.organizationName).toBe(document.organizationName);
          expect(retrieved.signedBy).toBe(document.signedBy);
          expect(retrieved.digitalSignature).toBe(document.digitalSignature);
          expect(retrieved.documentPath).toBe(documentPath);
          expect(retrieved.status).toBe('ACTIVE');
          
          // Verify dates (allowing small time differences due to database precision)
          expect(Math.abs(retrieved.validFrom.getTime() - document.validFrom.getTime())).toBeLessThan(1000);
          expect(Math.abs(retrieved.validUntil.getTime() - document.validUntil.getTime())).toBeLessThan(1000);
          
          // Verify allowed operations
          expect(retrieved.allowedOperations).toHaveLength(document.allowedOperations.length);
          document.allowedOperations.forEach(op => {
            expect(retrieved.allowedOperations).toContain(op);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 3.2: All scope domains must be stored
   * 
   * For any authorization with domain scopes,
   * all domains must be stored and retrievable
   */
  test('property: all scope domains are stored correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryAuthorizationDocument().filter(doc => doc.scope.domains.length > 0),
        arbitraryDocumentPath(),
        async (userId, document, documentPath) => {
          // Upload authorization
          const authorizationId = await authorizationManager.uploadAuthorization(
            userId,
            document,
            documentPath
          );

          // Retrieve authorization
          const retrieved = await authorizationRepository.findById(authorizationId);

          // Verify all domains are stored
          expect(retrieved.scope.domains).toHaveLength(document.scope.domains.length);
          document.scope.domains.forEach(domain => {
            expect(retrieved.scope.domains).toContain(domain);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 3.3: All scope IP ranges must be stored
   * 
   * For any authorization with IP range scopes,
   * all IP ranges must be stored and retrievable
   */
  test('property: all scope IP ranges are stored correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryAuthorizationDocument().filter(doc => doc.scope.ipRanges.length > 0),
        arbitraryDocumentPath(),
        async (userId, document, documentPath) => {
          // Upload authorization
          const authorizationId = await authorizationManager.uploadAuthorization(
            userId,
            document,
            documentPath
          );

          // Retrieve authorization
          const retrieved = await authorizationRepository.findById(authorizationId);

          // Verify all IP ranges are stored
          expect(retrieved.scope.ipRanges).toHaveLength(document.scope.ipRanges.length);
          document.scope.ipRanges.forEach(ipRange => {
            expect(retrieved.scope.ipRanges).toContain(ipRange);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 3.4: All scope networks must be stored
   * 
   * For any authorization with network scopes,
   * all networks (SSID and BSSID) must be stored and retrievable
   */
  test('property: all scope networks are stored correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryAuthorizationDocument().filter(doc => doc.scope.networks.length > 0),
        arbitraryDocumentPath(),
        async (userId, document, documentPath) => {
          // Upload authorization
          const authorizationId = await authorizationManager.uploadAuthorization(
            userId,
            document,
            documentPath
          );

          // Retrieve authorization
          const retrieved = await authorizationRepository.findById(authorizationId);

          // Verify all networks are stored
          expect(retrieved.scope.networks).toHaveLength(document.scope.networks.length);
          document.scope.networks.forEach(network => {
            const found = retrieved.scope.networks.find(
              n => n.ssid === network.ssid && n.bssid === network.bssid
            );
            expect(found).toBeDefined();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 3.5: All scope email domains must be stored
   * 
   * For any authorization with email domain scopes,
   * all email domains must be stored and retrievable
   */
  test('property: all scope email domains are stored correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        arbitraryAuthorizationDocument().filter(doc => doc.scope.emailDomains.length > 0),
        arbitraryDocumentPath(),
        async (userId, document, documentPath) => {
          // Upload authorization
          const authorizationId = await authorizationManager.uploadAuthorization(
            userId,
            document,
            documentPath
          );

          // Retrieve authorization
          const retrieved = await authorizationRepository.findById(authorizationId);

          // Verify all email domains are stored
          expect(retrieved.scope.emailDomains).toHaveLength(document.scope.emailDomains.length);
          document.scope.emailDomains.forEach(emailDomain => {
            expect(retrieved.scope.emailDomains).toContain(emailDomain);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 3.6: Authorization data integrity across multiple uploads
   * 
   * For any sequence of authorization uploads,
   * each authorization must maintain its data integrity independently
   */
  test('property: multiple authorizations maintain data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(
            arbitraryUserId(),
            arbitraryAuthorizationDocument(),
            arbitraryDocumentPath()
          ),
          { minLength: 2, maxLength: 5 }
        ),
        async (authorizationData) => {
          // Upload all authorizations
          const uploadedIds: string[] = [];
          for (const [userId, document, documentPath] of authorizationData) {
            const authId = await authorizationManager.uploadAuthorization(
              userId,
              document,
              documentPath
            );
            uploadedIds.push(authId);
          }

          // Verify each authorization independently
          for (let i = 0; i < authorizationData.length; i++) {
            const [userId, document, documentPath] = authorizationData[i];
            const authId = uploadedIds[i];

            const retrieved = await authorizationRepository.findById(authId);

            // Verify this authorization's data is not corrupted by others
            expect(retrieved.userId).toBe(userId);
            expect(retrieved.organizationName).toBe(document.organizationName);
            expect(retrieved.signedBy).toBe(document.signedBy);
            expect(retrieved.digitalSignature).toBe(document.digitalSignature);
            expect(retrieved.documentPath).toBe(documentPath);
            
            // Verify operations
            expect(retrieved.allowedOperations).toHaveLength(document.allowedOperations.length);
            document.allowedOperations.forEach(op => {
              expect(retrieved.allowedOperations).toContain(op);
            });

            // Verify scope integrity
            expect(retrieved.scope.domains).toHaveLength(document.scope.domains.length);
            expect(retrieved.scope.ipRanges).toHaveLength(document.scope.ipRanges.length);
            expect(retrieved.scope.networks).toHaveLength(document.scope.networks.length);
            expect(retrieved.scope.emailDomains).toHaveLength(document.scope.emailDomains.length);
          }
        }
      ),
      { numRuns: 50 } // Fewer runs due to complexity
    );
  });

  /**
   * Property Test 3.7: Authorization retrieval by user ID
   * 
   * For any user with multiple authorizations,
   * all their authorizations must be retrievable by user ID
   */
  test('property: all user authorizations are retrievable by user ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        fc.array(
          fc.tuple(arbitraryAuthorizationDocument(), arbitraryDocumentPath()),
          { minLength: 1, maxLength: 5 }
        ),
        async (userId, authorizationData) => {
          // Upload all authorizations for this user
          const uploadedIds: string[] = [];
          for (const [document, documentPath] of authorizationData) {
            const authId = await authorizationManager.uploadAuthorization(
              userId,
              document,
              documentPath
            );
            uploadedIds.push(authId);
          }

          // Retrieve all authorizations for this user
          const userAuthorizations = await authorizationRepository.findByUserId(userId);

          // Verify all uploaded authorizations are retrieved
          expect(userAuthorizations.length).toBeGreaterThanOrEqual(authorizationData.length);
          
          uploadedIds.forEach(authId => {
            const found = userAuthorizations.find(auth => auth.id === authId);
            expect(found).toBeDefined();
            expect(found!.userId).toBe(userId);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property Test 3.8: Complete scope storage (all types)
   * 
   * For any authorization with all scope types defined,
   * all scope types must be stored and retrievable correctly
   */
  test('property: authorization with all scope types stores completely', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryUserId(),
        fc.record({
          organizationName: arbitraryOrganizationName(),
          scope: fc.record({
            domains: fc.array(arbitraryDomain(), { minLength: 1, maxLength: 3 }),
            ipRanges: fc.array(arbitraryIpRange(), { minLength: 1, maxLength: 2 }),
            networks: fc.array(arbitraryNetworkIdentifier(), { minLength: 1, maxLength: 2 }),
            emailDomains: fc.array(arbitraryEmailDomain(), { minLength: 1, maxLength: 2 }),
          }),
          validFrom: fc.constant(new Date()),
          validUntil: fc.constant(new Date()),
          signedBy: arbitrarySignedBy(),
          digitalSignature: arbitraryDigitalSignature(),
          allowedOperations: arbitraryOperationTypes(),
        }).chain(doc => 
          arbitraryValidDates().map(dates => ({
            ...doc,
            validFrom: dates.validFrom,
            validUntil: dates.validUntil,
          }))
        ),
        arbitraryDocumentPath(),
        async (userId, document, documentPath) => {
          // Upload authorization
          const authorizationId = await authorizationManager.uploadAuthorization(
            userId,
            document,
            documentPath
          );

          // Retrieve authorization
          const retrieved = await authorizationRepository.findById(authorizationId);

          // Verify all scope types are stored
          expect(retrieved.scope.domains.length).toBeGreaterThan(0);
          expect(retrieved.scope.ipRanges.length).toBeGreaterThan(0);
          expect(retrieved.scope.networks.length).toBeGreaterThan(0);
          expect(retrieved.scope.emailDomains.length).toBeGreaterThan(0);

          // Verify exact counts match
          expect(retrieved.scope.domains).toHaveLength(document.scope.domains.length);
          expect(retrieved.scope.ipRanges).toHaveLength(document.scope.ipRanges.length);
          expect(retrieved.scope.networks).toHaveLength(document.scope.networks.length);
          expect(retrieved.scope.emailDomains).toHaveLength(document.scope.emailDomains.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
