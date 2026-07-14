import express from 'express';
import request from 'supertest';

type SlidingWindowState = Map<string, number[]>;

function createRedisEvalMock(state: SlidingWindowState) {
  return jest.fn(
    async (
      _script: string,
      {
        keys,
        arguments: args,
      }: {
        keys: string[];
        arguments: string[];
      }
    ) => {
      const key = keys[0];
      const now = Number(args[0]);
      const windowMs = Number(args[1]);
      const maxRequests = Number(args[2]);

      const activeEntries = (state.get(key) || []).filter(
        (timestamp) => timestamp > now - windowMs
      );
      state.set(key, activeEntries);

      if (activeEntries.length >= maxRequests) {
        const earliestTimestamp = activeEntries[0] || now;
        const retryAfterMs = Math.max(
          earliestTimestamp + windowMs - now,
          1
        );
        return [0, 0, retryAfterMs];
      }

      activeEntries.push(now);
      state.set(key, activeEntries);
      return [1, maxRequests - activeEntries.length, windowMs];
    }
  );
}

describe('Redis-backed rate limiters', () => {
  afterEach(() => {
    delete process.env.ENABLE_RATE_LIMITS_IN_TEST;
    delete process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.LOGIN_RATE_LIMIT_WINDOW_MS;
    delete process.env.RUNNER_HEARTBEAT_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.RUNNER_HEARTBEAT_RATE_LIMIT_WINDOW_MS;
    delete process.env.PASSWORD_RESET_REQUEST_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.PASSWORD_RESET_REQUEST_RATE_LIMIT_WINDOW_MS;
    delete process.env.PASSWORD_RESET_CONFIRM_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.PASSWORD_RESET_CONFIRM_RATE_LIMIT_WINDOW_MS;
    delete process.env.REPORT_GENERATION_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.REPORT_GENERATION_RATE_LIMIT_WINDOW_MS;
    delete process.env.AUTHORIZATION_WRITE_RATE_LIMIT_MAX_REQUESTS;
    delete process.env.AUTHORIZATION_WRITE_RATE_LIMIT_WINDOW_MS;
  });

  async function buildTestApp() {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_RATE_LIMITS_IN_TEST = 'true';
    process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS = '2';
    process.env.LOGIN_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RUNNER_HEARTBEAT_RATE_LIMIT_MAX_REQUESTS = '2';
    process.env.RUNNER_HEARTBEAT_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.PASSWORD_RESET_REQUEST_RATE_LIMIT_MAX_REQUESTS = '1';
    process.env.PASSWORD_RESET_REQUEST_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.PASSWORD_RESET_CONFIRM_RATE_LIMIT_MAX_REQUESTS = '2';
    process.env.PASSWORD_RESET_CONFIRM_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.REPORT_GENERATION_RATE_LIMIT_MAX_REQUESTS = '1';
    process.env.REPORT_GENERATION_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTHORIZATION_WRITE_RATE_LIMIT_MAX_REQUESTS = '1';
    process.env.AUTHORIZATION_WRITE_RATE_LIMIT_WINDOW_MS = '60000';

    const redisState: SlidingWindowState = new Map();
    const evalMock = createRedisEvalMock(redisState);

    jest.doMock('../../database/connection', () => ({
      getRedisClient: async () => ({
        eval: evalMock,
      }),
    }));

    const {
      loginLimiter,
      passwordResetRequestLimiter,
      passwordResetConfirmLimiter,
      runnerHeartbeatLimiter,
      reportGenerationLimiter,
      authorizationWriteLimiter,
    } = require('../../api/middleware/rateLimiter');

    const app = express();
    app.use(express.json());
    app.post('/login', loginLimiter, (_req, res) => {
      res.status(200).json({ success: true });
    });
    app.post('/password/reset/request', passwordResetRequestLimiter, (_req, res) => {
      res.status(202).json({ success: true });
    });
    app.post('/password/reset/confirm', passwordResetConfirmLimiter, (_req, res) => {
      res.status(200).json({ success: true });
    });
    app.post('/runner/heartbeat', runnerHeartbeatLimiter, (_req, res) => {
      res.status(200).json({ success: true });
    });
    app.post(
      '/reports',
      (
        req: express.Request & {
          user?: { userId: string; username: string; roles: string[] };
        },
        _res,
        next
      ) => {
        req.user = {
          userId: 'user-1',
          username: 'operator',
          roles: ['ADMIN'],
        };
        next();
      },
      reportGenerationLimiter,
      (_req, res) => {
        res.status(201).json({ success: true });
      }
    );
    app.post(
      '/authorizations',
      (
        req: express.Request & {
          user?: { userId: string; username: string; roles: string[] };
        },
        _res,
        next
      ) => {
        req.user = {
          userId: 'user-1',
          username: 'operator',
          roles: ['ADMIN'],
        };
        next();
      },
      authorizationWriteLimiter,
      (_req, res) => {
        res.status(201).json({ success: true });
      }
    );

    return { app, redisState };
  }

  it('enforces a dedicated Redis-backed login limit with a login-specific error code', async () => {
    const { app } = await buildTestApp();

    await request(app).post('/login').send({
      username: 'operator',
      password: 'StrongerPassword!42',
    });
    await request(app).post('/login').send({
      username: 'operator',
      password: 'StrongerPassword!42',
    });
    const limitedResponse = await request(app).post('/login').send({
      username: 'operator',
      password: 'StrongerPassword!42',
    });

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body.success).toBe(false);
    expect(limitedResponse.body.error.code).toBe('LOGIN_RATE_LIMIT_EXCEEDED');
    expect(limitedResponse.headers['retry-after']).toBeDefined();
  });

  it('keeps password reset request limits isolated from login limits and applies a route-specific code', async () => {
    const { app } = await buildTestApp();

    await request(app).post('/login').send({
      username: 'operator',
      password: 'StrongerPassword!42',
    });
    await request(app).post('/login').send({
      username: 'operator',
      password: 'StrongerPassword!42',
    });

    const firstResetRequest = await request(app)
      .post('/password/reset/request')
      .send({
        email: 'operator@corp.redteam',
      });
    const limitedResetRequest = await request(app)
      .post('/password/reset/request')
      .send({
        email: 'operator@corp.redteam',
      });

    expect(firstResetRequest.status).toBe(202);
    expect(limitedResetRequest.status).toBe(429);
    expect(limitedResetRequest.body.error.code).toBe(
      'PASSWORD_RESET_REQUEST_RATE_LIMIT_EXCEEDED'
    );
  });

  it('enforces a dedicated heartbeat limit for runners based on runner credentials', async () => {
    const { app } = await buildTestApp();

    await request(app)
      .post('/runner/heartbeat')
      .set('Authorization', 'Bearer runner-token-1')
      .send({});
    await request(app)
      .post('/runner/heartbeat')
      .set('Authorization', 'Bearer runner-token-1')
      .send({});
    const limitedResponse = await request(app)
      .post('/runner/heartbeat')
      .set('Authorization', 'Bearer runner-token-1')
      .send({});

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body.error.code).toBe(
      'RUNNER_HEARTBEAT_RATE_LIMIT_EXCEEDED'
    );
  });

  it('keeps report generation and authorization write limits isolated for the same user', async () => {
    const { app } = await buildTestApp();

    const firstReport = await request(app).post('/reports').send({
      reportType: 'COMPLIANCE',
      format: 'PDF',
    });
    const limitedReport = await request(app).post('/reports').send({
      reportType: 'COMPLIANCE',
      format: 'PDF',
    });
    const firstAuthorization = await request(app).post('/authorizations').send({
      organizationName: 'Corp',
    });
    const limitedAuthorization = await request(app).post('/authorizations').send({
      organizationName: 'Corp',
    });

    expect(firstReport.status).toBe(201);
    expect(limitedReport.status).toBe(429);
    expect(limitedReport.body.error.code).toBe(
      'REPORT_GENERATION_RATE_LIMIT_EXCEEDED'
    );

    expect(firstAuthorization.status).toBe(201);
    expect(limitedAuthorization.status).toBe(429);
    expect(limitedAuthorization.body.error.code).toBe(
      'AUTHORIZATION_WRITE_RATE_LIMIT_EXCEEDED'
    );
  });
});
