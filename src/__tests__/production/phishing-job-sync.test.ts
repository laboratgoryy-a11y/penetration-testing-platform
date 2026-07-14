import { JobService } from '../../core/jobs/JobService';

describe('JobService phishing campaign synchronization', () => {
  it('marks a phishing campaign completed when the dispatch job completes', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'job-phish-1',
            job_type: 'PHISHING_DISPATCH',
            status: 'running',
            requested_by: 'user-1',
            authorization_id: null,
            target_type: 'campaign',
            target_value: 'campaign-1',
            payload: {},
            required_os: null,
            required_capabilities: ['PHISHING_DISPATCH'],
            required_tools: [],
            runner_id: 'runner-1',
            error_code: null,
            error_message: null,
            result_summary: null,
            created_at: new Date('2026-05-08T00:00:00.000Z'),
            updated_at: new Date('2026-05-08T00:00:00.000Z'),
            claimed_at: new Date('2026-05-08T00:00:00.000Z'),
            started_at: new Date('2026-05-08T00:00:00.000Z'),
            completed_at: null,
            cancelled_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'job-phish-1',
            job_type: 'PHISHING_DISPATCH',
            status: 'completed',
            requested_by: 'user-1',
            authorization_id: null,
            target_type: 'campaign',
            target_value: 'campaign-1',
            payload: {},
            required_os: null,
            required_capabilities: ['PHISHING_DISPATCH'],
            required_tools: [],
            runner_id: 'runner-1',
            error_code: null,
            error_message: null,
            result_summary: {},
            created_at: new Date('2026-05-08T00:00:00.000Z'),
            updated_at: new Date('2026-05-08T00:00:01.000Z'),
            claimed_at: new Date('2026-05-08T00:00:00.000Z'),
            started_at: new Date('2026-05-08T00:00:00.000Z'),
            completed_at: new Date('2026-05-08T00:00:01.000Z'),
            cancelled_at: null,
          },
        ],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
      });

    const jobService = new JobService({ query: queryMock } as any);

    await jobService.transitionJob('runner-1', 'job-phish-1', 'completed', {
      resultSummary: {
        totalTargets: 1,
      },
    });

    expect(queryMock).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('UPDATE phishing_campaigns'),
      ['completed', 'job-phish-1']
    );
  });
});
