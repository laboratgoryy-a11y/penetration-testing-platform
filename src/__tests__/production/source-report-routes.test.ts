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
        username: 'operator',
        roles: ['ADMIN'],
      };
      next();
    },
  authorize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
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

describe('operation-specific report download routes', () => {
  const scansRouter = require('../../api/routes/scans.routes').default;
  const networkRouter = require('../../api/routes/network.routes').default;
  const phishingRouter = require('../../api/routes/phishing.routes').default;
  const { errorHandlerMiddleware } = require('../../api/middleware/errorHandler');

  const buildApp = (mountPath: string, router: express.Router) => {
    const app = express();
    app.use(express.json());
    app.use(mountPath, router);
    app.use(errorHandlerMiddleware);
    return app;
  };

  beforeEach(() => {
    queryMock.mockReset();
    getObjectStreamMock.mockReset();
  });

  it('streams the stored scan report artifact when one exists', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'report-1',
          file_name: 'scan-report.pdf',
          object_key: 'reports/report-1/scan-report.pdf',
          content_type: 'application/pdf',
        },
      ],
    });
    getObjectStreamMock.mockResolvedValue({
      stream: Readable.from(['scan-report']),
      contentType: 'application/pdf',
      sizeBytes: 11,
    });

    const response = await request(buildApp('/scans', scansRouter)).get(
      '/scans/web/scan-job-1/report?format=pdf'
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(getObjectStreamMock).toHaveBeenCalledWith(
      'reports/report-1/scan-report.pdf'
    );
  });

  it('streams the stored network report artifact when one exists', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'report-2',
          file_name: 'network-report.pdf',
          object_key: 'reports/report-2/network-report.pdf',
          content_type: 'application/pdf',
        },
      ],
    });
    getObjectStreamMock.mockResolvedValue({
      stream: Readable.from(['network-report']),
      contentType: 'application/pdf',
      sizeBytes: 14,
    });

    const response = await request(buildApp('/network', networkRouter)).get(
      '/network/tests/network-job-1/report?format=pdf'
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(getObjectStreamMock).toHaveBeenCalledWith(
      'reports/report-2/network-report.pdf'
    );
  });

  it('streams the stored campaign report artifact when one exists', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'report-3',
          file_name: 'campaign-report.pdf',
          object_key: 'reports/report-3/campaign-report.pdf',
          content_type: 'application/pdf',
        },
      ],
    });
    getObjectStreamMock.mockResolvedValue({
      stream: Readable.from(['campaign-report']),
      contentType: 'application/pdf',
      sizeBytes: 15,
    });

    const response = await request(buildApp('/phishing', phishingRouter)).get(
      '/phishing/campaigns/campaign-1/report?format=pdf'
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(getObjectStreamMock).toHaveBeenCalledWith(
      'reports/report-3/campaign-report.pdf'
    );
  });
});
