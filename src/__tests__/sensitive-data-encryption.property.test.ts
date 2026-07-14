import * as fc from 'fast-check';
import { Pool } from 'pg';
import { PhishingEngine, PhishingCampaignInput, TrackInteractionInput } from '../services/PhishingEngine';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { EncryptionService } from '../services/EncryptionService';
import { PhishingCampaign } from '../models/PhishingCampaign';
import { CampaignTarget } from '../models/CampaignTarget';
import { CampaignInteraction } from '../models/CampaignInteraction';

// Mock dependencies
jest.mock('pg');

describe('Property 17: Sensitive Data Encryption', () => {
  let mockPool: jest.Mocked<Pool>;
  let mockAuthManager: jest.Mocked<AuthorizationManager>;
  let encryptionService: EncryptionService;
  let phishingEngine: PhishingEngine;

  beforeEach(() => {
    // Setup mock pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    } as any;

    // Setup mock authorization manager
    mockAuthManager = {
      validateAuthorization: jest.fn(),
      isTargetInScope: jest.fn(),
      isAuthorizationValid: jest.fn(),
    } as any;

    // Use real encryption service
    process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-32-characters-long-minimum';
    encryptionService = new EncryptionService();

    // Create phishing engine with real encryption
    phishingEngine = new PhishingEngine(
      mockPool,
      mockAuthManager,
      encryptionService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Feature: penetration-testing-platform
   * Property 17: تشفير البيانات الحساسة المجمعة
   * 
   * **Validates: Requirements 3.7, 6.6, 8.1, 8.3**
   * 
   * For any sensitive data collected (credentials, personal information, network data),
   * the system SHALL encrypt it using AES-256 before storage.
   * 
   * This property verifies that:
   * 1. Captured credentials are encrypted before storage
   * 2. Encrypted data does not contain plaintext
   * 3. Encrypted data can be decrypted to retrieve original values
   * 4. Different data produces different ciphertext (no deterministic encryption)
   */
  test('property: captured credentials are encrypted with AES-256 before storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 50 }),
          password: fc.string({ minLength: 8, maxLength: 100 }),
          email: fc.emailAddress(),
        }),
        async (credentials) => {
          // Encrypt the credentials
          const encrypted = await encryptionService.encryptCredentials(credentials);

          // Verify encrypted data is a Buffer
          expect(encrypted).toBeInstanceOf(Buffer);

          // Verify encrypted data does not contain plaintext
          const encryptedString = encrypted.toString('utf8');
          expect(encryptedString).not.toContain(credentials.username);
          expect(encryptedString).not.toContain(credentials.password);
          expect(encryptedString).not.toContain(credentials.email);

          // Verify we can decrypt and get original data
          const decrypted = await encryptionService.decryptCredentials(encrypted);
          expect(decrypted.username).toBe(credentials.username);
          expect(decrypted.password).toBe(credentials.password);
          expect(decrypted.email).toBe(credentials.email);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Encryption is non-deterministic (same data produces different ciphertext)
   * 
   * This ensures that even if the same credentials are captured multiple times,
   * the encrypted values will be different, preventing pattern analysis.
   */
  test('property: same credentials produce different ciphertext on each encryption', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 50 }),
          password: fc.string({ minLength: 8, maxLength: 100 }),
        }),
        async (credentials) => {
          // Encrypt the same data twice
          const encrypted1 = await encryptionService.encryptCredentials(credentials);
          const encrypted2 = await encryptionService.encryptCredentials(credentials);

          // Verify ciphertexts are different
          expect(encrypted1.equals(encrypted2)).toBe(false);

          // But both decrypt to the same original data
          const decrypted1 = await encryptionService.decryptCredentials(encrypted1);
          const decrypted2 = await encryptionService.decryptCredentials(encrypted2);

          expect(decrypted1).toEqual(credentials);
          expect(decrypted2).toEqual(credentials);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Encrypted data stored in database does not leak sensitive information
   * 
   * Verifies that when credentials are stored via trackInteraction,
   * the database receives only encrypted data.
   */
  test('property: trackInteraction stores only encrypted credentials in database', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          campaignId: fc.uuid(),
          trackingToken: fc.uuid(),
          username: fc.string({ minLength: 3, maxLength: 50 }),
          password: fc.string({ minLength: 8, maxLength: 100 }),
          ipAddress: fc.ipV4(),
          userAgent: fc.string({ minLength: 10, maxLength: 200 }),
        }),
        async (data) => {
          // Mock target lookup
          const mockTarget = {
            id: fc.sample(fc.uuid(), 1)[0],
            campaignId: data.campaignId,
            email: 'test@example.com',
            trackingToken: data.trackingToken,
          };

          // Mock database responses
          mockPool.query
            .mockResolvedValueOnce({ rows: [mockTarget] } as any) // findByTrackingToken
            .mockResolvedValueOnce({ rows: [{ id: fc.sample(fc.uuid(), 1)[0] }] } as any); // create interaction

          // Track interaction with credentials
          await phishingEngine.trackInteraction({
            campaignId: data.campaignId,
            trackingToken: data.trackingToken,
            interactionType: 'CREDENTIALS_ENTERED',
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            capturedData: {
              username: data.username,
              password: data.password,
            },
          });

          // Verify database was called
          expect(mockPool.query).toHaveBeenCalled();

          // Get the data that was sent to database
          const insertCall = mockPool.query.mock.calls.find(
            call => call[0]?.includes('INSERT INTO campaign_interactions')
          );

          expect(insertCall).toBeDefined();

          if (insertCall) {
            const params = insertCall[1] as any[];
            // Find the captured_data parameter (should be a Buffer)
            const capturedDataParam = params.find(p => p instanceof Buffer);

            expect(capturedDataParam).toBeInstanceOf(Buffer);

            // Verify the encrypted data does not contain plaintext
            const encryptedString = capturedDataParam.toString('utf8');
            expect(encryptedString).not.toContain(data.username);
            expect(encryptedString).not.toContain(data.password);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Encryption preserves data integrity
   * 
   * Verifies that encryption and decryption are inverse operations
   * and no data is lost or corrupted in the process.
   */
  test('property: encryption and decryption preserve data integrity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 1, maxLength: 100 }),
          password: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.option(fc.string({ minLength: 10, maxLength: 15 })),
          notes: fc.option(fc.lorem({ maxCount: 3 })),
        }),
        async (data) => {
          // Remove undefined values
          const cleanData = Object.fromEntries(
            Object.entries(data).filter(([_, v]) => v !== null)
          );

          // Encrypt
          const encrypted = await encryptionService.encryptObject(cleanData);

          // Decrypt
          const decrypted = await encryptionService.decryptObject(encrypted);

          // Verify all fields match
          expect(decrypted).toEqual(cleanData);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Encryption works with various data types and special characters
   * 
   * Ensures encryption handles edge cases like special characters,
   * unicode, empty strings, etc.
   */
  test('property: encryption handles special characters and unicode', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          field1: fc.unicodeString({ minLength: 0, maxLength: 100 }),
          field2: fc.string({ minLength: 0, maxLength: 100 }),
          field3: fc.constantFrom(
            'password!@#$%^&*()',
            'пароль',
            '密码',
            'كلمة السر',
            '🔒🔑',
            '<script>alert("xss")</script>',
            "'; DROP TABLE users; --"
          ),
        }),
        async (data) => {
          // Encrypt
          const encrypted = await encryptionService.encryptObject(data);

          // Decrypt
          const decrypted = await encryptionService.decryptObject(encrypted);

          // Verify exact match
          expect(decrypted).toEqual(data);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Encrypted data size is larger than plaintext
   * 
   * Verifies that encryption adds overhead (IV, salt, tag) as expected
   * for AES-256-GCM.
   */
  test('property: encrypted data is larger than plaintext due to encryption overhead', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 1000 }),
        async (plaintext) => {
          const encrypted = await encryptionService.encrypt(plaintext);

          // Encrypted data should be larger due to:
          // - Salt (32 bytes)
          // - IV (16 bytes)
          // - Auth tag (16 bytes)
          // - Ciphertext (same size as plaintext)
          const expectedMinSize = plaintext.length + 32 + 16 + 16;

          expect(encrypted.length).toBeGreaterThanOrEqual(expectedMinSize);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Decryption fails with wrong key
   * 
   * Ensures that encrypted data cannot be decrypted without the correct key.
   */
  test('property: decryption fails with incorrect key', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          data: fc.string({ minLength: 5, maxLength: 100 }),
          correctKey: fc.hexaString({ minLength: 64, maxLength: 64 }),
          wrongKey: fc.hexaString({ minLength: 64, maxLength: 64 }),
        }),
        async ({ data, correctKey, wrongKey }) => {
          // Skip if keys are the same
          if (correctKey === wrongKey) {
            return;
          }

          // Encrypt with correct key
          const encrypted = await encryptionService.encrypt(data, correctKey);

          // Try to decrypt with wrong key - should fail
          await expect(
            encryptionService.decrypt(encrypted, wrongKey)
          ).rejects.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Empty data can be encrypted and decrypted
   * 
   * Edge case: ensures encryption handles empty strings and objects.
   */
  test('property: encryption handles empty data correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', {}, { field: '' }),
        async (data) => {
          if (typeof data === 'string') {
            const encrypted = await encryptionService.encrypt(data);
            const decrypted = await encryptionService.decrypt(encrypted);
            expect(decrypted).toBe(data);
          } else {
            const encrypted = await encryptionService.encryptObject(data);
            const decrypted = await encryptionService.decryptObject(encrypted);
            expect(decrypted).toEqual(data);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Encryption is consistent across service instances
   * 
   * Verifies that data encrypted by one service instance can be
   * decrypted by another instance with the same master key.
   */
  test('property: encryption is consistent across service instances', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 50 }),
          password: fc.string({ minLength: 8, maxLength: 100 }),
        }),
        async (credentials) => {
          const masterKey = 'shared-master-key-32-characters-long-minimum';

          // Create two service instances with same master key
          const service1 = new EncryptionService(masterKey);
          const service2 = new EncryptionService(masterKey);

          // Encrypt with service1
          const encrypted = await service1.encryptCredentials(credentials);

          // Decrypt with service2
          const decrypted = await service2.decryptCredentials(encrypted);

          // Should get original data
          expect(decrypted).toEqual(credentials);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Large data can be encrypted and decrypted
   * 
   * Ensures encryption works with larger payloads.
   */
  test('property: encryption handles large data correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          field1: fc.string({ minLength: 1000, maxLength: 5000 }),
          field2: fc.string({ minLength: 1000, maxLength: 5000 }),
          field3: fc.array(fc.string({ minLength: 100, maxLength: 500 }), {
            minLength: 5,
            maxLength: 10,
          }),
        }),
        async (data) => {
          const encrypted = await encryptionService.encryptObject(data);
          const decrypted = await encryptionService.decryptObject(encrypted);

          expect(decrypted).toEqual(data);
        }
      ),
      { numRuns: 20 }
    );
  });
});
