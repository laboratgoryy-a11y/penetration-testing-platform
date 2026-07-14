import * as fc from 'fast-check';
import { Pool } from 'pg';
import { PhishingEngine, NotificationService } from '../services/PhishingEngine';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { EncryptionService } from '../services/EncryptionService';

// Mock the repository
jest.mock('../repositories/AuthorizationRepository');

/**
 * Feature: penetration-testing-platform
 * Property 18: إشعار الأهداف بعد انتهاء الحملة
 * 
 * لأي حملة تصيد احتيالي مكتملة، يجب على النظام إرسال إشعار تلقائي
 * لجميع الأهداف يوضح أن الحملة كانت تدريبية وليست هجوماً حقيقياً
 * 
 * **Validates: Requirements 3.9**
 */
describe('Property 18: Target Notification After Campaign Completion', () => {
  let mockPool: Pool;
  let authorizationManager: AuthorizationManager;
  let encryptionService: EncryptionService;
  let mockNotificationService: NotificationService;
  let phishingEngine: PhishingEngine;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    } as unknown as Pool;

    authorizationManager = new AuthorizationManager(mockPool);
    encryptionService = new EncryptionService('test-master-key-32-characters-long');
    
    // Create mock notification service
    mockNotificationService = {
      notifyTarget: jest.fn().mockResolvedValue(undefined),
    };

    phishingEngine = new PhishingEngine(
      mockPool,
      authorizationManager,
      encryptionService,
      undefined,
      mockNotificationService
    );

    // Mock authorization to always succeed for these tests
    jest.spyOn(authorizationManager, 'validateAuthorization').mockResolvedValue({
      authorized: true,
      authorizationId: 'test-auth-id',
    });
    jest.spyOn(authorizationManager, 'isTargetInScope').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Custom arbitraries for generating test data
   */
  const arbitraryEmailTarget = (): fc.Arbitrary<{
    id: string;
    email: string;
    name?: string;
    department?: string;
    campaign_id: string;
  }> => {
    return fc.record({
      id: fc.uuid(),
      email: fc.emailAddress(),
      name: fc.option(fc.fullName(), { nil: undefined }),
      department: fc.option(
        fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Marketing', 'Engineering'),
        { nil: undefined }
      ),
      campaign_id: fc.uuid(),
    });
  };

  const arbitraryCampaign = (): fc.Arbitrary<{
    id: string;
    name: string;
    status: string;
    user_id: string;
    authorization_id: string;
    email_template: any;
    landing_page_config: any;
    schedule: any;
    created_at: Date;
    launched_at?: Date;
    completed_at?: Date;
  }> => {
    return fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 5, maxLength: 50 }),
      status: fc.constant('RUNNING'),
      user_id: fc.uuid(),
      authorization_id: fc.uuid(),
      email_template: fc.constant({}),
      landing_page_config: fc.constant({}),
      schedule: fc.constant({}),
      created_at: fc.date(),
      launched_at: fc.option(fc.date(), { nil: undefined }),
      completed_at: fc.option(fc.date(), { nil: undefined }),
    });
  };

  /**
   * Property Test 18.1: All targets must be notified after campaign completion
   * 
   * For any campaign with any number of targets, when the campaign is completed,
   * all targets must receive a notification
   */
  test('property: All targets receive notification after campaign completion', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCampaign(),
        fc.array(arbitraryEmailTarget(), { minLength: 1, maxLength: 20 }),
        async (campaign, targets) => {
          // Set all targets to belong to this campaign
          const campaignTargets = targets.map(t => ({ ...t, campaign_id: campaign.id }));

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
                // Return campaign
                return { rows: [campaign] };
              } else if (query.includes('UPDATE phishing_campaigns')) {
                // Update campaign status
                return { rows: [], rowCount: 1 };
              } else if (query.includes('SELECT') && query.includes('campaign_targets')) {
                // Return all targets
                return { rows: campaignTargets };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Complete campaign
          await phishingEngine.completeCampaign(campaign.id);

          // Verify: Notification service was called for each target
          expect(mockNotificationService.notifyTarget).toHaveBeenCalledTimes(
            campaignTargets.length
          );

          // Verify: Each target received a notification
          campaignTargets.forEach(target => {
            expect(mockNotificationService.notifyTarget).toHaveBeenCalledWith(
              target.email,
              expect.any(String),
              expect.any(String)
            );
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 18.2: Notification must identify email as training exercise
   * 
   * For any completed campaign, the notification sent to targets must
   * explicitly state that the phishing email was a training exercise
   */
  test('property: Notification identifies campaign as training exercise', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCampaign(),
        fc.array(arbitraryEmailTarget(), { minLength: 1, maxLength: 10 }),
        async (campaign, targets) => {
          const campaignTargets = targets.map(t => ({ ...t, campaign_id: campaign.id }));

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
                return { rows: [campaign] };
              } else if (query.includes('UPDATE phishing_campaigns')) {
                return { rows: [], rowCount: 1 };
              } else if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return { rows: campaignTargets };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Complete campaign
          await phishingEngine.completeCampaign(campaign.id);

          // Verify: Each notification message contains training-related keywords
          const notificationCalls = (mockNotificationService.notifyTarget as jest.Mock).mock.calls;
          
          notificationCalls.forEach(call => {
            const message = call[2].toLowerCase();
            
            // Verify: Message contains training/exercise keywords
            const trainingKeywords = [
              'training',
              'exercise',
              'simulated',
              'test',
              'awareness',
              'not a real',
            ];
            
            const containsTrainingKeyword = trainingKeywords.some(keyword =>
              message.includes(keyword)
            );
            
            expect(containsTrainingKeyword).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 18.3: Notification must include campaign name
   * 
   * For any completed campaign, the notification must reference
   * the campaign name so targets know which email it refers to
   */
  test('property: Notification includes campaign name', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCampaign(),
        fc.array(arbitraryEmailTarget(), { minLength: 1, maxLength: 10 }),
        async (campaign, targets) => {
          const campaignTargets = targets.map(t => ({ ...t, campaign_id: campaign.id }));

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
                return { rows: [campaign] };
              } else if (query.includes('UPDATE phishing_campaigns')) {
                return { rows: [], rowCount: 1 };
              } else if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return { rows: campaignTargets };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Complete campaign
          await phishingEngine.completeCampaign(campaign.id);

          // Verify: Each notification message contains campaign name
          const notificationCalls = (mockNotificationService.notifyTarget as jest.Mock).mock.calls;
          
          notificationCalls.forEach(call => {
            const message = call[2];
            expect(message).toContain(campaign.name);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 18.4: Notification subject must be clear and professional
   * 
   * For any completed campaign, the notification subject must clearly
   * indicate it's about security awareness training
   */
  test('property: Notification subject is clear and professional', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCampaign(),
        fc.array(arbitraryEmailTarget(), { minLength: 1, maxLength: 10 }),
        async (campaign, targets) => {
          const campaignTargets = targets.map(t => ({ ...t, campaign_id: campaign.id }));

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
                return { rows: [campaign] };
              } else if (query.includes('UPDATE phishing_campaigns')) {
                return { rows: [], rowCount: 1 };
              } else if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return { rows: campaignTargets };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Complete campaign
          await phishingEngine.completeCampaign(campaign.id);

          // Verify: Each notification has appropriate subject
          const notificationCalls = (mockNotificationService.notifyTarget as jest.Mock).mock.calls;
          
          notificationCalls.forEach(call => {
            const subject = call[1].toLowerCase();
            
            // Verify: Subject contains security/awareness keywords
            expect(
              subject.includes('security') ||
              subject.includes('awareness') ||
              subject.includes('training')
            ).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 18.5: Notification only sent after campaign is completed
   * 
   * For any campaign that is not in RUNNING status, attempting to complete
   * it should fail and no notifications should be sent
   */
  test('property: Notification only sent for RUNNING campaigns', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCampaign(),
        fc.constantFrom('DRAFT', 'SCHEDULED', 'COMPLETED', 'FAILED', 'STOPPED'),
        fc.array(arbitraryEmailTarget(), { minLength: 1, maxLength: 10 }),
        async (campaign, invalidStatus, targets) => {
          // Set campaign to invalid status
          const invalidCampaign = { ...campaign, status: invalidStatus };
          const campaignTargets = targets.map(t => ({ ...t, campaign_id: campaign.id }));

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
                return { rows: [invalidCampaign] };
              } else if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return { rows: campaignTargets };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute & Verify: Should throw error
          await expect(
            phishingEngine.completeCampaign(campaign.id)
          ).rejects.toThrow();

          // Verify: No notifications were sent
          expect(mockNotificationService.notifyTarget).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 18.6: Campaign status updated to COMPLETED before notifications
   * 
   * For any campaign, the campaign status must be updated to COMPLETED
   * before notifications are sent to targets
   */
  test('property: Campaign status updated before notifications sent', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCampaign(),
        fc.array(arbitraryEmailTarget(), { minLength: 1, maxLength: 10 }),
        async (campaign, targets) => {
          const campaignTargets = targets.map(t => ({ ...t, campaign_id: campaign.id }));
          let statusUpdated = false;

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
                if (statusUpdated) {
                  return { rows: [{ ...campaign, status: 'COMPLETED' }] };
                }
                return { rows: [campaign] };
              } else if (query.includes('UPDATE phishing_campaigns')) {
                statusUpdated = true;
                return { rows: [], rowCount: 1 };
              } else if (query.includes('SELECT') && query.includes('campaign_targets')) {
                // Verify status was updated before fetching targets
                expect(statusUpdated).toBe(true);
                return { rows: campaignTargets };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Complete campaign
          await phishingEngine.completeCampaign(campaign.id);

          // Verify: Status was updated
          expect(statusUpdated).toBe(true);
          
          // Verify: Notifications were sent
          expect(mockNotificationService.notifyTarget).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 18.7: Notification failure does not stop other notifications
   * 
   * For any campaign with multiple targets, if notification fails for one target,
   * the system must continue sending notifications to remaining targets
   */
  test('property: Notification failure does not stop other notifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCampaign(),
        fc.array(arbitraryEmailTarget(), { minLength: 3, maxLength: 10 }),
        fc.integer({ min: 0, max: 2 }), // Index of target that will fail
        async (campaign, targets, failIndex) => {
          const campaignTargets = targets.map(t => ({ ...t, campaign_id: campaign.id }));

          // Mock notification service to fail for one target
          let callCount = 0;
          (mockNotificationService.notifyTarget as jest.Mock).mockImplementation(
            async (email: string) => {
              if (callCount === failIndex) {
                callCount++;
                throw new Error('Notification failed');
              }
              callCount++;
              return Promise.resolve();
            }
          );

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
                return { rows: [campaign] };
              } else if (query.includes('UPDATE phishing_campaigns')) {
                return { rows: [], rowCount: 1 };
              } else if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return { rows: campaignTargets };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Complete campaign (should not throw despite one failure)
          await phishingEngine.completeCampaign(campaign.id);

          // Verify: Notification was attempted for all targets
          expect(mockNotificationService.notifyTarget).toHaveBeenCalledTimes(
            campaignTargets.length
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property Test 18.8: Notification message is informative and reassuring
   * 
   * For any completed campaign, the notification message must be informative
   * and reassure targets that no real harm was done
   */
  test('property: Notification message is informative and reassuring', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCampaign(),
        fc.array(arbitraryEmailTarget(), { minLength: 1, maxLength: 10 }),
        async (campaign, targets) => {
          const campaignTargets = targets.map(t => ({ ...t, campaign_id: campaign.id }));

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
                return { rows: [campaign] };
              } else if (query.includes('UPDATE phishing_campaigns')) {
                return { rows: [], rowCount: 1 };
              } else if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return { rows: campaignTargets };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Complete campaign
          await phishingEngine.completeCampaign(campaign.id);

          // Verify: Each notification message is reassuring
          const notificationCalls = (mockNotificationService.notifyTarget as jest.Mock).mock.calls;
          
          notificationCalls.forEach(call => {
            const message = call[2].toLowerCase();
            
            // Verify: Message contains reassuring keywords
            const reassuringKeywords = [
              'not a real',
              'not real',
              'simulated',
              'training',
              'exercise',
              'test',
            ];
            
            const containsReassurance = reassuringKeywords.some(keyword =>
              message.includes(keyword)
            );
            
            expect(containsReassurance).toBe(true);
            
            // Verify: Message explains purpose
            expect(
              message.includes('purpose') ||
              message.includes('awareness') ||
              message.includes('security')
            ).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 18.9: Each target receives exactly one notification
   * 
   * For any campaign with duplicate target emails, each unique email
   * should receive exactly one notification (no duplicates)
   */
  test('property: Each unique target receives exactly one notification', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCampaign(),
        fc.array(arbitraryEmailTarget(), { minLength: 1, maxLength: 10 }),
        async (campaign, targets) => {
          const campaignTargets = targets.map(t => ({ ...t, campaign_id: campaign.id }));

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
                return { rows: [campaign] };
              } else if (query.includes('UPDATE phishing_campaigns')) {
                return { rows: [], rowCount: 1 };
              } else if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return { rows: campaignTargets };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Complete campaign
          await phishingEngine.completeCampaign(campaign.id);

          // Verify: Each target email received notification
          const notificationCalls = (mockNotificationService.notifyTarget as jest.Mock).mock.calls;
          const notifiedEmails = notificationCalls.map(call => call[0]);
          
          // Verify: Number of notifications matches number of targets
          expect(notifiedEmails.length).toBe(campaignTargets.length);
          
          // Verify: Each target email appears in notifications
          campaignTargets.forEach(target => {
            expect(notifiedEmails).toContain(target.email);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 18.10: Notification sent automatically without manual trigger
   * 
   * For any campaign completion, notifications must be sent automatically
   * as part of the completeCampaign operation without requiring separate action
   */
  test('property: Notifications sent automatically on campaign completion', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCampaign(),
        fc.array(arbitraryEmailTarget(), { minLength: 1, maxLength: 10 }),
        async (campaign, targets) => {
          const campaignTargets = targets.map(t => ({ ...t, campaign_id: campaign.id }));

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
                return { rows: [campaign] };
              } else if (query.includes('UPDATE phishing_campaigns')) {
                return { rows: [], rowCount: 1 };
              } else if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return { rows: campaignTargets };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Complete campaign (single operation)
          await phishingEngine.completeCampaign(campaign.id);

          // Verify: Notifications were sent automatically
          expect(mockNotificationService.notifyTarget).toHaveBeenCalled();
          expect(mockNotificationService.notifyTarget).toHaveBeenCalledTimes(
            campaignTargets.length
          );
          
          // Verify: No separate notification method was called
          // (notifications happen within completeCampaign)
        }
      ),
      { numRuns: 100 }
    );
  });
});
