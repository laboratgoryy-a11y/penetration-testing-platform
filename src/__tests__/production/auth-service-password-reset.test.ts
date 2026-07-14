jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('AuthService password reset workflow', () => {
  const sendMailMock = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    process.env.RUNNER_REGISTRATION_SECRET = 'test-runner-secret';
    process.env.EMAIL_FROM_EMAIL = 'security@test.local';
    process.env.PASSWORD_RESET_URL = 'http://localhost/reset-password';
    process.env.SMTP_HOST = 'smtp.test.local';

    const nodemailer = require('nodemailer');
    sendMailMock.mockReset();
    sendMailMock.mockResolvedValue({
      messageId: 'message-1',
      accepted: ['operator@corp.redteam'],
      rejected: [],
    });
    nodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock,
    });
  });

  it('creates a reset token for an existing user and sends a real reset email', async () => {
    const { AuthService } = require('../../core/auth/AuthService');
    const db = {
      query: jest.fn(async (text: string) => {
        if (text.includes('FROM users') && text.includes('LOWER(email)')) {
          return {
            rows: [
              {
                id: 'user-1',
                username: 'operator',
                email: 'operator@corp.redteam',
                password_hash: '$2b$12$existing',
                mfa_enabled: false,
                account_locked: false,
                failed_login_attempts: 0,
                created_at: new Date('2026-01-01T00:00:00Z'),
                updated_at: new Date('2026-01-01T00:00:00Z'),
                last_login: null,
                password_changed_at: new Date('2026-01-01T00:00:00Z'),
              },
            ],
          };
        }

        if (text.includes('UPDATE password_reset_tokens')) {
          return { rows: [], rowCount: 0 };
        }

        if (text.includes('SELECT created_at')) {
          return { rows: [] };
        }

        if (text.includes('INSERT INTO password_reset_tokens')) {
          return { rows: [], rowCount: 1 };
        }

        throw new Error(`Unexpected query: ${text}`);
      }),
    };

    const authService = new AuthService(db);
    await authService.requestPasswordReset('operator@corp.redteam');

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'operator@corp.redteam',
        subject: expect.stringContaining('Password Reset'),
        text: expect.stringContaining('http://localhost/reset-password?token='),
      })
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO password_reset_tokens'),
      expect.any(Array)
    );
  });

  it('does not issue another reset token during the cooldown window', async () => {
    const { AuthService } = require('../../core/auth/AuthService');
    const db = {
      query: jest.fn(async (text: string) => {
        if (text.includes('FROM users') && text.includes('LOWER(email)')) {
          return {
            rows: [
              {
                id: 'user-1',
                username: 'operator',
                email: 'operator@corp.redteam',
                password_hash: '$2b$12$existing',
                mfa_enabled: false,
                account_locked: false,
                failed_login_attempts: 0,
                created_at: new Date('2026-01-01T00:00:00Z'),
                updated_at: new Date('2026-01-01T00:00:00Z'),
                last_login: null,
                password_changed_at: new Date('2026-01-01T00:00:00Z'),
              },
            ],
          };
        }

        if (text.includes('SELECT created_at')) {
          return {
            rows: [{ created_at: new Date() }],
          };
        }

        if (text.includes('UPDATE password_reset_tokens')) {
          throw new Error('reset token invalidation should not run during cooldown');
        }

        if (text.includes('INSERT INTO password_reset_tokens')) {
          throw new Error('reset token creation should not run during cooldown');
        }

        throw new Error(`Unexpected query: ${text}`);
      }),
    };

    const authService = new AuthService(db);
    await authService.requestPasswordReset('operator@corp.redteam');

    expect(sendMailMock).not.toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO password_reset_tokens'),
      expect.any(Array)
    );
  });

  it('consumes a valid reset token and rotates the stored password hash', async () => {
    const { AuthService } = require('../../core/auth/AuthService');
    const db = {
      query: jest.fn(async (text: string) => {
        if (text.includes('FROM password_reset_tokens')) {
          return {
            rows: [
              {
                token_id: 'reset-1',
                user_id: 'user-1',
                expires_at: new Date('2099-01-01T00:00:00Z'),
              },
            ],
          };
        }

        if (text.includes('UPDATE users')) {
          return { rows: [], rowCount: 1 };
        }

        if (text.includes('UPDATE password_reset_tokens')) {
          return { rows: [], rowCount: 1 };
        }

        throw new Error(`Unexpected query: ${text}`);
      }),
    };

    const authService = new AuthService(db);
    const changed = await authService.completePasswordReset(
      'reset-token-value',
      'DefenderShield!42'
    );

    expect(changed).toEqual({ success: true });
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('password_changed_at = NOW()'),
      expect.any(Array)
    );
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('consumed_at = NOW()'),
      expect.any(Array)
    );
  });

  it('rejects password reset completion when the new password violates policy', async () => {
    const { AuthService } = require('../../core/auth/AuthService');
    const db = {
      query: jest.fn(async (text: string) => {
        if (text.includes('FROM password_reset_tokens')) {
          return {
            rows: [
              {
                token_id: 'reset-1',
                user_id: 'user-1',
                username: 'operator',
                email: 'operator@corp.redteam',
              },
            ],
          };
        }

        if (text.includes('UPDATE users') || text.includes('UPDATE password_reset_tokens')) {
          throw new Error('password reset should not update records for weak passwords');
        }

        throw new Error(`Unexpected query: ${text}`);
      }),
    };

    const authService = new AuthService(db);
    const result = await authService.completePasswordReset('reset-token-value', 'weakpass');

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        errorCode: 'PASSWORD_POLICY_VIOLATION',
      })
    );
    expect(result.details.reasons).toContain(
      'Password must be at least 12 characters long'
    );
  });
});
