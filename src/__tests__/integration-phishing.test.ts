/**
 * Integration Tests - Phishing Campaign Workflow
 * 
 * Tests the complete workflow:
 * Create Campaign → Launch → Track Interactions → Complete → Generate Report
 * 
 * Requirements: 3.1, 3.3, 3.6, 4.1
 */

import { Pool } from 'pg';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { PhishingEngine, EmailService, NotificationService } from '../services/PhishingEngine';
import { EncryptionService } from '../services/EncryptionService';
import { ReportGenerator } from '../services/ReportGenerator';
import { AuthorizationDocument, OperationType } from '../types';

// Mock database pool
const mockPool = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
} as unknown as Pool;

// Mock services
const mockEmailService: EmailService = {
  sendEmail: jest.fn().mockResolvedValue(undefined),
};

const mockNotificationService: NotificationService = {
  notifyTarget: jest.fn().mockResolvedValue(undefined),
};

describe('Integration: Phishing Campaign Complete Workflow', () => {
  let authManager: AuthorizationManager;
  let encryptionService: EncryptionService;
  let phishingEngine: PhishingEngine;
  let reportGenerator: ReportGenerator;

  const testUserId = 'test-user-123';
  const testAuthId = 'auth-123';

  beforeEach(() => {
    jest.clearAllMocks();
    authManager = new AuthorizationManager(mockPool);
    encryptionService = new EncryptionService();
    phishingEngine = new PhishingEngine(
      mockPool,
      authManager,
      encryptionService,
      mockEmailService,
      mockNotificationService
    );
    reportGenerator = new ReportGenerator(mockPool, './test-reports');
  });

  describe('Complete Workflow: Create → Launch → Track → Complete → Report', () => {
    it('should complete full phishing campaign workflow successfully', async () => {
      // Step 1: Create Campaign
      const campaignInput = {
        name: 'Q1 Security Awareness Test',
        authorizationId: testAuthId,
        targets: [
          {
            email: 'employee1@example.com',
            name: 'Employee One',
            department: 'IT',
          },
          {
            email: 'employee2@example.com',
            name: 'Employee Two',
            department: 'HR',
          },
        ],
        emailTemplate: {
          subject: 'Urgent: Password Reset Required',
          body: 'Please click {tracking_link} to reset your password.',
          senderName: 'IT Support',
          senderEmail: 'support@example.com',
          trackingEnabled: true,
          disclaimer: 'This is a security awareness test.',
        },
        landingPage: {
          pageType: 'CREDENTIAL_HARVEST' as const,
          captureFields: ['username', 'password'],
        },
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          sendingPattern: 'STAGGERED' as const,
        },
      };

      const campaignId = 'campaign-123';

      // Mock authorization validation
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // findActiveByUserAndOperation
          rows: [
            {
              id: testAuthId,
              user_id: testUserId,
              organization_name: 'Test Organization',
              valid_from: new Date(),
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              signed_by: 'John Doe',
              digital_signature: 'test-signature-123',
              document_path: '/path/to/document.pdf',
              status: 'ACTIVE',
              created_at: new Date(),
              revoked_at: null,
              revocation_reason: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // findById for authorization (first target)
          rows: [
            {
              id: testAuthId,
              user_id: testUserId,
              organization_name: 'Test Organization',
              valid_from: new Date(),
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              signed_by: 'John Doe',
              digital_signature: 'test-signature-123',
              document_path: '/path/to/document.pdf',
              status: 'ACTIVE',
              created_at: new Date(),
              revoked_at: null,
              revocation_reason: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // findScopesByAuthorizationId (first target)
          rows: [
            {
              id: 'scope-1',
              authorization_id: testAuthId,
              scope_type: 'EMAIL_DOMAIN',
              scope_value: 'example.com',
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          // findOperationsByAuthorizationId (first target)
          rows: [
            {
              authorization_id: testAuthId,
              operation_type: 'PHISHING_CAMPAIGN',
            },
          ],
        })
        .mockResolvedValueOnce({
          // findById for authorization (second target)
          rows: [
            {
              id: testAuthId,
              user_id: testUserId,
              organization_name: 'Test Organization',
              valid_from: new Date(),
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              signed_by: 'John Doe',
              digital_signature: 'test-signature-123',
              document_path: '/path/to/document.pdf',
              status: 'ACTIVE',
              created_at: new Date(),
              revoked_at: null,
              revocation_reason: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // findScopesByAuthorizationId (second target)
          rows: [
            {
              id: 'scope-1',
              authorization_id: testAuthId,
              scope_type: 'EMAIL_DOMAIN',
              scope_value: 'example.com',
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          // findOperationsByAuthorizationId (second target)
          rows: [
            {
              authorization_id: testAuthId,
              operation_type: 'PHISHING_CAMPAIGN',
            },
          ],
        })
        .mockResolvedValueOnce({
          // INSERT campaign
          rows: [{ id: campaignId }],
        })
        .mockResolvedValueOnce({
          // INSERT targets (batch)
          rows: [
            { id: 'target-1' },
            { id: 'target-2' },
          ],
        });

      const createdCampaignId = await phishingEngine.createCampaign(
        testUserId,
        campaignInput
      );

      expect(createdCampaignId).toBe(campaignId);

      // Step 2: Launch Campaign
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // SELECT campaign
          rows: [
            {
              id: campaignId,
              user_id: testUserId,
              authorization_id: testAuthId,
              name: campaignInput.name,
              status: 'DRAFT',
              email_template: campaignInput.emailTemplate,
              landing_page_config: campaignInput.landingPage,
              schedule: campaignInput.schedule,
              created_at: new Date(),
              launched_at: null,
              completed_at: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // findById for authorization validation
          rows: [
            {
              id: testAuthId,
              user_id: testUserId,
              organization_name: 'Test Organization',
              valid_from: new Date(),
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              signed_by: 'John Doe',
              digital_signature: 'test-signature-123',
              document_path: '/path/to/document.pdf',
              status: 'ACTIVE',
              created_at: new Date(),
              revoked_at: null,
              revocation_reason: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT targets
          rows: [
            {
              id: 'target-1',
              campaign_id: campaignId,
              email: 'employee1@example.com',
              name: 'Employee One',
              department: 'IT',
              tracking_token: 'token-1',
            },
            {
              id: 'target-2',
              campaign_id: campaignId,
              email: 'employee2@example.com',
              name: 'Employee Two',
              department: 'HR',
              tracking_token: 'token-2',
            },
          ],
        })
        .mockResolvedValueOnce({
          // UPDATE campaign status
          rows: [],
        });

      await phishingEngine.launchCampaign(campaignId);

      // Verify emails were sent
      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(2);

      // Step 3: Track Interactions
      const interactions = [
        {
          campaignId,
          trackingToken: 'token-1',
          interactionType: 'EMAIL_OPENED' as const,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        },
        {
          campaignId,
          trackingToken: 'token-1',
          interactionType: 'LINK_CLICKED' as const,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        },
        {
          campaignId,
          trackingToken: 'token-1',
          interactionType: 'CREDENTIALS_ENTERED' as const,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          capturedData: {
            username: 'employee1',
            password: 'test123',
          },
        },
      ];

      for (const interaction of interactions) {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({
            // findByTrackingToken
            rows: [
              {
                id: 'target-1',
                campaign_id: campaignId,
                email: 'employee1@example.com',
                name: 'Employee One',
                department: 'IT',
                tracking_token: 'token-1',
              },
            ],
          })
          .mockResolvedValueOnce({
            // INSERT interaction
            rows: [{ id: `interaction-${interaction.interactionType}` }],
          });

        await phishingEngine.trackInteraction(interaction);
      }

      // Step 4: Complete Campaign
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // SELECT campaign
          rows: [
            {
              id: campaignId,
              user_id: testUserId,
              authorization_id: testAuthId,
              name: campaignInput.name,
              status: 'RUNNING',
              email_template: campaignInput.emailTemplate,
              landing_page_config: campaignInput.landingPage,
              schedule: campaignInput.schedule,
              created_at: new Date(),
              launched_at: new Date(),
              completed_at: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // UPDATE campaign status
          rows: [],
        })
        .mockResolvedValueOnce({
          // SELECT targets for notification
          rows: [
            {
              id: 'target-1',
              campaign_id: campaignId,
              email: 'employee1@example.com',
              name: 'Employee One',
              department: 'IT',
              tracking_token: 'token-1',
            },
            {
              id: 'target-2',
              campaign_id: campaignId,
              email: 'employee2@example.com',
              name: 'Employee Two',
              department: 'HR',
              tracking_token: 'token-2',
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT campaign for notification
          rows: [
            {
              id: campaignId,
              user_id: testUserId,
              authorization_id: testAuthId,
              name: campaignInput.name,
              status: 'COMPLETED',
              email_template: campaignInput.emailTemplate,
              landing_page_config: campaignInput.landingPage,
              schedule: campaignInput.schedule,
              created_at: new Date(),
              launched_at: new Date(),
              completed_at: new Date(),
            },
          ],
        });

      await phishingEngine.completeCampaign(campaignId);

      // Verify notifications were sent
      expect(mockNotificationService.notifyTarget).toHaveBeenCalledTimes(2);

      // Step 5: Get Campaign Results
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // SELECT campaign
          rows: [
            {
              id: campaignId,
              user_id: testUserId,
              authorization_id: testAuthId,
              name: campaignInput.name,
              status: 'COMPLETED',
              email_template: campaignInput.emailTemplate,
              landing_page_config: campaignInput.landingPage,
              schedule: campaignInput.schedule,
              created_at: new Date(),
              launched_at: new Date(),
              completed_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          // getInteractionStats
          rows: [
            {
              total_targets: 2,
              emails_opened: 1,
              links_clicked: 1,
              credentials_entered: 1,
              files_downloaded: 0,
            },
          ],
        });

      const results = await phishingEngine.getCampaignResults(campaignId);

      expect(results.campaignId).toBe(campaignId);
      expect(results.totalTargets).toBe(2);
      expect(results.emailsOpened).toBe(1);
      expect(results.linksClicked).toBe(1);
      expect(results.credentialsEntered).toBe(1);

      // Step 6: Generate Report
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // SELECT campaign for report
          rows: [
            {
              id: campaignId,
              user_id: testUserId,
              authorization_id: testAuthId,
              name: campaignInput.name,
              status: 'COMPLETED',
              email_template: campaignInput.emailTemplate,
              landing_page_config: campaignInput.landingPage,
              schedule: campaignInput.schedule,
              created_at: new Date(),
              launched_at: new Date(),
              completed_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT targets with interaction counts
          rows: [
            {
              id: 'target-1',
              campaign_id: campaignId,
              email: 'employee1@example.com',
              name: 'Employee One',
              department: 'IT',
              tracking_token: 'token-1',
              opened: '1',
              clicked: '1',
              entered: '1',
            },
            {
              id: 'target-2',
              campaign_id: campaignId,
              email: 'employee2@example.com',
              name: 'Employee Two',
              department: 'HR',
              tracking_token: 'token-2',
              opened: '0',
              clicked: '0',
              entered: '0',
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT interactions for target-1
          rows: [
            {
              id: 'int-1',
              campaign_id: campaignId,
              target_id: 'target-1',
              interaction_type: 'EMAIL_OPENED',
              timestamp: new Date(),
              ip_address: '192.168.1.100',
              user_agent: 'Mozilla/5.0',
              geolocation: null,
              captured_data: null,
            },
            {
              id: 'int-2',
              campaign_id: campaignId,
              target_id: 'target-1',
              interaction_type: 'LINK_CLICKED',
              timestamp: new Date(),
              ip_address: '192.168.1.100',
              user_agent: 'Mozilla/5.0',
              geolocation: null,
              captured_data: null,
            },
            {
              id: 'int-3',
              campaign_id: campaignId,
              target_id: 'target-1',
              interaction_type: 'CREDENTIALS_ENTERED',
              timestamp: new Date(),
              ip_address: '192.168.1.100',
              user_agent: 'Mozilla/5.0',
              geolocation: null,
              captured_data: Buffer.from('encrypted-data'),
            },
          ],
        })
        .mockResolvedValueOnce({
          // SELECT interactions for target-2
          rows: [],
        })
        .mockResolvedValueOnce({
          // INSERT report
          rows: [{ id: 'report-123' }],
        });

      const report = await reportGenerator.generatePhishingReport(
        campaignId,
        'JSON',
        {
          title: 'Phishing Campaign Report',
          author: 'Test User',
          organization: 'Test Organization',
          confidentialityLevel: 'CONFIDENTIAL',
        }
      );

      expect(report.id).toBeDefined();
      expect(report.type).toBe('PHISHING_CAMPAIGN');
      expect(report.format).toBe('JSON');
      expect(report.content).toBeDefined();

      // Verify report content
      const reportContent = JSON.parse(report.content as string);
      expect(reportContent.campaignId).toBe(campaignId);
      expect(reportContent.totalTargets).toBe(2);
      expect(reportContent.interactions).toHaveLength(2);
    });

    it('should reject campaign creation without valid authorization', async () => {
      // Mock no authorization found
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await expect(
        phishingEngine.createCampaign(testUserId, {
          name: 'Test Campaign',
          authorizationId: 'invalid-auth-id',
          targets: [{ email: 'test@example.com' }],
          emailTemplate: {
            subject: 'Test',
            body: 'Test',
            senderName: 'Test',
            senderEmail: 'test@example.com',
            trackingEnabled: true,
            disclaimer: 'Test',
          },
          landingPage: {
            pageType: 'CREDENTIAL_HARVEST',
            captureFields: ['username', 'password'],
          },
          schedule: {
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            sendingPattern: 'IMMEDIATE',
          },
        })
      ).rejects.toThrow('Authorization required');
    });

    it('should reject campaign for target outside authorized scope', async () => {
      // Mock authorization exists but target not in scope
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // findActiveByUserAndOperation
          rows: [
            {
              id: testAuthId,
              user_id: testUserId,
              organization_name: 'Test Organization',
              valid_from: new Date(),
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              signed_by: 'John Doe',
              digital_signature: 'test-signature-123',
              document_path: '/path/to/document.pdf',
              status: 'ACTIVE',
              created_at: new Date(),
              revoked_at: null,
              revocation_reason: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // findById for authorization
          rows: [
            {
              id: testAuthId,
              user_id: testUserId,
              organization_name: 'Test Organization',
              valid_from: new Date(),
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              signed_by: 'John Doe',
              digital_signature: 'test-signature-123',
              document_path: '/path/to/document.pdf',
              status: 'ACTIVE',
              created_at: new Date(),
              revoked_at: null,
              revocation_reason: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // findScopesByAuthorizationId - different domain
          rows: [
            {
              id: 'scope-1',
              authorization_id: testAuthId,
              scope_type: 'EMAIL_DOMAIN',
              scope_value: 'authorized-domain.com',
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          // findOperationsByAuthorizationId
          rows: [
            {
              authorization_id: testAuthId,
              operation_type: 'PHISHING_CAMPAIGN',
            },
          ],
        });

      await expect(
        phishingEngine.createCampaign(testUserId, {
          name: 'Test Campaign',
          authorizationId: testAuthId,
          targets: [{ email: 'test@unauthorized-domain.com' }],
          emailTemplate: {
            subject: 'Test',
            body: 'Test',
            senderName: 'Test',
            senderEmail: 'test@example.com',
            trackingEnabled: true,
            disclaimer: 'Test',
          },
          landingPage: {
            pageType: 'CREDENTIAL_HARVEST',
            captureFields: ['username', 'password'],
          },
          schedule: {
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            sendingPattern: 'IMMEDIATE',
          },
        })
      ).rejects.toThrow('outside authorized scope');
    });

    it('should add mandatory disclaimer to all emails', async () => {
      const campaignInput = {
        name: 'Test Campaign',
        authorizationId: testAuthId,
        targets: [{ email: 'test@example.com' }],
        emailTemplate: {
          subject: 'Test',
          body: 'Test email body',
          senderName: 'Test',
          senderEmail: 'test@example.com',
          trackingEnabled: true,
          disclaimer: '', // Empty disclaimer
        },
        landingPage: {
          pageType: 'CREDENTIAL_HARVEST' as const,
          captureFields: ['username', 'password'],
        },
        schedule: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          sendingPattern: 'IMMEDIATE' as const,
        },
      };

      const campaignId = 'campaign-123';

      // Mock authorization and campaign creation
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          // findActiveByUserAndOperation
          rows: [
            {
              id: testAuthId,
              user_id: testUserId,
              organization_name: 'Test Organization',
              valid_from: new Date(),
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              signed_by: 'John Doe',
              digital_signature: 'test-signature-123',
              document_path: '/path/to/document.pdf',
              status: 'ACTIVE',
              created_at: new Date(),
              revoked_at: null,
              revocation_reason: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // findById for authorization
          rows: [
            {
              id: testAuthId,
              user_id: testUserId,
              organization_name: 'Test Organization',
              valid_from: new Date(),
              valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              signed_by: 'John Doe',
              digital_signature: 'test-signature-123',
              document_path: '/path/to/document.pdf',
              status: 'ACTIVE',
              created_at: new Date(),
              revoked_at: null,
              revocation_reason: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          // findScopesByAuthorizationId
          rows: [
            {
              id: 'scope-1',
              authorization_id: testAuthId,
              scope_type: 'EMAIL_DOMAIN',
              scope_value: 'example.com',
              created_at: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          // findOperationsByAuthorizationId
          rows: [
            {
              authorization_id: testAuthId,
              operation_type: 'PHISHING_CAMPAIGN',
            },
          ],
        })
        .mockResolvedValueOnce({
          // INSERT campaign - capture the data
          rows: [{ id: campaignId }],
        })
        .mockResolvedValueOnce({
          // INSERT targets
          rows: [{ id: 'target-1' }],
        });

      await phishingEngine.createCampaign(testUserId, campaignInput);

      // Verify that INSERT was called with disclaimer added
      const insertCall = (mockPool.query as jest.Mock).mock.calls.find(
        call => call[0].includes('INSERT INTO phishing_campaigns')
      );
      expect(insertCall).toBeDefined();
      
      // The email template should have disclaimer added
      const emailTemplate = insertCall[1][3]; // email_template parameter
      expect(emailTemplate.body).toContain('security awareness training');
    });
  });
});
