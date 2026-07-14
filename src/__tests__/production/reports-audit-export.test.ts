import express from 'express';
import request from 'supertest';

const queryMock = jest.fn();

jest.mock('../../api/middleware/authMiddleware', () => ({
  authenticate:
    () =>
    (req: { user?: { userId: string; username: string; roles: string[] } }, _res: unknown, next: () => void) => {
      req.user = {
        userId: 'user-1',
        username: 'auditor',
        roles: ['AUDITOR'],
      };
      next();
    },
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('../../database/connection', () => ({
  pgPool: {
    query: (...args: unknown[]) => queryMock(...args),
  },
}));

describe('audit export route', () => {
  const router = require('../../api/routes/reports.routes').default;
  const { errorHandlerMiddleware } = require('../../api/middleware/errorHandler');
  const app = express();
  app.use(express.json());
  app.use('/', router);
  app.use(errorHandlerMiddleware);

  beforeEach(() => {
    queryMock.mockReset();
  });

  it('exports audit logs as a downloadable json file', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'audit-1',
          user_id: 'user-1',
          event_type: 'JOB_SUBMITTED',
          resource: 'jobs',
          action: 'create',
          result: 'success',
          details: { jobId: 'job-1' },
          ip_address: '127.0.0.1',
          user_agent: 'jest',
          created_at: '2026-05-08T00:00:00.000Z',
        },
      ],
    });

    const response = await request(app).get('/audit/logs/export?format=json');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(JSON.parse(response.text)).toEqual([
      expect.objectContaining({
        id: 'audit-1',
        event_type: 'JOB_SUBMITTED',
      }),
    ]);
  });
});
