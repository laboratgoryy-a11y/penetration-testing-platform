import { JobService } from '../../core/jobs/JobService';

describe('JobService report persistence hooks', () => {
  it('marks a queued report as ready when a report artifact is uploaded', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [{ id: 'artifact-1' }],
      })
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [],
      });
    const jobService = new JobService({ query: queryMock } as any);

    await jobService.addArtifact({
      jobId: 'job-1',
      runnerId: 'runner-1',
      artifactType: 'REPORT',
      fileName: 'report.json',
      objectKey: 'reports/job-1/report.json',
      sizeBytes: 42,
      contentType: 'application/json',
      metadata: {
        reportType: 'SCAN',
      },
    });

    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE reports'),
      ['job-1', 'artifact-1']
    );
  });

  it('marks report records as failed when a report job ends unsuccessfully', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'job-2',
            job_type: 'REPORT_GENERATION',
            status: 'running',
            requested_by: 'user-1',
            authorization_id: null,
            target_type: 'report',
            target_value: 'scan-job-1',
            payload: {},
            required_os: null,
            required_capabilities: ['REPORT_GENERATION'],
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
            id: 'job-2',
            job_type: 'REPORT_GENERATION',
            status: 'failed',
            requested_by: 'user-1',
            authorization_id: null,
            target_type: 'report',
            target_value: 'scan-job-1',
            payload: {},
            required_os: null,
            required_capabilities: ['REPORT_GENERATION'],
            required_tools: [],
            runner_id: 'runner-1',
            error_code: 'EXECUTION_FAILED',
            error_message: 'boom',
            result_summary: null,
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

    await jobService.transitionJob('runner-1', 'job-2', 'failed', {
      errorCode: 'EXECUTION_FAILED',
      errorMessage: 'boom',
    });

    expect(queryMock).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('UPDATE reports'),
      ['job-2']
    );
  });
});
