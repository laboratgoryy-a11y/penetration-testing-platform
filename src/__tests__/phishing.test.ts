import { Pool } from 'pg';
import {
  PhishingEngine,
  EncryptionService,
  AuthorizationManager,
  DataRetentionService,
} from '../services';
import {
  PhishingCampaign,
  CampaignTarget,
  CampaignInteraction,
} from '../models';

// Mock pool for testing
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe('PhishingEngine', () => {
  let phishingEngine: PhishingEngine;
  let authorizationManager: AuthorizationManager;
  let encryptionService: EncryptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock authorization manager
    authorizationManager = {
      validateAuthorization: jest.fn(),
      isTargetInScope: jest.fn(),
      isAuthorizationValid: jest.fn(),
    } as any;

    // Create encryption service with test key
    encryptionService = new EncryptionService('test-master-key-32-characters-long');

    // Create phishing engine
    phishingEngine = new PhishingEngine(
      mockPool,
      authorizationManager,
      encryptionService
    );
  });

  describe('createCampaign', () => {
    it('should reject campaign creation without valid authorization', async () => {
      // Mock authorization validation to fail
      (authorizationManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: false,
        reason: 'No valid authorization found',
      });

      const campaignInput = {
        name: 'Test Campaign',
        authorizationId: 'auth-123',
        targets: [{ email: 'test@example.com' }],
        emailTemplate: {
          subject: 'Test',
          body: 'Test body',
          senderName: 'Sender',
          senderEmail: 'sender@example.com',
          trackingEnabled: true,
          disclaimer: '',
        },
        landingPage: {
          pageType: 'CREDENTIAL_HARVEST' as const,
          captureFields: ['username', 'password'],
        },
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          sendingPattern: 'IMMEDIATE' as const,
        },
      };

      await expect(
        phishingEngine.createCampaign('user-123', campaignInput)
      ).rejects.toThrow('Authorization required');
    });

    it('should add disclaimer to email template', async () => {
      // Mock successful authorization
      (authorizationManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });
      (authorizationManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

      // Mock database insert
      mockPool.query = jest.fn().mockResolvedValue({
        rows: [{ id: 'campaign-123' }],
      });

      const campaignInput = {
        name: 'Test Campaign',
        authorizationId: 'auth-123',
        targets: [{ email: 'test@example.com' }],
        emailTemplate: {
          subject: 'Test',
          body: 'Test body',
          senderName: 'Sender',
          senderEmail: 'sender@example.com',
          trackingEnabled: true,
          disclaimer: '',
        },
        landingPage: {
          pageType: 'CREDENTIAL_HARVEST' as const,
          captureFields: ['username', 'password'],
        },
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          sendingPattern: 'IMMEDIATE' as const,
        },
      };

      const campaignId = await phishingEngine.createCampaign('user-123', campaignInput);

      expect(campaignId).toBe('campaign-123');
      
      // Verify that the email template was stored with disclaimer
      const insertCall = (mockPool.query as jest.Mock).mock.calls[0];
      const emailTemplate = JSON.parse(insertCall[1][4]);
      expect(emailTemplate.body).toContain('security awareness training');
    });

    it('should reject targets outside authorized scope', async () => {
      // Mock authorization validation to succeed
      (authorizationManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });
      
      // Mock scope check to fail for one target
      (authorizationManager.isTargetInScope as jest.Mock).mockResolvedValue(false);

      const campaignInput = {
        name: 'Test Campaign',
        authorizationId: 'auth-123',
        targets: [{ email: 'test@unauthorized.com' }],
        emailTemplate: {
          subject: 'Test',
          body: 'Test body',
          senderName: 'Sender',
          senderEmail: 'sender@example.com',
          trackingEnabled: true,
          disclaimer: '',
        },
        landingPage: {
          pageType: 'CREDENTIAL_HARVEST' as const,
          captureFields: ['username', 'password'],
        },
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          sendingPattern: 'IMMEDIATE' as const,
        },
      };

      await expect(
        phishingEngine.createCampaign('user-123', campaignInput)
      ).rejects.toThrow('outside authorized scope');
    });
  });

  describe('trackInteraction', () => {
    it('should encrypt captured credentials', async () => {
      // Mock finding target by tracking token
      mockPool.query = jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'target-123',
            campaign_id: 'campaign-123',
            email: 'test@example.com',
            tracking_token: 'token-123',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'interaction-123' }],
        });

      const credentials = {
        username: 'testuser',
        password: 'testpass123',
      };

      await phishingEngine.trackInteraction({
        campaignId: 'campaign-123',
        trackingToken: 'token-123',
        interactionType: 'CREDENTIALS_ENTERED',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        capturedData: credentials,
      });

      // Verify interaction was created with encrypted data
      const insertCall = (mockPool.query as jest.Mock).mock.calls[1];
      const capturedData = insertCall[1][6];
      
      expect(capturedData).toBeInstanceOf(Buffer);
      expect(capturedData.toString()).not.toContain('testuser');
      expect(capturedData.toString()).not.toContain('testpass123');
    });
  });
});

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;

  beforeEach(() => {
    encryptionService = new EncryptionService('test-master-key-32-characters-long');
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt string data', async () => {
      const originalData = 'sensitive information';
      
      const encrypted = await encryptionService.encrypt(originalData);
      expect(encrypted).toBeInstanceOf(Buffer);
      expect(encrypted.toString()).not.toContain(originalData);

      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(originalData);
    });

    it('should encrypt and decrypt object data', async () => {
      const originalData = {
        username: 'testuser',
        password: 'testpass123',
        email: 'test@example.com',
      };

      const encrypted = await encryptionService.encryptObject(originalData);
      expect(encrypted).toBeInstanceOf(Buffer);

      const decrypted = await encryptionService.decryptObject(encrypted);
      expect(decrypted).toEqual(originalData);
    });

    it('should produce different ciphertext for same plaintext', async () => {
      const data = 'test data';
      
      const encrypted1 = await encryptionService.encrypt(data);
      const encrypted2 = await encryptionService.encrypt(data);

      // Different ciphertext due to random IV
      expect(encrypted1.toString('hex')).not.toBe(encrypted2.toString('hex'));

      // But both decrypt to same plaintext
      const decrypted1 = await encryptionService.decrypt(encrypted1);
      const decrypted2 = await encryptionService.decrypt(encrypted2);
      expect(decrypted1).toBe(data);
      expect(decrypted2).toBe(data);
    });

    it('should fail to decrypt with wrong key', async () => {
      const data = 'sensitive data';
      const encrypted = await encryptionService.encrypt(data);

      const wrongKeyService = new EncryptionService('wrong-key-32-characters-long!!!');
      
      await expect(
        wrongKeyService.decrypt(encrypted)
      ).rejects.toThrow('Decryption failed');
    });
  });

  describe('encryptCredentials and decryptCredentials', () => {
    it('should encrypt and decrypt credentials', async () => {
      const credentials = {
        username: 'admin',
        password: 'P@ssw0rd!',
        token: 'abc123xyz',
      };

      const encrypted = await encryptionService.encryptCredentials(credentials);
      expect(encrypted).toBeInstanceOf(Buffer);

      const decrypted = await encryptionService.decryptCredentials(encrypted);
      expect(decrypted).toEqual(credentials);
    });
  });

  describe('generateKey', () => {
    it('should generate random keys', async () => {
      const key1 = await encryptionService.generateKey();
      const key2 = await encryptionService.generateKey();

      expect(key1).toHaveLength(64); // 32 bytes in hex
      expect(key2).toHaveLength(64);
      expect(key1).not.toBe(key2);
    });
  });
});

describe('DataRetentionService', () => {
  let dataRetentionService: DataRetentionService;

  beforeEach(() => {
    jest.clearAllMocks();
    dataRetentionService = new DataRetentionService(mockPool, {
      phishingCredentialsRetentionDays: 30,
      statisticsRetentionDays: 365,
    });
  });

  describe('getRetentionPolicy', () => {
    it('should return current retention policy', () => {
      const policy = dataRetentionService.getRetentionPolicy();
      
      expect(policy.phishingCredentialsRetentionDays).toBe(30);
      expect(policy.statisticsRetentionDays).toBe(365);
    });
  });

  describe('updateRetentionPolicy', () => {
    it('should update retention policy', () => {
      dataRetentionService.updateRetentionPolicy({
        phishingCredentialsRetentionDays: 60,
      });

      const policy = dataRetentionService.getRetentionPolicy();
      expect(policy.phishingCredentialsRetentionDays).toBe(60);
      expect(policy.statisticsRetentionDays).toBe(365); // unchanged
    });
  });

  describe('cleanupExpiredData', () => {
    it('should delete sensitive data from expired campaigns', async () => {
      // Mock finding expired campaigns
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

      mockPool.query = jest.fn()
        .mockResolvedValueOnce({
          // findExpiredCampaigns query
          rows: [
            {
              id: 'campaign-1',
              user_id: 'user-123',
              authorization_id: 'auth-123',
              name: 'Old Campaign',
              status: 'COMPLETED',
              email_template: {},
              landing_page_config: {},
              schedule: { endDate: oldDate },
              created_at: oldDate,
              completed_at: oldDate,
            },
          ],
        })
        .mockResolvedValueOnce({
          // deleteSensitiveData query
          rows: [],
        })
        .mockResolvedValueOnce({
          // deleteOldInteractions query
          rowCount: 5,
        });

      const result = await dataRetentionService.cleanupExpiredData();

      expect(result.campaignsProcessed).toBe(1);
      expect(result.credentialsDeleted).toBe(1);
      expect(result.interactionsDeleted).toBe(5);
    });
  });
});

// Additional unit tests for PhishingEngine - Task 16.3
describe('PhishingEngine - Additional Unit Tests', () => {
  let phishingEngine: PhishingEngine;
  let authorizationManager: AuthorizationManager;
  let encryptionService: EncryptionService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    authorizationManager = {
      validateAuthorization: jest.fn(),
      isTargetInScope: jest.fn(),
      isAuthorizationValid: jest.fn(),
    } as any;

    encryptionService = new EncryptionService('test-master-key-32-characters-long');

    phishingEngine = new PhishingEngine(
      mockPool,
      authorizationManager,
      encryptionService
    );
  });

  describe('إضافة إخلاء المسؤولية', () => {
    it('should automatically add disclaimer to email template', async () => {
      (authorizationManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });
      (authorizationManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

      mockPool.query = jest.fn().mockResolvedValue({
        rows: [{ id: 'campaign-123' }],
      });

      const campaignInput = {
        name: 'Test Campaign',
        authorizationId: 'auth-123',
        targets: [{ email: 'test@example.com' }],
        emailTemplate: {
          subject: 'Important Update',
          body: 'Please click here to update your account.',
          senderName: 'IT Support',
          senderEmail: 'support@example.com',
          trackingEnabled: true,
          disclaimer: '',
        },
        landingPage: {
          pageType: 'CREDENTIAL_HARVEST' as const,
          captureFields: ['username', 'password'],
        },
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          sendingPattern: 'IMMEDIATE' as const,
        },
      };

      await phishingEngine.createCampaign('user-123', campaignInput);

      const insertCall = (mockPool.query as jest.Mock).mock.calls[0];
      const emailTemplate = JSON.parse(insertCall[1][4]);
      
      expect(emailTemplate.body).toContain('security awareness training');
      expect(emailTemplate.disclaimer).toBeTruthy();
    });

    it('should preserve existing disclaimer if provided', async () => {
      (authorizationManager.validateAuthorization as jest.Mock).mockResolvedValue({
        authorized: true,
        authorizationId: 'auth-123',
      });
      (authorizationManager.isTargetInScope as jest.Mock).mockResolvedValue(true);

      mockPool.query = jest.fn().mockResolvedValue({
        rows: [{ id: 'campaign-123' }],
      });

      const customDisclaimer = 'Custom disclaimer text';
      const campaignInput = {
        name: 'Test Campaign',
        authorizationId: 'auth-123',
        targets: [{ email: 'test@example.com' }],
        emailTemplate: {
          subject: 'Test',
          body: 'Test body',
          senderName: 'Sender',
          senderEmail: 'sender@example.com',
          trackingEnabled: true,
          disclaimer: customDisclaimer,
        },
        landingPage: {
          pageType: 'CREDENTIAL_HARVEST' as const,
          captureFields: ['username', 'password'],
        },
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000),
          sendingPattern: 'IMMEDIATE' as const,
        },
      };

      await phishingEngine.createCampaign('user-123', campaignInput);

      const insertCall = (mockPool.query as jest.Mock).mock.calls[0];
      const emailTemplate = JSON.parse(insertCall[1][4]);
      
      expect(emailTemplate.body).toContain(customDisclaimer);
    });
  });

  describe('تتبع التفاعلات', () => {
    it('should track email opened interaction', async () => {
      mockPool.query = jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'target-123',
            campaign_id: 'campaign-123',
            email: 'test@example.com',
            tracking_token: 'token-123',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'interaction-123' }],
        });

      await phishingEngine.trackInteraction({
        campaignId: 'campaign-123',
        trackingToken: 'token-123',
        interactionType: 'EMAIL_OPENED',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      const insertCall = (mockPool.query as jest.Mock).mock.calls[1];
      expect(insertCall[1]).toContain('EMAIL_OPENED');
    });

    it('should track link clicked interaction', async () => {
      mockPool.query = jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'target-123',
            campaign_id: 'campaign-123',
            email: 'test@example.com',
            tracking_token: 'token-123',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'interaction-123' }],
        });

      await phishingEngine.trackInteraction({
        campaignId: 'campaign-123',
        trackingToken: 'token-123',
        interactionType: 'LINK_CLICKED',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        geolocation: 'US',
      });

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      const insertCall = (mockPool.query as jest.Mock).mock.calls[1];
      expect(insertCall[1]).toContain('LINK_CLICKED');
    });

    it('should track credentials entered with IP and user agent', async () => {
      mockPool.query = jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'target-123',
            campaign_id: 'campaign-123',
            email: 'test@example.com',
            tracking_token: 'token-123',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'interaction-123' }],
        });

      await phishingEngine.trackInteraction({
        campaignId: 'campaign-123',
        trackingToken: 'token-123',
        interactionType: 'CREDENTIALS_ENTERED',
        ipAddress: '192.168.1.100',
        userAgent: 'Chrome/91.0',
        geolocation: 'New York, US',
        capturedData: {
          username: 'testuser',
          password: 'testpass',
        },
      });

      const insertCall = (mockPool.query as jest.Mock).mock.calls[1];
      expect(insertCall[1][3]).toBe('192.168.1.100');
      expect(insertCall[1][4]).toBe('Chrome/91.0');
      expect(insertCall[1][5]).toBe('New York, US');
    });
  });

  describe('تشفير البيانات', () => {
    it('should encrypt captured credentials before storage', async () => {
      mockPool.query = jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'target-123',
            campaign_id: 'campaign-123',
            email: 'test@example.com',
            tracking_token: 'token-123',
          }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 'interaction-123' }],
        });

      const credentials = {
        username: 'admin',
        password: 'P@ssw0rd123',
        token: 'secret-token',
      };

      await phishingEngine.trackInteraction({
        campaignId: 'campaign-123',
        trackingToken: 'token-123',
        interactionType: 'CREDENTIALS_ENTERED',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        capturedData: credentials,
      });

      const insertCall = (mockPool.query as jest.Mock).mock.calls[1];
      const capturedData = insertCall[1][6];
      
      // Verify data is encrypted (Buffer)
      expect(capturedData).toBeInstanceOf(Buffer);
      
      // Verify plaintext is not in encrypted data
      const encryptedString = capturedData.toString();
      expect(encryptedString).not.toContain('admin');
      expect(encryptedString).not.toContain('P@ssw0rd123');
      expect(encryptedString).not.toContain('secret-token');
    });

    it('should decrypt credentials correctly', async () => {
      const originalCredentials = {
        username: 'testuser',
        password: 'testpass123',
        email: 'test@example.com',
      };

      const encrypted = await encryptionService.encryptCredentials(originalCredentials);
      const decrypted = await encryptionService.decryptCredentials(encrypted);

      expect(decrypted).toEqual(originalCredentials);
    });
  });

  describe('الحذف التلقائي', () => {
    it('should delete sensitive data for old campaigns', async () => {
      mockPool.query = jest.fn().mockResolvedValue({
        rowCount: 5,
      });

      await phishingEngine.deleteSensitiveData('campaign-123');

      expect(mockPool.query).toHaveBeenCalled();
      const deleteCall = (mockPool.query as jest.Mock).mock.calls[0];
      expect(deleteCall[0]).toContain('UPDATE');
    });

    it('should retain statistical data after deletion', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      mockPool.query = jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'campaign-1',
            status: 'COMPLETED',
            completed_at: oldDate,
          }],
        })
        .mockResolvedValueOnce({
          rowCount: 3,
        });

      await phishingEngine.deleteSensitiveData('campaign-1');

      // Verify deletion was called
      expect(mockPool.query).toHaveBeenCalled();
    });
  });

  describe('إشعار الأهداف', () => {
    it('should notify targets after campaign completion', async () => {
      const mockNotificationService = {
        notifyTarget: jest.fn().mockResolvedValue(undefined),
      };

      const engineWithNotifications = new PhishingEngine(
        mockPool,
        authorizationManager,
        encryptionService,
        undefined,
        mockNotificationService
      );

      mockPool.query = jest.fn()
        .mockResolvedValueOnce({
          rows: [{
            id: 'campaign-123',
            name: 'Test Campaign',
            status: 'RUNNING',
            user_id: 'user-123',
            authorization_id: 'auth-123',
            email_template: {},
            landing_page_config: {},
            schedule: {},
            created_at: new Date(),
          }],
        })
        .mockResolvedValueOnce({
          rows: [],
        })
        .mockResolvedValueOnce({
          rows: [{
            id: 'campaign-123',
            name: 'Test Campaign',
            status: 'COMPLETED',
            completed_at: new Date(),
          }],
        })
        .mockResolvedValueOnce({
          rows: [
            { id: 'target-1', email: 'user1@example.com', campaign_id: 'campaign-123' },
            { id: 'target-2', email: 'user2@example.com', campaign_id: 'campaign-123' },
          ],
        });

      await engineWithNotifications.completeCampaign('campaign-123');

      expect(mockNotificationService.notifyTarget).toHaveBeenCalledTimes(2);
      expect(mockNotificationService.notifyTarget).toHaveBeenCalledWith(
        'user1@example.com',
        expect.stringContaining('Security Awareness'),
        expect.stringContaining('simulated phishing attack')
      );
    });
  });
});
