import * as fc from 'fast-check';
import { Pool } from 'pg';
import { PhishingEngine } from '../services/PhishingEngine';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { EncryptionService } from '../services/EncryptionService';
import { EmailTemplate } from '../models';

// Mock the repository
jest.mock('../repositories/AuthorizationRepository');

/**
 * Feature: penetration-testing-platform
 * Property 15: إخلاء المسؤولية الإلزامي في رسائل التصيد
 * 
 * لأي رسالة تصيد احتيالي، يجب أن تحتوي على إخلاء مسؤولية واضح
 * في التذييل يوضح أنها حملة تدريبية
 * 
 * **Validates: Requirements 3.5**
 */
describe('Property 15: Mandatory Disclaimer in Phishing Messages', () => {
  let mockPool: Pool;
  let authorizationManager: AuthorizationManager;
  let encryptionService: EncryptionService;
  let phishingEngine: PhishingEngine;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
    } as unknown as Pool;

    authorizationManager = new AuthorizationManager(mockPool);
    encryptionService = new EncryptionService('test-master-key-32-characters-long');
    phishingEngine = new PhishingEngine(
      mockPool,
      authorizationManager,
      encryptionService
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
  const arbitraryEmailTemplate = (): fc.Arbitrary<EmailTemplate> => {
    return fc.record({
      subject: fc.string({ minLength: 5, maxLength: 100 }),
      body: fc.lorem({ maxCount: 5 }),
      senderName: fc.fullName(),
      senderEmail: fc.emailAddress(),
      trackingEnabled: fc.boolean(),
      disclaimer: fc.oneof(
        fc.constant(''), // Empty disclaimer
        fc.lorem({ maxCount: 2 }) // Custom disclaimer
      ),
    });
  };

  const arbitraryEmailTarget = (): fc.Arbitrary<{ email: string; name?: string; department?: string }> => {
    return fc.record({
      email: fc.emailAddress(),
      name: fc.option(fc.fullName(), { nil: undefined }),
      department: fc.option(
        fc.constantFrom('IT', 'HR', 'Finance', 'Sales', 'Marketing'),
        { nil: undefined }
      ),
    });
  };

  const arbitraryCampaignInput = (): fc.Arbitrary<any> => {
    return fc.record({
      name: fc.string({ minLength: 5, maxLength: 50 }),
      authorizationId: fc.uuid(),
      targets: fc.array(arbitraryEmailTarget(), { minLength: 1, maxLength: 10 }),
      emailTemplate: arbitraryEmailTemplate(),
      landingPage: fc.record({
        pageType: fc.constantFrom('CREDENTIAL_HARVEST', 'DOWNLOAD_PROMPT', 'SURVEY'),
        captureFields: fc.array(
          fc.constantFrom('username', 'password', 'email', 'phone'),
          { minLength: 1, maxLength: 4 }
        ),
      }),
      schedule: fc.record({
        startDate: fc.date({ min: new Date() }),
        endDate: fc.date({ min: new Date(Date.now() + 86400000) }),
        sendingPattern: fc.constantFrom('IMMEDIATE', 'STAGGERED', 'SCHEDULED'),
      }),
    });
  };

  /**
   * Property Test 15.1: All phishing emails must contain a disclaimer
   * 
   * For any campaign with any email template (with or without a disclaimer),
   * the stored email template must always contain a disclaimer in the body
   */
  test('property: All phishing emails contain disclaimer', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryCampaignInput(),
        async (userId, campaignInput) => {
          // Mock database insert to capture the stored data
          let storedEmailTemplate: EmailTemplate | null = null;
          
          (mockPool.query as jest.Mock).mockImplementation(async (query: string, params: any[]) => {
            if (query.includes('INSERT INTO phishing_campaigns')) {
              // Capture the email template that's being stored
              storedEmailTemplate = JSON.parse(params[4]);
              return { rows: [{ id: 'campaign-123' }] };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute: Create campaign
          await phishingEngine.createCampaign(userId, campaignInput);

          // Verify: Email template must have been stored
          expect(storedEmailTemplate).not.toBeNull();
          
          if (storedEmailTemplate) {
            // Verify: Body must contain disclaimer text
            expect(storedEmailTemplate.body).toBeDefined();
            expect(storedEmailTemplate.body.length).toBeGreaterThan(0);
            
            // Verify: Body contains security awareness training mention
            const bodyLower = storedEmailTemplate.body.toLowerCase();
            expect(
              bodyLower.includes('security awareness') ||
              bodyLower.includes('training') ||
              bodyLower.includes('exercise')
            ).toBe(true);
            
            // Verify: Disclaimer field is populated
            expect(storedEmailTemplate.disclaimer).toBeDefined();
            expect(storedEmailTemplate.disclaimer.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 15.2: Disclaimer is appended to email body
   * 
   * For any email template, the disclaimer must be appended to the body,
   * ensuring the original content is preserved and the disclaimer is added
   */
  test('property: Disclaimer is appended to original email body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryCampaignInput(),
        async (userId, campaignInput) => {
          const originalBody = campaignInput.emailTemplate.body;
          let storedEmailTemplate: EmailTemplate | null = null;
          
          (mockPool.query as jest.Mock).mockImplementation(async (query: string, params: any[]) => {
            if (query.includes('INSERT INTO phishing_campaigns')) {
              storedEmailTemplate = JSON.parse(params[4]);
              return { rows: [{ id: 'campaign-123' }] };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute: Create campaign
          await phishingEngine.createCampaign(userId, campaignInput);

          // Verify: Stored template exists
          expect(storedEmailTemplate).not.toBeNull();
          
          if (storedEmailTemplate) {
            // Verify: Original body content is preserved
            expect(storedEmailTemplate.body).toContain(originalBody);
            
            // Verify: Body is longer than original (disclaimer added)
            expect(storedEmailTemplate.body.length).toBeGreaterThanOrEqual(originalBody.length);
            
            // Verify: Disclaimer appears after original content
            const originalBodyIndex = storedEmailTemplate.body.indexOf(originalBody);
            const disclaimerIndex = storedEmailTemplate.body.indexOf(storedEmailTemplate.disclaimer);
            expect(disclaimerIndex).toBeGreaterThanOrEqual(originalBodyIndex + originalBody.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 15.3: Custom disclaimer is preserved if provided
   * 
   * For any email template with a non-empty disclaimer,
   * the custom disclaimer must be preserved and used instead of the default
   */
  test('property: Custom disclaimer is preserved when provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryCampaignInput(),
        fc.lorem({ maxCount: 3 }), // Custom disclaimer
        async (userId, campaignInput, customDisclaimer) => {
          // Set custom disclaimer
          campaignInput.emailTemplate.disclaimer = customDisclaimer;
          
          let storedEmailTemplate: EmailTemplate | null = null;
          
          (mockPool.query as jest.Mock).mockImplementation(async (query: string, params: any[]) => {
            if (query.includes('INSERT INTO phishing_campaigns')) {
              storedEmailTemplate = JSON.parse(params[4]);
              return { rows: [{ id: 'campaign-123' }] };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute: Create campaign with custom disclaimer
          await phishingEngine.createCampaign(userId, campaignInput);

          // Verify: Stored template exists
          expect(storedEmailTemplate).not.toBeNull();
          
          if (storedEmailTemplate) {
            // Verify: Custom disclaimer is in the body
            expect(storedEmailTemplate.body).toContain(customDisclaimer);
            
            // Verify: Disclaimer field contains custom text
            expect(storedEmailTemplate.disclaimer).toBe(customDisclaimer);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 15.4: Default disclaimer is added when none provided
   * 
   * For any email template with an empty or missing disclaimer,
   * a default disclaimer must be automatically added
   */
  test('property: Default disclaimer added when none provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryCampaignInput(),
        async (userId, campaignInput) => {
          // Ensure no disclaimer is provided
          campaignInput.emailTemplate.disclaimer = '';
          
          let storedEmailTemplate: EmailTemplate | null = null;
          
          (mockPool.query as jest.Mock).mockImplementation(async (query: string, params: any[]) => {
            if (query.includes('INSERT INTO phishing_campaigns')) {
              storedEmailTemplate = JSON.parse(params[4]);
              return { rows: [{ id: 'campaign-123' }] };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute: Create campaign without disclaimer
          await phishingEngine.createCampaign(userId, campaignInput);

          // Verify: Stored template exists
          expect(storedEmailTemplate).not.toBeNull();
          
          if (storedEmailTemplate) {
            // Verify: A disclaimer was added
            expect(storedEmailTemplate.disclaimer).toBeDefined();
            expect(storedEmailTemplate.disclaimer.length).toBeGreaterThan(0);
            
            // Verify: Default disclaimer contains key phrases
            const disclaimerLower = storedEmailTemplate.disclaimer.toLowerCase();
            expect(
              disclaimerLower.includes('security awareness') ||
              disclaimerLower.includes('training') ||
              disclaimerLower.includes('exercise')
            ).toBe(true);
            
            // Verify: Body contains the disclaimer
            expect(storedEmailTemplate.body).toContain(storedEmailTemplate.disclaimer);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 15.5: Disclaimer is clearly separated from email body
   * 
   * For any email template, the disclaimer must be clearly separated
   * from the main body content (e.g., with line breaks or separators)
   */
  test('property: Disclaimer is clearly separated from body', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryCampaignInput(),
        async (userId, campaignInput) => {
          let storedEmailTemplate: EmailTemplate | null = null;
          
          (mockPool.query as jest.Mock).mockImplementation(async (query: string, params: any[]) => {
            if (query.includes('INSERT INTO phishing_campaigns')) {
              storedEmailTemplate = JSON.parse(params[4]);
              return { rows: [{ id: 'campaign-123' }] };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute: Create campaign
          await phishingEngine.createCampaign(userId, campaignInput);

          // Verify: Stored template exists
          expect(storedEmailTemplate).not.toBeNull();
          
          if (storedEmailTemplate) {
            const { body, disclaimer } = storedEmailTemplate;
            
            // Find where disclaimer appears in body
            const disclaimerIndex = body.indexOf(disclaimer);
            expect(disclaimerIndex).toBeGreaterThan(-1);
            
            // Verify: There's separation before the disclaimer
            // (newlines, dashes, or other separators)
            const textBeforeDisclaimer = body.substring(0, disclaimerIndex);
            expect(
              textBeforeDisclaimer.endsWith('\n') ||
              textBeforeDisclaimer.endsWith('\n\n') ||
              textBeforeDisclaimer.endsWith('---') ||
              textBeforeDisclaimer.endsWith('___')
            ).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 15.6: Disclaimer cannot be removed or bypassed
   * 
   * For any campaign creation attempt, there is no way to create
   * a campaign without a disclaimer in the email template
   */
  test('property: Disclaimer cannot be bypassed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryCampaignInput(),
        async (userId, campaignInput) => {
          // Try various ways to bypass disclaimer
          const bypassAttempts = [
            { ...campaignInput, emailTemplate: { ...campaignInput.emailTemplate, disclaimer: '' } },
            { ...campaignInput, emailTemplate: { ...campaignInput.emailTemplate, disclaimer: null as any } },
            { ...campaignInput, emailTemplate: { ...campaignInput.emailTemplate, disclaimer: undefined as any } },
          ];

          for (const attempt of bypassAttempts) {
            let storedEmailTemplate: EmailTemplate | null = null;
            
            (mockPool.query as jest.Mock).mockImplementation(async (query: string, params: any[]) => {
              if (query.includes('INSERT INTO phishing_campaigns')) {
                storedEmailTemplate = JSON.parse(params[4]);
                return { rows: [{ id: 'campaign-123' }] };
              }
              return { rows: [], rowCount: 0 };
            });

            // Execute: Try to create campaign
            await phishingEngine.createCampaign(userId, attempt);

            // Verify: Disclaimer was still added
            expect(storedEmailTemplate).not.toBeNull();
            if (storedEmailTemplate) {
              expect(storedEmailTemplate.disclaimer).toBeDefined();
              expect(storedEmailTemplate.disclaimer.length).toBeGreaterThan(0);
              expect(storedEmailTemplate.body).toContain(storedEmailTemplate.disclaimer);
            }
          }
        }
      ),
      { numRuns: 50 } // Fewer runs since we test multiple attempts per run
    );
  });

  /**
   * Property Test 15.7: Disclaimer mentions training/exercise nature
   * 
   * For any phishing email, the disclaimer must explicitly mention
   * that this is a training exercise or security awareness test
   */
  test('property: Disclaimer identifies email as training exercise', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // userId
        arbitraryCampaignInput(),
        async (userId, campaignInput) => {
          let storedEmailTemplate: EmailTemplate | null = null;
          
          (mockPool.query as jest.Mock).mockImplementation(async (query: string, params: any[]) => {
            if (query.includes('INSERT INTO phishing_campaigns')) {
              storedEmailTemplate = JSON.parse(params[4]);
              return { rows: [{ id: 'campaign-123' }] };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute: Create campaign
          await phishingEngine.createCampaign(userId, campaignInput);

          // Verify: Stored template exists
          expect(storedEmailTemplate).not.toBeNull();
          
          if (storedEmailTemplate) {
            const disclaimerLower = storedEmailTemplate.disclaimer.toLowerCase();
            
            // Verify: Disclaimer contains training-related keywords
            const trainingKeywords = [
              'training',
              'exercise',
              'test',
              'awareness',
              'simulation',
              'simulated',
            ];
            
            const containsTrainingKeyword = trainingKeywords.some(keyword =>
              disclaimerLower.includes(keyword)
            );
            
            expect(containsTrainingKeyword).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
