import express from 'express';
import request from 'supertest';
import { Readable } from 'stream';

const queryMock = jest.fn();
const getObjectStreamMock = jest.fn();

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

jest.mock('../../core/storage/ObjectStorageService', () => ({
  ObjectStorageService: jest.fn().mockImplementation(() => ({
    getObjectStream: getObjectStreamMock,
  })),
}));

describe('reports download route', () => {
  const router = require('../../api/routes/reports.routes').default;
  const { errorHandlerMiddleware } = require('../../api/middleware/errorHandler');
  const app = express();
  app.use(express.json());
  app.use('/reports', router);
  app.use(errorHandlerMiddleware);

  beforeEach(() => {
    queryMock.mockReset();
    getObjectStreamMock.mockReset();
  });

  it('streams the stored artifact when a ready report is requested as a file', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'report-1',
          job_id: 'job-1',
          report_type: 'COMPLIANCE',
          format: 'PDF',
          status: 'ready',
          artifact_id: 'artifact-1',
          metadata: {},
          generated_at: new Date('2026-05-08T00:00:00.000Z'),
          file_name: 'compliance-report.pdf',
          object_key: 'reports/report-1/compliance-report.pdf',
          content_type: 'application/pdf',
        },
      ],
    });
    getObjectStreamMock.mockResolvedValue({
      stream: Readable.from(['pdf-bytes']),
      contentType: 'application/pdf',
      sizeBytes: 9,
    });

    const response = await request(app).get('/reports/report-1?format=pdf');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(getObjectStreamMock).toHaveBeenCalledWith(
      'reports/report-1/compliance-report.pdf'
    );
    const responseBody = Buffer.isBuffer(response.body)
      ? response.body.toString('utf8')
      : response.text;
    expect(responseBody).toBe('pdf-bytes');
  });
});
