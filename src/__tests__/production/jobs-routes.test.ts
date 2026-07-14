import express from 'express';
import request from 'supertest';

const listJobsForUserMock = jest.fn();
const getJobForUserMock = jest.fn();
const cancelJobMock = jest.fn();

jest.mock('../../api/middleware/authMiddleware', () => ({
  authenticate:
    () =>
    (req: { user?: { userId: string; username: string; roles: string[] } }, _res: unknown, next: () => void) => {
      req.user = {
        userId: 'user-1',
        username: 'admin',
        roles: ['ADMIN'],
      };
      next();
    },
}));

jest.mock('../../core/jobs/JobService', () => ({
  JobService: jest.fn().mockImplementation(() => ({
    listJobsForUser: listJobsForUserMock,
    getJobForUser: getJobForUserMock,
    cancelJob: cancelJobMock,
  })),
}));

describe('jobs routes', () => {
  const router = require('../../api/routes/jobs.routes').default;
  const app = express();
  app.use(express.json());
  app.use('/jobs', router);

  beforeEach(() => {
    listJobsForUserMock.mockReset();
    getJobForUserMock.mockReset();
    cancelJobMock.mockReset();
  });

  it('lists user jobs inside the unified success envelope', async () => {
    listJobsForUserMock.mockResolvedValue([
      {
        id: 'job-1',
        jobType: 'WEB_SCAN',
        status: 'queued',
      },
    ]);

    const response = await request(app).get('/jobs');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.jobs).toHaveLength(1);
    expect(response.body.data.jobs[0].id).toBe('job-1');
  });

  it('returns job status and result summary for the owner', async () => {
    getJobForUserMock.mockResolvedValue({
      id: 'job-2',
      status: 'completed',
      updatedAt: new Date('2026-05-05T00:00:00Z'),
      resultSummary: {
        findings: [{ type: 'xss' }],
      },
    });

    const response = await request(app).get('/jobs/job-2/status');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.jobId).toBe('job-2');
    expect(response.body.data.status).toBe('completed');
    expect(response.body.data.resultSummary.findings).toHaveLength(1);
  });
});
