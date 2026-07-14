const CURRENT_PASSWORD_HASH =
  '$2b$04$WR6w.oUJLIc4fpR3Emavhetgydae33YJ.cDToGbZqIR8phgiNwX2C';

describe('AuthService password policy', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.ENCRYPTION_KEY = '12345678901234567890123456789012';
    process.env.RUNNER_REGISTRATION_SECRET = 'test-runner-secret';
  });

  it('rejects password change when the new password is too weak', async () => {
    const { AuthService } = require('../../core/auth/AuthService');
    const db = {
      query: jest.fn(async (text: string) => {
        if (text.includes('FROM users') && text.includes('WHERE id = $1')) {
          return {
            rows: [
              {
                id: 'user-1',
                username: 'operator',
                email: 'operator@corp.redteam',
                password_hash: CURRENT_PASSWORD_HASH,
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

        if (text.includes('UPDATE users')) {
          throw new Error('weak passwords must never reach the update statement');
        }

        throw new Error(`Unexpected query: ${text}`);
      }),
    };

    const authService = new AuthService(db);
    const result = await authService.changePassword(
      'user-1',
      'CurrentStrong!42',
      'weakpass'
    );

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

  it('rejects password change when the new password reuses the current password', async () => {
    const { AuthService } = require('../../core/auth/AuthService');
    const db = {
      query: jest.fn(async (text: string) => {
        if (text.includes('FROM users') && text.includes('WHERE id = $1')) {
          return {
            rows: [
              {
                id: 'user-1',
                username: 'operator',
                email: 'operator@corp.redteam',
                password_hash: CURRENT_PASSWORD_HASH,
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

        if (text.includes('UPDATE users')) {
          throw new Error('password reuse must never reach the update statement');
        }

        throw new Error(`Unexpected query: ${text}`);
      }),
    };

    const authService = new AuthService(db);
    const result = await authService.changePassword(
      'user-1',
      'CurrentStrong!42',
      'CurrentStrong!42'
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: false,
        errorCode: 'PASSWORD_REUSE_FORBIDDEN',
      })
    );
  });
});
