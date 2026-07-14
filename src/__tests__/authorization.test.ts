import { Authorization } from '../models/Authorization';
import { Scope, OperationType } from '../types';

describe('Authorization Model', () => {
  const mockScope: Scope = {
    domains: ['example.com', 'test.com'],
    ipRanges: ['192.168.1.0/24', '10.0.0.1'],
    networks: [{ ssid: 'TestNetwork', bssid: '00:11:22:33:44:55' }],
    emailDomains: ['example.com'],
  };

  const mockAuthorization = new Authorization({
    id: 'auth-123',
    userId: 'user-123',
    organizationName: 'Test Corp',
    scope: mockScope,
    validFrom: new Date('2024-01-01'),
    validUntil: new Date('2024-12-31'),
    signedBy: 'John Doe',
    digitalSignature: 'abc123',
    documentPath: '/path/to/doc',
    status: 'ACTIVE',
    allowedOperations: ['WEB_SCAN', 'PHISHING_CAMPAIGN'] as OperationType[],
  });

  describe('isValid', () => {
    it('should return true for active authorization within valid period', () => {
      const auth = new Authorization({
        ...mockAuthorization,
        validFrom: new Date(Date.now() - 86400000), // Yesterday
        validUntil: new Date(Date.now() + 86400000), // Tomorrow
        status: 'ACTIVE',
      });

      expect(auth.isValid()).toBe(true);
    });

    it('should return false for expired authorization', () => {
      const auth = new Authorization({
        ...mockAuthorization,
        validFrom: new Date('2023-01-01'),
        validUntil: new Date('2023-12-31'),
        status: 'ACTIVE',
      });

      expect(auth.isValid()).toBe(false);
    });

    it('should return false for revoked authorization', () => {
      const auth = new Authorization({
        ...mockAuthorization,
        validFrom: new Date(Date.now() - 86400000),
        validUntil: new Date(Date.now() + 86400000),
        status: 'REVOKED',
      });

      expect(auth.isValid()).toBe(false);
    });

    it('should return false for authorization not yet valid', () => {
      const auth = new Authorization({
        ...mockAuthorization,
        validFrom: new Date(Date.now() + 86400000), // Tomorrow
        validUntil: new Date(Date.now() + 172800000), // Day after tomorrow
        status: 'ACTIVE',
      });

      expect(auth.isValid()).toBe(false);
    });
  });

  describe('isExpired', () => {
    it('should return true for expired authorization', () => {
      const auth = new Authorization({
        ...mockAuthorization,
        validUntil: new Date('2023-12-31'),
      });

      expect(auth.isExpired()).toBe(true);
    });

    it('should return false for valid authorization', () => {
      const auth = new Authorization({
        ...mockAuthorization,
        validUntil: new Date(Date.now() + 86400000),
      });

      expect(auth.isExpired()).toBe(false);
    });

    it('should return true if status is EXPIRED', () => {
      const auth = new Authorization({
        ...mockAuthorization,
        validUntil: new Date(Date.now() + 86400000),
        status: 'EXPIRED',
      });

      expect(auth.isExpired()).toBe(true);
    });
  });

  describe('allowsOperation', () => {
    it('should return true for allowed operation', () => {
      expect(mockAuthorization.allowsOperation('WEB_SCAN')).toBe(true);
      expect(mockAuthorization.allowsOperation('PHISHING_CAMPAIGN')).toBe(true);
    });

    it('should return false for disallowed operation', () => {
      expect(mockAuthorization.allowsOperation('NETWORK_ANALYSIS')).toBe(false);
    });
  });

  describe('isDomainInScope', () => {
    it('should return true for exact domain match', () => {
      expect(mockAuthorization.isDomainInScope('example.com')).toBe(true);
      expect(mockAuthorization.isDomainInScope('test.com')).toBe(true);
    });

    it('should return true for subdomain', () => {
      expect(mockAuthorization.isDomainInScope('api.example.com')).toBe(true);
      expect(mockAuthorization.isDomainInScope('www.test.com')).toBe(true);
    });

    it('should return false for domain not in scope', () => {
      expect(mockAuthorization.isDomainInScope('unauthorized.com')).toBe(false);
      expect(mockAuthorization.isDomainInScope('example.org')).toBe(false);
    });

    it('should not match partial domain names', () => {
      expect(mockAuthorization.isDomainInScope('notexample.com')).toBe(false);
    });
  });

  describe('isIpInScope', () => {
    it('should return true for exact IP match', () => {
      expect(mockAuthorization.isIpInScope('10.0.0.1')).toBe(true);
    });

    it('should return true for IP in CIDR range', () => {
      expect(mockAuthorization.isIpInScope('192.168.1.1')).toBe(true);
      expect(mockAuthorization.isIpInScope('192.168.1.100')).toBe(true);
      expect(mockAuthorization.isIpInScope('192.168.1.254')).toBe(true);
    });

    it('should return false for IP outside CIDR range', () => {
      expect(mockAuthorization.isIpInScope('192.168.2.1')).toBe(false);
      expect(mockAuthorization.isIpInScope('10.0.0.2')).toBe(false);
    });
  });

  describe('isEmailDomainInScope', () => {
    it('should return true for email with authorized domain', () => {
      expect(mockAuthorization.isEmailDomainInScope('user@example.com')).toBe(true);
    });

    it('should return true for email with subdomain', () => {
      expect(mockAuthorization.isEmailDomainInScope('user@mail.example.com')).toBe(true);
    });

    it('should return false for email with unauthorized domain', () => {
      expect(mockAuthorization.isEmailDomainInScope('user@unauthorized.com')).toBe(false);
    });

    it('should return false for invalid email', () => {
      expect(mockAuthorization.isEmailDomainInScope('invalid-email')).toBe(false);
    });
  });

  describe('isNetworkInScope', () => {
    it('should return true for network in scope', () => {
      expect(
        mockAuthorization.isNetworkInScope({
          ssid: 'TestNetwork',
          bssid: '00:11:22:33:44:55',
        })
      ).toBe(true);
    });

    it('should return false for network not in scope', () => {
      expect(
        mockAuthorization.isNetworkInScope({
          ssid: 'OtherNetwork',
          bssid: 'AA:BB:CC:DD:EE:FF',
        })
      ).toBe(false);
    });
  });

  describe('toObject', () => {
    it('should convert authorization to plain object', () => {
      const obj = mockAuthorization.toObject();

      expect(obj).toHaveProperty('id');
      expect(obj).toHaveProperty('userId');
      expect(obj).toHaveProperty('organizationName');
      expect(obj).toHaveProperty('scope');
      expect(obj).toHaveProperty('validFrom');
      expect(obj).toHaveProperty('validUntil');
      expect(obj).toHaveProperty('status');
      expect(obj).toHaveProperty('allowedOperations');
    });
  });
});
