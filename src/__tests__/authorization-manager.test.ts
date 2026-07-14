import { Pool } from 'pg';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { AuthorizationRepository } from '../repositories/AuthorizationRepository';
import { Authorization, AuthorizationDocument } from '../models/Authorization';
import { OperationType, Target, Scope } from '../types';
import { AuthorizationError, ScopeViolationError, ExpiredAuthorizationError } from '../utils/errors';

// Mock the repository
jest.mock('../repositories/AuthorizationRepository');

describe('AuthorizationManager', () => {
  let manager: AuthorizationManager;
  let mockPool: Pool;
  let mockRepository: jest.Mocked<AuthorizationRepository>;

  const mockScope: Scope = {
    domains: ['example.com', 'test.com'],
    ipRanges: ['192.168.1.0/24'],
    networks: [{ ssid: 'TestNetwork', bssid: '00:11:22:33:44:55' }],
    emailDomains: ['example.com'],
  };

  const validAuthorization = new Authorization({
    id: 'auth-123',
    userId: 'user-123',
    organizationName: 'Test Corp',
    scope: mockScope,
    validFrom: new Date(Date.now() - 86400000), // Yesterday
    validUntil: new Date(Date.now() + 86400000), // Tomorrow
    signedBy: 'John Doe',
    digitalSignature: 'abc123',
    documentPath: '/path/to/doc',
    status: 'ACTIVE',
    allowedOperations: ['WEB_SCAN', 'PHISHING_CAMPAIGN'] as OperationType[],
  });

  beforeEach(() => {
    mockPool = {} as Pool;
    manager = new AuthorizationManager(mockPool);
    mockRepository = (manager as any).repository as jest.Mocked<AuthorizationRepository>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateAuthorization', () => {
    it('should reject operation without authorization', async () => {
      // Setup: No authorizations found
      mockRepository.findActiveByUserAndOperation.mockResolvedValue([]);

      const target: Target = { type: 'DOMAIN', value: 'example.com' };
      const result = await manager.validateAuthorization('user-123', target, 'WEB_SCAN');

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('No valid authorization found');
      expect(mockRepository.findActiveByUserAndOperation).toHaveBeenCalledWith('user-123', 'WEB_SCAN');
    });

    it('should accept operation with valid authorization', async () => {
      // Setup: Valid authorization found
      mockRepository.findActiveByUserAndOperation.mockResolvedValue([validAuthorization]);

      const target: Target = { type: 'DOMAIN', value: 'example.com' };
      const result = await manager.validateAuthorization('user-123', target, 'WEB_SCAN');

      expect(result.authorized).toBe(true);
      expect(result.authorizationId).toBe('auth-123');
      expect(result.expiresAt).toEqual(validAuthorization.validUntil);
    });

    it('should reject operation when target is out of scope', async () => {
      mockRepository.findActiveByUserAndOperation.mockResolvedValue([validAuthorization]);

      const target: Target = { type: 'DOMAIN', value: 'unauthorized.com' };
      const result = await manager.validateAuthorization('user-123', target, 'WEB_SCAN');

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('outside the authorized scope');
    });

    it('should reject operation when authorization is expired', async () => {
      const expiredAuth = new Authorization({
        ...validAuthorization,
        validFrom: new Date('2023-01-01'),
        validUntil: new Date('2023-12-31'),
      });

      mockRepository.findActiveByUserAndOperation.mockResolvedValue([expiredAuth]);

      const target: Target = { type: 'DOMAIN', value: 'example.com' };
      const result = await manager.validateAuthorization('user-123', target, 'WEB_SCAN');

      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('No valid authorization found');
    });

    it('should validate domain targets correctly', async () => {
      mockRepository.findActiveByUserAndOperation.mockResolvedValue([validAuthorization]);

      const target: Target = { type: 'DOMAIN', value: 'api.example.com' };
      const result = await manager.validateAuthorization('user-123', target, 'WEB_SCAN');

      expect(result.authorized).toBe(true);
    });

    it('should validate IP targets correctly', async () => {
      mockRepository.findActiveByUserAndOperation.mockResolvedValue([validAuthorization]);

      const target: Target = { type: 'IP', value: '192.168.1.50' };
      const result = await manager.validateAuthorization('user-123', target, 'WEB_SCAN');

      expect(result.authorized).toBe(true);
    });

    it('should validate email targets correctly', async () => {
      mockRepository.findActiveByUserAndOperation.mockResolvedValue([validAuthorization]);

      const target: Target = { type: 'EMAIL', value: 'user@example.com' };
      const result = await manager.validateAuthorization('user-123', target, 'PHISHING_CAMPAIGN');

      expect(result.authorized).toBe(true);
    });

    it('should validate network targets correctly', async () => {
      mockRepository.findActiveByUserAndOperation.mockResolvedValue([validAuthorization]);

      const target: Target = { type: 'NETWORK', value: 'TestNetwork|00:11:22:33:44:55' };
      const result = await manager.validateAuthorization('user-123', target, 'NETWORK_ANALYSIS');

      expect(result.authorized).toBe(true);
    });
  });

  describe('uploadAuthorization', () => {
    const validDocument: AuthorizationDocument = {
      organizationName: 'Test Corp',
      scope: mockScope,
      validFrom: new Date('2024-01-01'),
      validUntil: new Date('2024-12-31'),
      signedBy: 'John Doe',
      digitalSignature: 'signature123',
      allowedOperations: ['WEB_SCAN'] as OperationType[],
    };

    it('should upload valid authorization document', async () => {
      mockRepository.create.mockResolvedValue(validAuthorization);

      const authId = await manager.uploadAuthorization(
        'user-123',
        validDocument,
        '/path/to/doc.pdf'
      );

      expect(authId).toBe('auth-123');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          organizationName: 'Test Corp',
          documentPath: '/path/to/doc.pdf',
        })
      );
    });

    it('should reject document without organization name', async () => {
      const invalidDoc = { ...validDocument, organizationName: '' };

      await expect(
        manager.uploadAuthorization('user-123', invalidDoc, '/path/to/doc.pdf')
      ).rejects.toThrow('Organization name is required');
    });

    it('should reject document without signedBy', async () => {
      const invalidDoc = { ...validDocument, signedBy: '' };

      await expect(
        manager.uploadAuthorization('user-123', invalidDoc, '/path/to/doc.pdf')
      ).rejects.toThrow('Signed by is required');
    });

    it('should reject document without digital signature', async () => {
      const invalidDoc = { ...validDocument, digitalSignature: '' };

      await expect(
        manager.uploadAuthorization('user-123', invalidDoc, '/path/to/doc.pdf')
      ).rejects.toThrow('Digital signature is required');
    });

    it('should reject document with invalid date range', async () => {
      const invalidDoc = {
        ...validDocument,
        validFrom: new Date('2024-12-31'),
        validUntil: new Date('2024-01-01'),
      };

      await expect(
        manager.uploadAuthorization('user-123', invalidDoc, '/path/to/doc.pdf')
      ).rejects.toThrow('Valid from date must be before valid until date');
    });

    it('should reject document without scope', async () => {
      const invalidDoc = {
        ...validDocument,
        scope: {
          domains: [],
          ipRanges: [],
          networks: [],
          emailDomains: [],
        },
      };

      await expect(
        manager.uploadAuthorization('user-123', invalidDoc, '/path/to/doc.pdf')
      ).rejects.toThrow('At least one scope must be defined');
    });

    it('should reject document without allowed operations', async () => {
      const invalidDoc = {
        ...validDocument,
        allowedOperations: [] as OperationType[],
      };

      await expect(
        manager.uploadAuthorization('user-123', invalidDoc, '/path/to/doc.pdf')
      ).rejects.toThrow('At least one operation must be allowed');
    });
  });

  describe('isTargetInScope', () => {
    it('should return true when target is in scope', async () => {
      mockRepository.findById.mockResolvedValue(validAuthorization);

      const target: Target = { type: 'DOMAIN', value: 'example.com' };
      const inScope = await manager.isTargetInScope('auth-123', target);

      expect(inScope).toBe(true);
    });

    it('should return false when target is out of scope', async () => {
      mockRepository.findById.mockResolvedValue(validAuthorization);

      const target: Target = { type: 'DOMAIN', value: 'unauthorized.com' };
      const inScope = await manager.isTargetInScope('auth-123', target);

      expect(inScope).toBe(false);
    });
  });

  describe('isAuthorizationValid', () => {
    it('should return true for valid authorization', async () => {
      mockRepository.findById.mockResolvedValue(validAuthorization);

      const isValid = await manager.isAuthorizationValid('auth-123');

      expect(isValid).toBe(true);
    });

    it('should return false for expired authorization', async () => {
      const expiredAuth = new Authorization({
        ...validAuthorization,
        validUntil: new Date('2023-12-31'),
      });

      mockRepository.findById.mockResolvedValue(expiredAuth);

      const isValid = await manager.isAuthorizationValid('auth-123');

      expect(isValid).toBe(false);
    });

    it('should return false when authorization not found', async () => {
      mockRepository.findById.mockRejectedValue(new Error('Not found'));

      const isValid = await manager.isAuthorizationValid('invalid-id');

      expect(isValid).toBe(false);
    });
  });

  describe('revokeAuthorization', () => {
    it('should revoke valid authorization', async () => {
      mockRepository.findById.mockResolvedValue(validAuthorization);
      mockRepository.revoke.mockResolvedValue(undefined);

      await manager.revokeAuthorization('auth-123', 'Security breach');

      expect(mockRepository.revoke).toHaveBeenCalledWith('auth-123', 'Security breach');
    });

    it('should throw error when revoking already revoked authorization', async () => {
      const revokedAuth = new Authorization({
        ...validAuthorization,
        status: 'REVOKED',
      });

      mockRepository.findById.mockResolvedValue(revokedAuth);

      await expect(
        manager.revokeAuthorization('auth-123', 'Test')
      ).rejects.toThrow(AuthorizationError);
    });
  });

  describe('validateTargetOrThrow', () => {
    it('should return authorization ID for valid target', async () => {
      mockRepository.findActiveByUserAndOperation.mockResolvedValue([validAuthorization]);

      const target: Target = { type: 'DOMAIN', value: 'example.com' };
      const authId = await manager.validateTargetOrThrow('user-123', target, 'WEB_SCAN');

      expect(authId).toBe('auth-123');
    });

    it('should throw AuthorizationError when no authorization found', async () => {
      mockRepository.findActiveByUserAndOperation.mockResolvedValue([]);

      const target: Target = { type: 'DOMAIN', value: 'example.com' };

      await expect(
        manager.validateTargetOrThrow('user-123', target, 'WEB_SCAN')
      ).rejects.toThrow(AuthorizationError);
    });

    it('should throw ScopeViolationError when target out of scope', async () => {
      mockRepository.findActiveByUserAndOperation.mockResolvedValue([validAuthorization]);

      const target: Target = { type: 'DOMAIN', value: 'unauthorized.com' };

      await expect(
        manager.validateTargetOrThrow('user-123', target, 'WEB_SCAN')
      ).rejects.toThrow(ScopeViolationError);
    });
  });

  describe('checkExpirationOrThrow', () => {
    it('should not throw for valid authorization', async () => {
      mockRepository.findById.mockResolvedValue(validAuthorization);

      await expect(
        manager.checkExpirationOrThrow('auth-123')
      ).resolves.not.toThrow();
    });

    it('should throw ExpiredAuthorizationError for expired authorization', async () => {
      const expiredAuth = new Authorization({
        ...validAuthorization,
        validUntil: new Date('2023-12-31'),
      });

      mockRepository.findById.mockResolvedValue(expiredAuth);

      await expect(
        manager.checkExpirationOrThrow('auth-123')
      ).rejects.toThrow(ExpiredAuthorizationError);
    });

    it('should throw AuthorizationError for revoked authorization', async () => {
      const revokedAuth = new Authorization({
        ...validAuthorization,
        status: 'REVOKED',
        revocationReason: 'Security breach',
      });

      mockRepository.findById.mockResolvedValue(revokedAuth);

      await expect(
        manager.checkExpirationOrThrow('auth-123')
      ).rejects.toThrow(AuthorizationError);
    });
  });
});
