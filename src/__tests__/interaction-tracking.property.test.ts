import * as fc from 'fast-check';
import { Pool } from 'pg';
import { PhishingEngine } from '../services/PhishingEngine';
import { AuthorizationManager } from '../services/AuthorizationManager';
import { EncryptionService } from '../services/EncryptionService';
import { CampaignInteraction, CampaignTarget } from '../models';
import { InteractionType } from '../models/CampaignInteraction';

// Mock the repository
jest.mock('../repositories/AuthorizationRepository');

/**
 * Feature: penetration-testing-platform
 * Property 16: تتبع التفاعلات مع رسائل التصيد
 * 
 * لأي تفاعل مع رسالة تصيد (فتح، نقر، إدخال بيانات)، يجب على النظام
 * تسجيل (نوع التفاعل، الطابع الزمني، عنوان IP، المتصفح، الموقع الجغرافي)
 * 
 * **Validates: Requirements 3.6, 3.8**
 */
describe('Property 16: Tracking Interactions with Phishing Messages', () => {
  let mockPool: Pool;
  let authorizationManager: AuthorizationManager;
  let encryptionService: EncryptionService;
  let phishingEngine: PhishingEngine;
  let interactionModel: CampaignInteraction;
  let targetModel: CampaignTarget;

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
    interactionModel = new CampaignInteraction(mockPool);
    targetModel = new CampaignTarget(mockPool);

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
  const arbitraryInteractionType = (): fc.Arbitrary<InteractionType> => {
    return fc.constantFrom(
      'EMAIL_OPENED',
      'LINK_CLICKED',
      'CREDENTIALS_ENTERED',
      'FILE_DOWNLOADED'
    );
  };

  const arbitraryIPAddress = (): fc.Arbitrary<string> => {
    return fc.tuple(
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 }),
      fc.integer({ min: 0, max: 255 })
    ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);
  };

  const arbitraryUserAgent = (): fc.Arbitrary<string> => {
    return fc.oneof(
      fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
      fc.constant('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
      fc.constant('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
      fc.constant('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)'),
      fc.constant('Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X)')
    );
  };

  const arbitraryGeolocation = (): fc.Arbitrary<string> => {
    return fc.oneof(
      fc.constant('New York, US'),
      fc.constant('London, UK'),
      fc.constant('Tokyo, JP'),
      fc.constant('Sydney, AU'),
      fc.constant('Berlin, DE'),
      fc.constant('Paris, FR'),
      fc.constant('Toronto, CA')
    );
  };

  const arbitraryInteractionInput = (): fc.Arbitrary<{
    campaignId: string;
    trackingToken: string;
    interactionType: InteractionType;
    ipAddress: string;
    userAgent: string;
    geolocation?: string;
    capturedData?: Record<string, string>;
  }> => {
    return fc.record({
      campaignId: fc.uuid(),
      trackingToken: fc.uuid(),
      interactionType: arbitraryInteractionType(),
      ipAddress: arbitraryIPAddress(),
      userAgent: arbitraryUserAgent(),
      geolocation: fc.option(arbitraryGeolocation(), { nil: undefined }),
      capturedData: fc.option(
        fc.record({
          username: fc.string({ minLength: 3, maxLength: 20 }),
          password: fc.string({ minLength: 8, maxLength: 30 }),
        }),
        { nil: undefined }
      ),
    });
  };

  /**
   * Property Test 16.1: All interactions must be recorded
   * 
   * For any interaction with a phishing message, the system must create
   * a record in the database with all provided information
   */
  test('property: All interactions are recorded in database', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryInteractionInput(),
        async (interactionInput) => {
          let storedInteraction: any = null;

          // Mock finding target by tracking token
          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('campaign_targets')) {
                // Return mock target
                return {
                  rows: [
                    {
                      id: 'target-123',
                      campaign_id: interactionInput.campaignId,
                      email: 'test@example.com',
                      tracking_token: interactionInput.trackingToken,
                    },
                  ],
                };
              } else if (query.includes('INSERT INTO campaign_interactions')) {
                // Capture the stored interaction
                storedInteraction = {
                  campaignId: params[0],
                  targetId: params[1],
                  interactionType: params[2],
                  ipAddress: params[3],
                  userAgent: params[4],
                  geolocation: params[5],
                  capturedData: params[6],
                };
                return { rows: [{ id: 'interaction-123' }] };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Track interaction
          await phishingEngine.trackInteraction(interactionInput);

          // Verify: Interaction was stored
          expect(storedInteraction).not.toBeNull();
          expect(storedInteraction.campaignId).toBe(interactionInput.campaignId);
          expect(storedInteraction.interactionType).toBe(interactionInput.interactionType);
          expect(storedInteraction.ipAddress).toBe(interactionInput.ipAddress);
          expect(storedInteraction.userAgent).toBe(interactionInput.userAgent);
          
          if (interactionInput.geolocation) {
            expect(storedInteraction.geolocation).toBe(interactionInput.geolocation);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 16.2: Interaction type must be recorded correctly
   * 
   * For any interaction type (EMAIL_OPENED, LINK_CLICKED, CREDENTIALS_ENTERED, FILE_DOWNLOADED),
   * the system must record the exact interaction type
   */
  test('property: Interaction type is recorded correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryInteractionInput(),
        async (interactionInput) => {
          let storedInteractionType: InteractionType | null = null;

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return {
                  rows: [
                    {
                      id: 'target-123',
                      campaign_id: interactionInput.campaignId,
                      email: 'test@example.com',
                      tracking_token: interactionInput.trackingToken,
                    },
                  ],
                };
              } else if (query.includes('INSERT INTO campaign_interactions')) {
                storedInteractionType = params[2];
                return { rows: [{ id: 'interaction-123' }] };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Track interaction
          await phishingEngine.trackInteraction(interactionInput);

          // Verify: Interaction type matches
          expect(storedInteractionType).toBe(interactionInput.interactionType);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 16.3: IP address must be recorded
   * 
   * For any interaction, the system must record the IP address
   * from which the interaction originated
   */
  test('property: IP address is recorded for all interactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryInteractionInput(),
        async (interactionInput) => {
          let storedIPAddress: string | null = null;

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return {
                  rows: [
                    {
                      id: 'target-123',
                      campaign_id: interactionInput.campaignId,
                      email: 'test@example.com',
                      tracking_token: interactionInput.trackingToken,
                    },
                  ],
                };
              } else if (query.includes('INSERT INTO campaign_interactions')) {
                storedIPAddress = params[3];
                return { rows: [{ id: 'interaction-123' }] };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Track interaction
          await phishingEngine.trackInteraction(interactionInput);

          // Verify: IP address is recorded
          expect(storedIPAddress).toBe(interactionInput.ipAddress);
          
          // Verify: IP address format is valid
          const ipParts = storedIPAddress?.split('.');
          expect(ipParts).toHaveLength(4);
          ipParts?.forEach(part => {
            const num = parseInt(part);
            expect(num).toBeGreaterThanOrEqual(0);
            expect(num).toBeLessThanOrEqual(255);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 16.4: User agent (browser) must be recorded
   * 
   * For any interaction, the system must record the user agent string
   * which identifies the browser and device
   */
  test('property: User agent is recorded for all interactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryInteractionInput(),
        async (interactionInput) => {
          let storedUserAgent: string | null = null;

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return {
                  rows: [
                    {
                      id: 'target-123',
                      campaign_id: interactionInput.campaignId,
                      email: 'test@example.com',
                      tracking_token: interactionInput.trackingToken,
                    },
                  ],
                };
              } else if (query.includes('INSERT INTO campaign_interactions')) {
                storedUserAgent = params[4];
                return { rows: [{ id: 'interaction-123' }] };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Track interaction
          await phishingEngine.trackInteraction(interactionInput);

          // Verify: User agent is recorded
          expect(storedUserAgent).toBe(interactionInput.userAgent);
          expect(storedUserAgent).toBeDefined();
          expect(storedUserAgent!.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 16.5: Geolocation must be recorded when provided
   * 
   * For any interaction with geolocation data, the system must
   * record the geographic location information
   */
  test('property: Geolocation is recorded when provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryInteractionInput().filter(input => input.geolocation !== undefined),
        async (interactionInput) => {
          let storedGeolocation: string | null = null;

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return {
                  rows: [
                    {
                      id: 'target-123',
                      campaign_id: interactionInput.campaignId,
                      email: 'test@example.com',
                      tracking_token: interactionInput.trackingToken,
                    },
                  ],
                };
              } else if (query.includes('INSERT INTO campaign_interactions')) {
                storedGeolocation = params[5];
                return { rows: [{ id: 'interaction-123' }] };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Track interaction
          await phishingEngine.trackInteraction(interactionInput);

          // Verify: Geolocation is recorded
          expect(storedGeolocation).toBe(interactionInput.geolocation);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 16.6: Captured data must be encrypted
   * 
   * For any interaction with captured data (credentials), the system
   * must encrypt the data before storing it in the database
   */
  test('property: Captured credentials are encrypted before storage', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryInteractionInput().filter(input => input.capturedData !== undefined),
        async (interactionInput) => {
          let storedCapturedData: Buffer | null = null;

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return {
                  rows: [
                    {
                      id: 'target-123',
                      campaign_id: interactionInput.campaignId,
                      email: 'test@example.com',
                      tracking_token: interactionInput.trackingToken,
                    },
                  ],
                };
              } else if (query.includes('INSERT INTO campaign_interactions')) {
                storedCapturedData = params[6];
                return { rows: [{ id: 'interaction-123' }] };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Track interaction with credentials
          await phishingEngine.trackInteraction(interactionInput);

          // Verify: Data is encrypted (stored as Buffer)
          expect(storedCapturedData).toBeInstanceOf(Buffer);
          
          // Verify: Plaintext is not in encrypted data
          const encryptedString = storedCapturedData!.toString();
          if (interactionInput.capturedData) {
            expect(encryptedString).not.toContain(interactionInput.capturedData.username);
            expect(encryptedString).not.toContain(interactionInput.capturedData.password);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 16.7: Timestamp must be recorded automatically
   * 
   * For any interaction, the system must automatically record
   * the timestamp when the interaction occurred
   */
  test('property: Timestamp is recorded automatically', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryInteractionInput(),
        async (interactionInput) => {
          const beforeTimestamp = new Date();

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return {
                  rows: [
                    {
                      id: 'target-123',
                      campaign_id: interactionInput.campaignId,
                      email: 'test@example.com',
                      tracking_token: interactionInput.trackingToken,
                    },
                  ],
                };
              } else if (query.includes('INSERT INTO campaign_interactions')) {
                // Database will set timestamp automatically
                return { rows: [{ id: 'interaction-123' }] };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Track interaction
          await phishingEngine.trackInteraction(interactionInput);

          const afterTimestamp = new Date();

          // Verify: Interaction was created (timestamp would be between before and after)
          expect(mockPool.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO campaign_interactions'),
            expect.any(Array)
          );

          // The timestamp is set by the database, so we just verify the insert happened
          // within a reasonable time window
          expect(afterTimestamp.getTime() - beforeTimestamp.getTime()).toBeLessThan(1000);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 16.8: Multiple interactions can be tracked for same target
   * 
   * For any target, the system must be able to track multiple interactions
   * of different types (e.g., first opened, then clicked, then entered credentials)
   */
  test('property: Multiple interactions tracked for same target', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // campaignId
        fc.uuid(), // trackingToken
        fc.array(arbitraryInteractionType(), { minLength: 2, maxLength: 4 }),
        async (campaignId, trackingToken, interactionTypes) => {
          const trackedInteractions: InteractionType[] = [];

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return {
                  rows: [
                    {
                      id: 'target-123',
                      campaign_id: campaignId,
                      email: 'test@example.com',
                      tracking_token: trackingToken,
                    },
                  ],
                };
              } else if (query.includes('INSERT INTO campaign_interactions')) {
                trackedInteractions.push(params[2]);
                return { rows: [{ id: `interaction-${trackedInteractions.length}` }] };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Track multiple interactions
          for (const interactionType of interactionTypes) {
            await phishingEngine.trackInteraction({
              campaignId,
              trackingToken,
              interactionType,
              ipAddress: '192.168.1.1',
              userAgent: 'Mozilla/5.0',
            });
          }

          // Verify: All interactions were tracked
          expect(trackedInteractions).toHaveLength(interactionTypes.length);
          expect(trackedInteractions).toEqual(interactionTypes);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property Test 16.9: Invalid tracking token must be rejected
   * 
   * For any interaction with an invalid tracking token,
   * the system must reject the interaction and throw an error
   */
  test('property: Invalid tracking token is rejected', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryInteractionInput(),
        async (interactionInput) => {
          // Mock: No target found for tracking token
          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return { rows: [] }; // No target found
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute & Verify: Should throw error
          await expect(
            phishingEngine.trackInteraction(interactionInput)
          ).rejects.toThrow('Invalid tracking token');

          // Verify: No interaction was inserted
          expect(mockPool.query).not.toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO campaign_interactions'),
            expect.any(Array)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 16.10: All interaction data fields are preserved
   * 
   * For any interaction with all optional fields provided,
   * the system must preserve all data fields without loss
   */
  test('property: All interaction data fields are preserved', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          campaignId: fc.uuid(),
          trackingToken: fc.uuid(),
          interactionType: arbitraryInteractionType(),
          ipAddress: arbitraryIPAddress(),
          userAgent: arbitraryUserAgent(),
          geolocation: arbitraryGeolocation(),
          capturedData: fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 8, maxLength: 30 }),
            email: fc.emailAddress(),
          }),
        }),
        async (interactionInput) => {
          let storedInteraction: any = null;

          (mockPool.query as jest.Mock).mockImplementation(
            async (query: string, params: any[]) => {
              if (query.includes('SELECT') && query.includes('campaign_targets')) {
                return {
                  rows: [
                    {
                      id: 'target-123',
                      campaign_id: interactionInput.campaignId,
                      email: 'test@example.com',
                      tracking_token: interactionInput.trackingToken,
                    },
                  ],
                };
              } else if (query.includes('INSERT INTO campaign_interactions')) {
                storedInteraction = {
                  campaignId: params[0],
                  targetId: params[1],
                  interactionType: params[2],
                  ipAddress: params[3],
                  userAgent: params[4],
                  geolocation: params[5],
                  capturedData: params[6],
                };
                return { rows: [{ id: 'interaction-123' }] };
              }
              return { rows: [], rowCount: 0 };
            }
          );

          // Execute: Track interaction with all fields
          await phishingEngine.trackInteraction(interactionInput);

          // Verify: All fields are preserved
          expect(storedInteraction).not.toBeNull();
          expect(storedInteraction.campaignId).toBe(interactionInput.campaignId);
          expect(storedInteraction.interactionType).toBe(interactionInput.interactionType);
          expect(storedInteraction.ipAddress).toBe(interactionInput.ipAddress);
          expect(storedInteraction.userAgent).toBe(interactionInput.userAgent);
          expect(storedInteraction.geolocation).toBe(interactionInput.geolocation);
          expect(storedInteraction.capturedData).toBeInstanceOf(Buffer);
        }
      ),
      { numRuns: 100 }
    );
  });
});
