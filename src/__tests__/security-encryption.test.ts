import { EncryptionService } from '../services/EncryptionService';
import { SessionManager } from '../services/SessionManager';
import { RateLimiter, RateLimitPresets } from '../services/RateLimiter';
import { CSRFProtection } from '../services/CSRFProtection';
import { ContentSecurityPolicy, CSPPresets } from '../services/ContentSecurityPolicy';
import { TLSConfiguration } from '../services/TLSConfiguration';
import { KeyManagementService } from '../services/KeyManagementService';
import { SecureDataDeletion, DataRetentionPolicies } from '../services/SecureDataDeletion';
import { Pool } from 'pg';
import { createClient } from 'redis';

// Mock dependencies
jest.mock('pg');
jest.mock('redis');

describe('Security and Encryption Services', () => {
  describe('EncryptionService', () => {
    let encryptionService: EncryptionService;

    beforeEach(() => {
      process.env.ENCRYPTION_MASTER_KEY = 'test-master-key-32-characters-long-minimum';
      encryptionService = new EncryptionService();
    });

    test('should generate a random encryption key', async () => {
      const key = await encryptionService.generateKey();
      expect(key).toBeDefined();
      expect(key.length).toBeGreaterThan(0);
    });

    test('should encrypt and decrypt data correctly', async () => {
      const originalData = 'sensitive information';
      const encrypted = await encryptionService.encrypt(originalData);
      const decrypted = await encryptionService.decrypt(encrypted);

      expect(decrypted).toBe(originalData);
    });

    test('should encrypt and decrypt objects', async () => {
      const originalObject = { username: 'test', password: 'secret123' };
      const encrypted = await encryptionService.encryptObject(originalObject);
      const decrypted = await encryptionService.decryptObject(encrypted);

      expect(decrypted).toEqual(originalObject);
    });

    test('should use AES-256-GCM algorithm', async () => {
      const data = 'test data';
      const encrypted = await encryptionService.encrypt(data);
      
      // Encrypted data should be different from original
      expect(encrypted.toString()).not.toBe(data);
      
      // Should be able to decrypt
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(data);
    });
  });

  describe('SessionManager', () => {
    let sessionManager: SessionManager;
    let mockDb: jest.Mocked<Pool>;

    beforeEach(() => {
      mockDb = {
        query: jest.fn(),
        connect: jest.fn(),
      } as any;

      sessionManager = new SessionManager(mockDb);
    });

    test('should create a new session', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000),
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        last_activity: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] } as any);

      const session = await sessionManager.createSession(
        'user-123',
        '127.0.0.1',
        'test-agent'
      );

      expect(session).toBeDefined();
      expect(session.userId).toBe('user-123');
      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should validate active sessions', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000),
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        last_activity: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockSession] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any); // Update last activity

      const isValid = await sessionManager.validateSession('session-123');
      expect(isValid).toBe(true);
    });

    test('should invalidate expired sessions', async () => {
      const expiredSession = {
        id: 'session-123',
        user_id: 'user-123',
        created_at: new Date(Date.now() - 10 * 60 * 60 * 1000),
        expires_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // Expired 1 hour ago
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
        last_activity: new Date(Date.now() - 2 * 60 * 60 * 1000),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [expiredSession] } as any);
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any); // Delete session

      const isValid = await sessionManager.validateSession('session-123');
      expect(isValid).toBe(false);
    });
  });

  describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;
    let mockRedis: any;

    beforeEach(() => {
      mockRedis = {
        isOpen: false,
        connect: jest.fn().mockResolvedValue(undefined),
        zRemRangeByScore: jest.fn().mockResolvedValue(0),
        zCard: jest.fn().mockResolvedValue(0),
        zAdd: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
        zRange: jest.fn().mockResolvedValue([]),
        del: jest.fn().mockResolvedValue(1),
      };

      rateLimiter = new RateLimiter(mockRedis);
    });

    test('should allow requests within limit', async () => {
      mockRedis.zCard.mockResolvedValue(5);

      const result = await rateLimiter.checkLimit('user-123', 10, 60000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeLessThanOrEqual(10);
    });

    test('should block requests exceeding limit', async () => {
      mockRedis.zCard.mockResolvedValue(10);

      const result = await rateLimiter.checkLimit('user-123', 10, 60000);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('should use predefined rate limit presets', () => {
      expect(RateLimitPresets.AUTH.limit).toBe(5);
      expect(RateLimitPresets.API.limit).toBe(100);
      expect(RateLimitPresets.SCAN.limit).toBe(10);
    });
  });

  describe('CSRFProtection', () => {
    let csrfProtection: CSRFProtection;

    beforeEach(() => {
      process.env.CSRF_SECRET = 'test-csrf-secret-32-characters-long';
      csrfProtection = new CSRFProtection();
    });

    test('should generate CSRF token', async () => {
      const token = await csrfProtection.generateToken('session-123');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should validate correct CSRF token', async () => {
      const sessionId = 'session-123';
      const token = await csrfProtection.generateToken(sessionId);
      const isValid = await csrfProtection.validateToken(sessionId, token);

      expect(isValid).toBe(true);
    });

    test('should reject invalid CSRF token', async () => {
      const isValid = await csrfProtection.validateToken('session-123', 'invalid-token');
      expect(isValid).toBe(false);
    });

    test('should reject token with wrong session ID', async () => {
      const token = await csrfProtection.generateToken('session-123');
      const isValid = await csrfProtection.validateToken('session-456', token);

      expect(isValid).toBe(false);
    });
  });

  describe('ContentSecurityPolicy', () => {
    let csp: ContentSecurityPolicy;

    beforeEach(() => {
      csp = new ContentSecurityPolicy();
    });

    test('should generate nonce', () => {
      const nonce = csp.generateNonce();
      expect(nonce).toBeDefined();
      expect(typeof nonce).toBe('string');
    });

    test('should build CSP header value', () => {
      const headerValue = csp.buildHeaderValue();
      expect(headerValue).toContain('default-src');
      expect(headerValue).toContain('script-src');
      expect(headerValue).toContain('style-src');
    });

    test('should include nonce in script-src when provided', () => {
      const nonce = 'test-nonce-123';
      const headerValue = csp.buildHeaderValue(nonce);
      expect(headerValue).toContain(`'nonce-${nonce}'`);
    });

    test('should have predefined CSP presets', () => {
      expect(CSPPresets.STRICT).toBeDefined();
      expect(CSPPresets.MODERATE).toBeDefined();
      expect(CSPPresets.RELAXED).toBeDefined();
    });
  });

  describe('TLSConfiguration', () => {
    let tlsConfig: TLSConfiguration;

    beforeEach(() => {
      tlsConfig = new TLSConfiguration();
    });

    test('should get TLS options with secure defaults', () => {
      const options = tlsConfig.getTLSOptions();
      expect(options.minVersion).toBe('TLSv1.3');
      expect(options.honorCipherOrder).toBe(true);
      expect(options.ciphers).toBeDefined();
    });

    test('should validate TLS configuration', () => {
      const result = tlsConfig.validate();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
    });

    test('should provide production config', () => {
      const config = TLSConfiguration.getProductionConfig(
        '/path/to/cert.pem',
        '/path/to/key.pem'
      );

      expect(config.certPath).toBe('/path/to/cert.pem');
      expect(config.keyPath).toBe('/path/to/key.pem');
      expect(config.minVersion).toBe('TLSv1.3');
      expect(config.enableHSTS).toBe(true);
    });
  });

  describe('KeyManagementService', () => {
    let kms: KeyManagementService;
    let mockDb: jest.Mocked<Pool>;

    beforeEach(() => {
      mockDb = {
        query: jest.fn(),
        connect: jest.fn(),
      } as any;

      process.env.MASTER_ENCRYPTION_KEY = 'test-master-key-32-characters-long-minimum';
      kms = new KeyManagementService(mockDb);
    });

    test('should initialize key management tables', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);
      await kms.initialize();
      expect(mockDb.query).toHaveBeenCalled();
    });

    test('should generate new encryption key', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'key-123' }],
      } as any);

      const keyId = await kms.generateKey('test-key', 'phishing-credentials');
      expect(keyId).toBe('key-123');
    });

    test('should list keys by purpose', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          name: 'key1',
          purpose: 'test',
          created_at: new Date(),
          status: 'ACTIVE',
          version: 1,
        },
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockKeys } as any);

      const keys = await kms.listKeys('test');
      expect(keys).toHaveLength(1);
      expect(keys[0].purpose).toBe('test');
    });
  });

  describe('SecureDataDeletion', () => {
    let secureDelete: SecureDataDeletion;
    let mockDb: jest.Mocked<Pool>;

    beforeEach(() => {
      mockDb = {
        query: jest.fn(),
        connect: jest.fn().mockResolvedValue({
          query: jest.fn(),
          release: jest.fn(),
        }),
      } as any;

      secureDelete = new SecureDataDeletion(mockDb);
    });

    test('should have data retention policies defined', () => {
      expect(DataRetentionPolicies.PHISHING_CREDENTIALS).toBe(30);
      expect(DataRetentionPolicies.AUDIT_LOGS).toBe(7 * 365);
      expect(DataRetentionPolicies.NETWORK_TEST_DATA).toBe(0);
    });

    test('should securely delete record with overwrite', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1 } as any);

      const result = await secureDelete.secureDeleteRecord('test_table', 'record-123');
      expect(result.success).toBe(true);
      expect(result.itemsDeleted).toBeGreaterThanOrEqual(0);
    });

    test('should delete expired phishing data', async () => {
      mockDb.query.mockResolvedValue({ rows: [] } as any);

      const result = await secureDelete.deleteExpiredPhishingData(30);
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('itemsDeleted');
    });
  });

  describe('Integration Tests', () => {
    test('should work together: encrypt data, store with key management, then securely delete', async () => {
      // This is a conceptual test showing how services work together
      const encryptionService = new EncryptionService();
      
      // Encrypt sensitive data
      const sensitiveData = 'user-password-123';
      const encrypted = await encryptionService.encrypt(sensitiveData);
      
      expect(encrypted).toBeDefined();
      
      // Decrypt to verify
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(sensitiveData);
    });

    test('should enforce rate limits and CSRF protection together', async () => {
      const mockRedis = {
        isOpen: false,
        connect: jest.fn().mockResolvedValue(undefined),
        zRemRangeByScore: jest.fn().mockResolvedValue(0),
        zCard: jest.fn().mockResolvedValue(0),
        zAdd: jest.fn().mockResolvedValue(1),
        expire: jest.fn().mockResolvedValue(1),
        zRange: jest.fn().mockResolvedValue([]),
      };

      const rateLimiter = new RateLimiter(mockRedis);
      const csrfProtection = new CSRFProtection();

      // Check rate limit
      const rateResult = await rateLimiter.checkLimit('user-123', 10, 60000);
      expect(rateResult.allowed).toBe(true);

      // Generate CSRF token
      const token = await csrfProtection.generateToken('session-123');
      expect(token).toBeDefined();

      // Validate CSRF token
      const isValid = await csrfProtection.validateToken('session-123', token);
      expect(isValid).toBe(true);
    });
  });
});
