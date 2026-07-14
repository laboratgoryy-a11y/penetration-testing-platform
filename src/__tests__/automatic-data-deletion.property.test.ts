import * as fc from 'fast-check';
import { Pool } from 'pg';
import { DataRetentionService, CleanupResult } from '../services/DataRetentionService';
import { PhishingCampaign } from '../models/PhishingCampaign';
import { CampaignInteraction } from '../models/CampaignInteraction';
import { NetworkTestSession } from '../models/NetworkTestSession';
import { DiscoveredDevice } from '../models/DiscoveredDevice';

// Mock dependencies
jest.mock('pg');

/**
 * Feature: penetration-testing-platform
 * Property 19: الحذف التلقائي للبيانات الحساسة
 * 
 * **Validates: Requirements 4.3, 6.7, 8.4**
 * 
 * For any sensitive data collected during penetration testing operations,
 * the system SHALL automatically delete it after the specified retention period:
 * - Phishing credentials: 30 days after campaign completion
 * - Network device data: Immediately after report generation (0 days)
 * - Statistical data: Retained for 7 years for compliance
 * 
 * This property verifies that:
 * 1. Sensitive data is deleted after retention period expires
 * 2. Statistical data is preserved for compliance
 * 3. Deletion is automatic without manual intervention
 * 4. Deletion respects configured retention policies
 */
describe('Property 19: Automatic Deletion of Sensitive Data', () => {
  let mockPool: jest.Mocked<Pool>;
  let dataRetentionService: DataRetentionService;

  beforeEach(() => {
    // Setup mock pool
    mockPool = {
      query: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      on: jest.fn(),
    } as any;

    // Create data retention service with default config
    dataRetentionService = new DataRetentionService(mockPool);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Custom arbitraries for generating test data
   */
  const arbitraryCompletedCampaign = (daysAgo: number): fc.Arbitrary<{
    id: string;
    completedAt: Date;
    status: string;
  }> => {
    return fc.record({
      id: fc.uuid(),
      completedAt: fc.constant(new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)),
      status: fc.constant('COMPLETED'),
    });
  };

  const arbitraryInteraction = (campaignId: string): fc.Arbitrary<{
    id: string;
    campaign_id: string;
    target_id: string;
    interaction_type: string;
    captured_data: Buffer | null;
    timestamp: Date;
  }> => {
    return fc.record({
      id: fc.uuid(),
      campaign_id: fc.constant(campaignId),
      target_id: fc.uuid(),
      interaction_type: fc.constantFrom(
        'EMAIL_OPENED',
        'LINK_CLICKED',
        'CREDENTIALS_ENTERED',
        'FILE_DOWNLOADED'
      ),
      captured_data: fc.option(fc.constant(Buffer.from('encrypted-data')), { nil: null }),
      timestamp: fc.date(),
    });
  };

  const arbitraryNetworkSession = (daysAgo: number): fc.Arbitrary<{
    id: string;
    completed_at: Date;
    status: string;
  }> => {
    return fc.record({
      id: fc.uuid(),
      completed_at: fc.constant(new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)),
      status: fc.constant('COMPLETED'),
    });
  };

  /**
   * Property Test 19.1: Phishing credentials deleted after 30 days
   * 
   * For any completed phishing campaign older than 30 days,
   * the system SHALL delete captured credentials while preserving
   * statistical interaction data.
   */
  test('property: phishing credentials deleted after 30 days retention period', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 31, max: 365 }), // Days since completion (> 30)
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }), // Campaign IDs
        async (daysAgo, campaignIds) => {
          // Generate expired campaigns
          const expiredCampaigns = campaignIds.map(id => ({
            id,
            user_id: fc.sample(fc.uuid(), 1)[0],
            authorization_id: fc.sample(fc.uuid(), 1)[0],
            name: 'Test Campaign',
            status: 'COMPLETED',
            email_template: {},
            landing_page_config: {},
            schedule: {},
            created_at: new Date(),
            launched_at: new Date(),
            completed_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          }));

          // Mock database responses
          mockPool.query.mockImplementation(async (query: string, params?: any[]) => {
            if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
              // Return expired campaigns
              return { rows: expiredCampaigns };
            } else if (query.includes('UPDATE campaign_interactions')) {
              // Mock deletion of sensitive data
              return { rows: [], rowCount: campaignIds.length };
            } else if (query.includes('DELETE FROM campaign_interactions')) {
              // Mock deletion of old interactions
              return { rows: [], rowCount: 0 };
            } else if (query.includes('network_test_sessions')) {
              // No network sessions
              return { rows: [] };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute cleanup
          const result = await dataRetentionService.cleanupExpiredData();

          // Verify: Campaigns were processed
          expect(result.campaignsProcessed).toBe(campaignIds.length);
          expect(result.credentialsDeleted).toBe(campaignIds.length);

          // Verify: UPDATE query was called to delete sensitive data
          const updateCalls = mockPool.query.mock.calls.filter(
            call => typeof call[0] === 'string' && call[0].includes('UPDATE campaign_interactions')
          );
          expect(updateCalls.length).toBeGreaterThan(0);

          // Verify: captured_data was set to NULL
          updateCalls.forEach(call => {
            expect(call[0]).toContain('captured_data = NULL');
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 19.2: Credentials NOT deleted before 30 days
   * 
   * For any completed phishing campaign less than 30 days old,
   * the system SHALL NOT delete captured credentials.
   */
  test('property: phishing credentials preserved within 30 day retention period', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 29 }), // Days since completion (< 30)
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }), // Campaign IDs
        async (daysAgo, campaignIds) => {
          // Generate recent campaigns (not expired)
          const recentCampaigns = campaignIds.map(id => ({
            id,
            user_id: fc.sample(fc.uuid(), 1)[0],
            authorization_id: fc.sample(fc.uuid(), 1)[0],
            name: 'Test Campaign',
            status: 'COMPLETED',
            email_template: {},
            landing_page_config: {},
            schedule: {},
            created_at: new Date(),
            launched_at: new Date(),
            completed_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          }));

          // Mock database responses
          mockPool.query.mockImplementation(async (query: string, params?: any[]) => {
            if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
              // Return recent campaigns
              return { rows: recentCampaigns };
            } else if (query.includes('UPDATE campaign_interactions')) {
              // Should not be called for recent campaigns
              return { rows: [], rowCount: 0 };
            } else if (query.includes('DELETE FROM campaign_interactions')) {
              return { rows: [], rowCount: 0 };
            } else if (query.includes('network_test_sessions')) {
              return { rows: [] };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute cleanup
          const result = await dataRetentionService.cleanupExpiredData();

          // Verify: No campaigns were processed (all too recent)
          expect(result.campaignsProcessed).toBe(0);
          expect(result.credentialsDeleted).toBe(0);

          // Verify: UPDATE query was NOT called for sensitive data deletion
          const updateCalls = mockPool.query.mock.calls.filter(
            call => typeof call[0] === 'string' && 
                   call[0].includes('UPDATE campaign_interactions') &&
                   call[0].includes('captured_data = NULL')
          );
          expect(updateCalls.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 19.3: Network data deleted immediately after report
   * 
   * For any completed network test session, the system SHALL delete
   * sensitive device data immediately (0 day retention).
   */
  test('property: network device data deleted immediately after completion', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }), // Session IDs
        async (sessionIds) => {
          // Generate completed network sessions
          const completedSessions = sessionIds.map(id => ({
            id,
            completed_at: new Date(),
          }));

          let deleteDevicesCalled = 0;
          let auditLogCalled = 0;

          // Mock database responses
          mockPool.query.mockImplementation(async (query: string, params?: any[]) => {
            if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
              // No phishing campaigns
              return { rows: [] };
            } else if (query.includes('SELECT') && query.includes('network_test_sessions')) {
              // Return completed sessions
              return { rows: completedSessions };
            } else if (query.includes('DELETE FROM discovered_devices')) {
              // Mock device deletion
              deleteDevicesCalled++;
              return { rows: [], rowCount: 5 }; // Assume 5 devices per session
            } else if (query.includes('SELECT') && query.includes('COUNT') && query.includes('discovered_devices')) {
              // Mock device count
              return { rows: [{ count: '5' }] };
            } else if (query.includes('INSERT INTO audit_logs')) {
              // Mock audit log
              auditLogCalled++;
              return { rows: [], rowCount: 1 };
            } else if (query.includes('DELETE FROM campaign_interactions')) {
              return { rows: [], rowCount: 0 };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute cleanup
          const result = await dataRetentionService.cleanupExpiredData();

          // Verify: Network sessions were processed
          expect(result.networkSessionsProcessed).toBe(sessionIds.length);
          expect(result.networkDevicesDeleted).toBeGreaterThan(0);

          // Verify: Device deletion was called for each session
          expect(deleteDevicesCalled).toBe(sessionIds.length);

          // Verify: Audit log was created for each session
          expect(auditLogCalled).toBe(sessionIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 19.4: Deletion respects custom retention policy
   * 
   * For any custom retention policy configuration, the system SHALL
   * delete data according to the configured retention period.
   */
  test('property: deletion respects custom retention policy configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 90 }), // Custom retention days
        fc.integer({ min: 1, max: 180 }), // Days since completion
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        async (retentionDays, daysAgo, campaignIds) => {
          // Create service with custom retention policy
          const customService = new DataRetentionService(mockPool, {
            phishingCredentialsRetentionDays: retentionDays,
          });

          // Generate campaigns
          const campaigns = campaignIds.map(id => ({
            id,
            user_id: fc.sample(fc.uuid(), 1)[0],
            authorization_id: fc.sample(fc.uuid(), 1)[0],
            name: 'Test Campaign',
            status: 'COMPLETED',
            email_template: {},
            landing_page_config: {},
            schedule: {},
            created_at: new Date(),
            launched_at: new Date(),
            completed_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          }));

          // Mock database responses
          mockPool.query.mockImplementation(async (query: string, params?: any[]) => {
            if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
              return { rows: campaigns };
            } else if (query.includes('UPDATE campaign_interactions')) {
              return { rows: [], rowCount: campaignIds.length };
            } else if (query.includes('DELETE FROM campaign_interactions')) {
              return { rows: [], rowCount: 0 };
            } else if (query.includes('network_test_sessions')) {
              return { rows: [] };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute cleanup
          const result = await customService.cleanupExpiredData();

          // Verify: Deletion behavior matches retention policy
          if (daysAgo > retentionDays) {
            // Should delete expired campaigns
            expect(result.campaignsProcessed).toBe(campaignIds.length);
            expect(result.credentialsDeleted).toBe(campaignIds.length);
          } else {
            // Should not delete recent campaigns
            expect(result.campaignsProcessed).toBe(0);
            expect(result.credentialsDeleted).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 19.5: Statistical data preserved during cleanup
   * 
   * For any data cleanup operation, the system SHALL preserve
   * statistical interaction data (counts, types, timestamps) while
   * deleting only sensitive captured data.
   */
  test('property: statistical data preserved while sensitive data deleted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 31, max: 365 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        async (daysAgo, campaignIds) => {
          const campaigns = campaignIds.map(id => ({
            id,
            user_id: fc.sample(fc.uuid(), 1)[0],
            authorization_id: fc.sample(fc.uuid(), 1)[0],
            name: 'Test Campaign',
            status: 'COMPLETED',
            email_template: {},
            landing_page_config: {},
            schedule: {},
            created_at: new Date(),
            launched_at: new Date(),
            completed_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          }));

          // Mock database responses
          mockPool.query.mockImplementation(async (query: string, params?: any[]) => {
            if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
              return { rows: campaigns };
            } else if (query.includes('UPDATE campaign_interactions')) {
              // Verify: Only captured_data is set to NULL, not entire row deleted
              expect(query).toContain('captured_data = NULL');
              expect(query).not.toContain('DELETE FROM');
              return { rows: [], rowCount: campaignIds.length };
            } else if (query.includes('DELETE FROM campaign_interactions')) {
              // Old interactions deletion (separate from sensitive data cleanup)
              return { rows: [], rowCount: 0 };
            } else if (query.includes('network_test_sessions')) {
              return { rows: [] };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute cleanup
          await dataRetentionService.cleanupExpiredData();

          // Verify: UPDATE was used (preserves row), not DELETE
          const updateCalls = mockPool.query.mock.calls.filter(
            call => typeof call[0] === 'string' && call[0].includes('UPDATE campaign_interactions')
          );
          expect(updateCalls.length).toBeGreaterThan(0);

          // Verify: No DELETE of interaction rows during sensitive data cleanup
          const deleteCalls = mockPool.query.mock.calls.filter(
            call => typeof call[0] === 'string' && 
                   call[0].includes('DELETE FROM campaign_interactions') &&
                   call[0].includes('captured_data')
          );
          expect(deleteCalls.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 19.6: Cleanup is idempotent
   * 
   * For any data cleanup operation, running cleanup multiple times
   * SHALL produce the same result (no errors, no duplicate deletions).
   */
  test('property: cleanup operation is idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 31, max: 365 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        async (daysAgo, campaignIds) => {
          const campaigns = campaignIds.map(id => ({
            id,
            user_id: fc.sample(fc.uuid(), 1)[0],
            authorization_id: fc.sample(fc.uuid(), 1)[0],
            name: 'Test Campaign',
            status: 'COMPLETED',
            email_template: {},
            landing_page_config: {},
            schedule: {},
            created_at: new Date(),
            launched_at: new Date(),
            completed_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          }));

          // Mock database responses
          mockPool.query.mockImplementation(async (query: string, params?: any[]) => {
            if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
              return { rows: campaigns };
            } else if (query.includes('UPDATE campaign_interactions')) {
              return { rows: [], rowCount: campaignIds.length };
            } else if (query.includes('DELETE FROM campaign_interactions')) {
              return { rows: [], rowCount: 0 };
            } else if (query.includes('network_test_sessions')) {
              return { rows: [] };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute cleanup multiple times
          const result1 = await dataRetentionService.cleanupExpiredData();
          const result2 = await dataRetentionService.cleanupExpiredData();
          const result3 = await dataRetentionService.cleanupExpiredData();

          // Verify: Results are consistent
          expect(result1.campaignsProcessed).toBe(result2.campaignsProcessed);
          expect(result2.campaignsProcessed).toBe(result3.campaignsProcessed);
          expect(result1.credentialsDeleted).toBe(result2.credentialsDeleted);
          expect(result2.credentialsDeleted).toBe(result3.credentialsDeleted);

          // Verify: No errors thrown
          // (test passes if we reach here)
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property Test 19.7: Cleanup handles empty datasets gracefully
   * 
   * For any cleanup operation with no expired data, the system SHALL
   * complete successfully without errors.
   */
  test('property: cleanup handles empty datasets without errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          // Mock database responses with no data
          mockPool.query.mockImplementation(async (query: string, params?: any[]) => {
            // Return empty results for all queries
            return { rows: [], rowCount: 0 };
          });

          // Execute cleanup
          const result = await dataRetentionService.cleanupExpiredData();

          // Verify: Cleanup completes successfully
          expect(result.campaignsProcessed).toBe(0);
          expect(result.credentialsDeleted).toBe(0);
          expect(result.interactionsDeleted).toBe(0);
          expect(result.networkSessionsProcessed).toBe(0);
          expect(result.networkDevicesDeleted).toBe(0);

          // Verify: No errors thrown
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property Test 19.8: Manual deletion works for specific campaigns
   * 
   * For any campaign ID, the system SHALL allow manual deletion of
   * sensitive data without waiting for automatic cleanup.
   */
  test('property: manual deletion works for specific campaigns', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (campaignId) => {
          // Mock database response
          mockPool.query.mockImplementation(async (query: string, params?: any[]) => {
            if (query.includes('UPDATE campaign_interactions')) {
              expect(params).toContain(campaignId);
              return { rows: [], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute manual deletion
          await dataRetentionService.deleteCampaignSensitiveData(campaignId);

          // Verify: UPDATE was called with correct campaign ID
          const updateCalls = mockPool.query.mock.calls.filter(
            call => typeof call[0] === 'string' && call[0].includes('UPDATE campaign_interactions')
          );
          expect(updateCalls.length).toBe(1);
          expect(updateCalls[0][1]).toContain(campaignId);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test 19.9: Cleanup returns accurate statistics
   * 
   * For any cleanup operation, the system SHALL return accurate
   * statistics about the number of items processed and deleted.
   */
  test('property: cleanup returns accurate statistics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // Number of campaigns
        fc.integer({ min: 1, max: 10 }), // Number of network sessions
        async (numCampaigns, numNetworkSessions) => {
          const campaigns = Array.from({ length: numCampaigns }, (_, i) => ({
            id: `campaign-${i}`,
            user_id: fc.sample(fc.uuid(), 1)[0],
            authorization_id: fc.sample(fc.uuid(), 1)[0],
            name: 'Test Campaign',
            status: 'COMPLETED',
            email_template: {},
            landing_page_config: {},
            schedule: {},
            created_at: new Date(),
            launched_at: new Date(),
            completed_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          }));

          const networkSessions = Array.from({ length: numNetworkSessions }, (_, i) => ({
            id: `session-${i}`,
            completed_at: new Date(),
          }));

          // Mock database responses
          mockPool.query.mockImplementation(async (query: string, params?: any[]) => {
            if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
              return { rows: campaigns };
            } else if (query.includes('UPDATE campaign_interactions')) {
              return { rows: [], rowCount: 1 };
            } else if (query.includes('DELETE FROM campaign_interactions')) {
              return { rows: [], rowCount: 0 };
            } else if (query.includes('SELECT') && query.includes('network_test_sessions')) {
              return { rows: networkSessions };
            } else if (query.includes('DELETE FROM discovered_devices')) {
              return { rows: [], rowCount: 3 }; // 3 devices per session
            } else if (query.includes('SELECT') && query.includes('COUNT') && query.includes('discovered_devices')) {
              return { rows: [{ count: '3' }] };
            } else if (query.includes('INSERT INTO audit_logs')) {
              return { rows: [], rowCount: 1 };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute cleanup
          const result = await dataRetentionService.cleanupExpiredData();

          // Verify: Statistics match expected values
          expect(result.campaignsProcessed).toBe(numCampaigns);
          expect(result.credentialsDeleted).toBe(numCampaigns);
          expect(result.networkSessionsProcessed).toBe(numNetworkSessions);
          expect(result.networkDevicesDeleted).toBe(numNetworkSessions * 3);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property Test 19.10: Cleanup continues on individual failures
   * 
   * For any cleanup operation, if deletion fails for one campaign,
   * the system SHALL continue processing remaining campaigns.
   */
  test('property: cleanup continues processing after individual failures', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 3, maxLength: 10 }),
        fc.integer({ min: 0, max: 2 }), // Index of campaign that will fail
        async (campaignIds, failIndex) => {
          const campaigns = campaignIds.map(id => ({
            id,
            user_id: fc.sample(fc.uuid(), 1)[0],
            authorization_id: fc.sample(fc.uuid(), 1)[0],
            name: 'Test Campaign',
            status: 'COMPLETED',
            email_template: {},
            landing_page_config: {},
            schedule: {},
            created_at: new Date(),
            launched_at: new Date(),
            completed_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          }));

          let updateCallCount = 0;

          // Mock database responses
          mockPool.query.mockImplementation(async (query: string, params?: any[]) => {
            if (query.includes('SELECT') && query.includes('phishing_campaigns')) {
              return { rows: campaigns };
            } else if (query.includes('UPDATE campaign_interactions')) {
              if (updateCallCount === failIndex) {
                updateCallCount++;
                throw new Error('Database error');
              }
              updateCallCount++;
              return { rows: [], rowCount: 1 };
            } else if (query.includes('DELETE FROM campaign_interactions')) {
              return { rows: [], rowCount: 0 };
            } else if (query.includes('network_test_sessions')) {
              return { rows: [] };
            }
            return { rows: [], rowCount: 0 };
          });

          // Execute cleanup (should not throw despite one failure)
          const result = await dataRetentionService.cleanupExpiredData();

          // Verify: Other campaigns were still processed
          expect(result.campaignsProcessed).toBe(campaignIds.length - 1);
          expect(result.credentialsDeleted).toBe(campaignIds.length - 1);

          // Verify: All campaigns were attempted
          expect(updateCallCount).toBe(campaignIds.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});
