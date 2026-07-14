import express from 'express';
import request from 'supertest';

const createJobMock = jest.fn();

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

jest.mock('../../core/jobs/JobService', () => ({
  JobService: jest.fn().mockImplementation(() => ({
    createJob: createJobMock,
    listJobsForUser: jest.fn(),
    getJobForUser: jest.fn(),
    cancelJob: jest.fn(),
  })),
}));

jest.mock('../../core/authorizations/AuthorizationDomainService', () => ({
  AuthorizationDomainService: jest.fn().mockImplementation(() => ({
    getAuthorization: jest.fn().mockResolvedValue({ id: 'auth-1' }),
    validateAuthorization: jest.fn().mockResolvedValue({ valid: true }),
  })),
}));

describe('network routes', () => {
  const router = require('../../api/routes/network.routes').default;
  const { errorHandlerMiddleware } = require('../../api/middleware/errorHandler');
  const app = express();
  app.use(express.json());
  app.use('/network', router);
  app.use(errorHandlerMiddleware);

  beforeEach(() => {
    createJobMock.mockReset();
  });

  it('returns runtime readiness metadata for wireless tests', async () => {
    const response = await request(app).get('/network/runtime-readiness');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.tests)).toBe(true);
    expect(response.body.data.tests.some((item: { id: string }) => item.id === 'TRAFFIC_ANALYSIS')).toBe(true);
  });

  it('accepts known wireless test types and leaves unsupported ones to runtime readiness/execution status handling', async () => {
    createJobMock.mockResolvedValue({
      id: 'job-network-2',
      status: 'queued',
    });

    const response = await request(app).post('/network/tests').send({
      target: {
        authorizationId: 'auth-1',
        ssid: 'LegacyLab',
        bssid: '00:11:22:33:44:55',
      },
      config: {
        testTypes: ['TRAFFIC_ANALYSIS', 'DEAUTH_ATTACK', 'WEP_CRACK'],
      },
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(createJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          config: expect.objectContaining({
            testTypes: ['TRAFFIC_ANALYSIS', 'DEAUTH_ATTACK', 'WEP_CRACK'],
          }),
        }),
      })
    );
  });

  it('rejects unknown wireless test types that are not recognized by the system', async () => {
    const response = await request(app).post('/network/tests').send({
      target: {
        authorizationId: 'auth-1',
        ssid: 'LegacyLab',
        bssid: '00:11:22:33:44:55',
      },
      config: {
        testTypes: ['TRAFFIC_ANALYSIS', 'ALIEN_MODE'],
      },
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNKNOWN_TEST_TYPES');
    expect(response.body.error.details.unknownTestTypes).toEqual(['ALIEN_MODE']);
  });

  it('queues a wireless assessment job when all requested test types are supported', async () => {
    createJobMock.mockResolvedValue({
      id: 'job-network-1',
      status: 'queued',
    });

    const response = await request(app).post('/network/tests').send({
      target: {
        authorizationId: 'auth-1',
        ssid: 'CorpSecure',
        bssid: '00:11:22:33:44:55',
      },
      config: {
        testTypes: ['TRAFFIC_ANALYSIS'],
      },
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(createJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          config: expect.objectContaining({
            testTypes: ['TRAFFIC_ANALYSIS'],
          }),
        }),
      })
    );
  });
});
