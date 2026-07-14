import express from 'express';
import request from 'supertest';

const loginMock = jest.fn();
const requestPasswordResetMock = jest.fn();
const completePasswordResetMock = jest.fn();
const changePasswordMock = jest.fn();

jest.mock('../../api/middleware/authMiddleware', () => ({
  authenticate:
    () => (req: { user?: { userId: string; username: string; roles: string[] } }, _res: unknown, next: () => void) => {
      req.user = {
        userId: 'user-1',
        username: 'admin',
        roles: ['ADMIN'],
      };
      next();
    },
}));

jest.mock('../../core/auth/AuthService', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    login: loginMock,
    logout: jest.fn(),
    refreshAccessToken: jest.fn(),
    getUserByToken: jest.fn(),
    getUserById: jest.fn(),
    changePassword: changePasswordMock,
    requestPasswordReset: requestPasswordResetMock,
    completePasswordReset: completePasswordResetMock,
  })),
}));

describe('auth routes', () => {
  const router = require('../../api/routes/auth.routes').default;
  const app = express();
  app.use(express.json());
  app.use('/auth', router);

  beforeEach(() => {
    loginMock.mockReset();
    requestPasswordResetMock.mockReset();
    completePasswordResetMock.mockReset();
    changePasswordMock.mockReset();
  });

  it('returns token, user, and session metadata on successful login', async () => {
    loginMock.mockResolvedValue({
      success: true,
      token: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        username: 'admin',
        email: 'admin@example.com',
        mfaEnabled: false,
        roles: ['ADMIN'],
        createdAt: new Date('2026-01-01T00:00:00Z'),
        lastLogin: null,
      },
      session: {
        accessTokenExpiresAt: '2026-01-01T01:00:00.000Z',
        refreshTokenExpiresAt: '2026-01-08T00:00:00.000Z',
      },
    });

    const response = await request(app).post('/auth/login').send({
      username: 'admin',
      password: 'secret',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBe('access-token');
    expect(response.body.data.refreshToken).toBe('refresh-token');
    expect(response.body.data.user.username).toBe('admin');
    expect(response.body.data.session.accessTokenExpiresAt).toBe(
      '2026-01-01T01:00:00.000Z'
    );
  });

  it('returns an MFA-specific error envelope when MFA is required', async () => {
    loginMock.mockResolvedValue({
      success: false,
      requiresMFA: true,
      error: 'MFA token required',
    });

    const response = await request(app).post('/auth/login').send({
      username: 'admin',
      password: 'secret',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('MFA_REQUIRED');
    expect(response.body.error.details.requiresMFA).toBe(true);
  });

  it('accepts a password reset request inside the unified success envelope', async () => {
    requestPasswordResetMock.mockResolvedValue(undefined);

    const response = await request(app).post('/auth/password/reset/request').send({
      email: 'operator@corp.redteam',
    });

    expect(response.status).toBe(202);
    expect(response.body.success).toBe(true);
    expect(requestPasswordResetMock).toHaveBeenCalledWith('operator@corp.redteam');
  });

  it('rejects password reset confirmation when the token is invalid or expired', async () => {
    completePasswordResetMock.mockResolvedValue({
      success: false,
      errorCode: 'PASSWORD_RESET_FAILED',
      error: 'Password reset token is invalid or has expired',
    });

    const response = await request(app).post('/auth/password/reset/confirm').send({
      token: 'invalid-token',
      newPassword: 'StrongerPassword!42',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('PASSWORD_RESET_FAILED');
  });

  it('rejects password reset confirmation when the new password violates policy', async () => {
    completePasswordResetMock.mockResolvedValue({
      success: false,
      errorCode: 'PASSWORD_POLICY_VIOLATION',
      error: 'Password does not meet the security policy',
      details: {
        reasons: ['Password must be at least 12 characters long'],
      },
    });

    const response = await request(app).post('/auth/password/reset/confirm').send({
      token: 'valid-token',
      newPassword: 'weakpass',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('PASSWORD_POLICY_VIOLATION');
    expect(response.body.error.details.reasons).toEqual([
      'Password must be at least 12 characters long',
    ]);
  });

  it('rejects password change when the new password violates policy', async () => {
    changePasswordMock.mockResolvedValue({
      success: false,
      errorCode: 'PASSWORD_POLICY_VIOLATION',
      error: 'Password does not meet the security policy',
      details: {
        reasons: ['Password must include an uppercase letter'],
      },
    });

    const response = await request(app).post('/auth/password/change').send({
      currentPassword: 'CurrentStrong!42',
      newPassword: 'lowercaseonly42!',
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('PASSWORD_POLICY_VIOLATION');
    expect(response.body.error.details.reasons).toEqual([
      'Password must include an uppercase letter',
    ]);
  });
});
