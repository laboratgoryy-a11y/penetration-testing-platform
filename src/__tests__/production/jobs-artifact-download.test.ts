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
        roles: ['OPERATOR'],
      };
      next();
    },
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

describe('jobs artifact download route', () => {
  const router = require('../../api/routes/jobs.routes').default;
  const { errorHandlerMiddleware } = require('../../api/middleware/errorHandler');
  const app = express();
  app.use(express.json());
  app.use('/jobs', router);
  app.use(errorHandlerMiddleware);

  beforeEach(() => {
    queryMock.mockReset();
    getObjectStreamMock.mockReset();
  });

  it('streams a persisted job artifact for the job owner', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{ allowed: 1 }],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'artifact-1',
            file_name: 'evidence.txt',
            object_key: 'jobs/job-1/evidence.txt',
            content_type: 'text/plain',
            size_bytes: 13,
          },
        ],
      });
    getObjectStreamMock.mockResolvedValue({
      stream: Readable.from(['artifact-body']),
      contentType: 'text/plain',
      sizeBytes: 13,
    });

    const response = await request(app).get(
      '/jobs/job-1/artifacts/artifact-1/download'
    );

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(getObjectStreamMock).toHaveBeenCalledWith('jobs/job-1/evidence.txt');
    expect(response.text).toBe('artifact-body');
  });
});
