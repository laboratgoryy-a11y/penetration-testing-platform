import * as fc from 'fast-check';
import { Pool } from 'pg';
import { AuthenticationService } from '../services/AuthenticationService';
import { UserRepository } from '../repositories/UserRepository';
import { User } from '../models/User';

/**
 * Property-Based Test for Account Lockout
 * 
 * **الخاصية 26: قفل الحساب بعد محاولات فاشلة**
 * **Validates: Requirements 7.5**
 * 
 * This test verifies that:
 * 1. After MAX_FAILED_ATTEMPTS (5) failed login attempts, the account is locked
 * 2. A locked account cannot login even with correct credentials
 * 3. Failed attempts counter increments correctly
 * 4. Successful login resets the failed attempts counter
 */

// Constants from AuthenticationService
const MAX_FAILED_ATTEMPTS = 5;

describe('Property 26: Account Lockout After Failed Attempts', () => {
  let mockDb: Pool;
  let authService: AuthenticationService;
  let userRepository: UserRepository;
  let mockUser: User;
  let mockUserData: any;

  beforeEach(() => {
    // Create mock database
    mockDb = {
      query: jest.fn(),
    } as unknown as Pool;

    authService = new AuthenticationService(mockDb);
    userRepository = new UserRepository(mockDb);

    // Create mock user data
    mockUserData = {
      id: 'test-user-id',
      username: 'testuser',
      email: 'test@example.com',
      password_hash: '',
      mfa_enabled: false,
      mfa_secret: null,
      created_at: new Date(),
      updated_at: new Date(),
      last_login: null,
      account_locked: false,
      failed_login_attempts: 0,
    };

    mockUser = new User({
      id: mockUserData.id,
      username: mockUserData.username,
      email: mockUserData.email,
      passwordHash: mockUserData.password_hash,
      mfaEnabled: mockUserData.mfa_enabled,
      mfaSecret: mockUserData.mfa_secret,
      createdAt: mockUserData.created_at,
      updatedAt: mockUserData.updated_at,
      lastLogin: mockUserData.last_login,
      accountLocked: mockUserData.account_locked,
      failedLoginAttempts: mockUserData.failed_login_attempts,
    });
  });

  /**
   * Property: Account is locked after exactly MAX_FAILED_ATTEMPTS failed login attempts
   */
  test('property: account locks after MAX_FAILED_ATTEMPTS consecutive failed logins', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }), // username
        fc.string({ minLength: 8, maxLength: 30 }), // correct password
        fc.string({ minLength: 8, maxLength: 30 }), // wrong password
        async (username, correctPassword, wrongPassword) => {
          // Ensure wrong password is different from correct password
          fc.pre(correctPassword !== wrongPassword);

          // Setup: Create user with correct password hash
          const passwordHash = await authService.hashPassword(correctPassword);
          let currentFailedAttempts = 0;
          let isAccountLocked = false;

          // Mock findByUsername to return user
          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('SELECT') && query.includes('FROM users')) {
              return Promise.resolve({
                rows: [
                  {
                    ...mockUserData,
                    username,
                    password_hash: passwordHash,
                    account_locked: isAccountLocked,
                    failed_login_attempts: currentFailedAttempts,
                  },
                ],
              });
            }
            // Mock incrementFailedLoginAttempts
            if (query.includes('failed_login_attempts = failed_login_attempts + 1')) {
              currentFailedAttempts++;
              return Promise.resolve({
                rows: [{ failed_login_attempts: currentFailedAttempts }],
              });
            }
            // Mock lockAccount
            if (query.includes('account_locked')) {
              isAccountLocked = true;
              return Promise.resolve({ rows: [] });
            }
            return Promise.resolve({ rows: [] });
          });

          // Attempt MAX_FAILED_ATTEMPTS failed logins
          for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
            const result = await authService.login({
              username,
              password: wrongPassword,
            });

            // Before reaching max attempts, login should fail but not lock
            if (i < MAX_FAILED_ATTEMPTS - 1) {
              expect(result.success).toBe(false);
              expect(isAccountLocked).toBe(false);
            }
          }

          // After MAX_FAILED_ATTEMPTS, account should be locked
          expect(isAccountLocked).toBe(true);
          expect(currentFailedAttempts).toBe(MAX_FAILED_ATTEMPTS);

          // Try to login with correct password - should fail because account is locked
          const lockedLoginResult = await authService.login({
            username,
            password: correctPassword,
          });

          expect(lockedLoginResult.success).toBe(false);
          expect(lockedLoginResult.error).toContain('locked');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Failed attempts counter increments correctly for each failed login
   */
  test('property: failed attempts counter increments by 1 for each failed login', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: MAX_FAILED_ATTEMPTS - 1 }), // number of failed attempts
        fc.string({ minLength: 5, maxLength: 20 }), // username
        fc.string({ minLength: 8, maxLength: 30 }), // correct password
        fc.string({ minLength: 8, maxLength: 30 }), // wrong password
        async (numAttempts, username, correctPassword, wrongPassword) => {
          fc.pre(correctPassword !== wrongPassword);

          const passwordHash = await authService.hashPassword(correctPassword);
          let currentFailedAttempts = 0;

          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('SELECT') && query.includes('FROM users')) {
              return Promise.resolve({
                rows: [
                  {
                    ...mockUserData,
                    username,
                    password_hash: passwordHash,
                    account_locked: false,
                    failed_login_attempts: currentFailedAttempts,
                  },
                ],
              });
            }
            if (query.includes('failed_login_attempts = failed_login_attempts + 1')) {
              currentFailedAttempts++;
              return Promise.resolve({
                rows: [{ failed_login_attempts: currentFailedAttempts }],
              });
            }
            return Promise.resolve({ rows: [] });
          });

          // Perform numAttempts failed logins
          for (let i = 0; i < numAttempts; i++) {
            await authService.login({
              username,
              password: wrongPassword,
            });
          }

          // Verify counter incremented correctly
          expect(currentFailedAttempts).toBe(numAttempts);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Successful login resets failed attempts counter
   */
  test('property: successful login resets failed attempts counter to 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: MAX_FAILED_ATTEMPTS - 1 }), // initial failed attempts
        fc.string({ minLength: 5, maxLength: 20 }), // username
        fc.string({ minLength: 8, maxLength: 30 }), // password
        async (initialFailedAttempts, username, password) => {
          const passwordHash = await authService.hashPassword(password);
          let currentFailedAttempts = initialFailedAttempts;
          let wasResetCalled = false;

          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('SELECT') && query.includes('FROM users')) {
              return Promise.resolve({
                rows: [
                  {
                    ...mockUserData,
                    username,
                    password_hash: passwordHash,
                    account_locked: false,
                    failed_login_attempts: currentFailedAttempts,
                  },
                ],
              });
            }
            // Mock resetFailedLoginAttempts
            if (query.includes('failed_login_attempts = 0')) {
              currentFailedAttempts = 0;
              wasResetCalled = true;
              return Promise.resolve({ rows: [] });
            }
            // Mock update last_login
            if (query.includes('last_login')) {
              return Promise.resolve({ rows: [] });
            }
            return Promise.resolve({ rows: [] });
          });

          // Successful login
          const result = await authService.login({
            username,
            password,
          });

          // Verify login succeeded and counter was reset
          expect(result.success).toBe(true);
          expect(wasResetCalled).toBe(true);
          expect(currentFailedAttempts).toBe(0);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Locked account cannot login even with correct credentials
   */
  test('property: locked account rejects login with correct password', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }), // username
        fc.string({ minLength: 8, maxLength: 30 }), // password
        async (username, password) => {
          const passwordHash = await authService.hashPassword(password);

          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('SELECT') && query.includes('FROM users')) {
              return Promise.resolve({
                rows: [
                  {
                    ...mockUserData,
                    username,
                    password_hash: passwordHash,
                    account_locked: true, // Account is locked
                    failed_login_attempts: MAX_FAILED_ATTEMPTS,
                  },
                ],
              });
            }
            return Promise.resolve({ rows: [] });
          });

          // Try to login with correct password
          const result = await authService.login({
            username,
            password,
          });

          // Login should fail because account is locked
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error?.toLowerCase()).toContain('locked');

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Account lockout is idempotent - multiple failed attempts beyond MAX don't change state
   */
  test('property: failed attempts beyond MAX_FAILED_ATTEMPTS keep account locked', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }), // extra attempts beyond max
        fc.string({ minLength: 5, maxLength: 20 }), // username
        fc.string({ minLength: 8, maxLength: 30 }), // correct password
        fc.string({ minLength: 8, maxLength: 30 }), // wrong password
        async (extraAttempts, username, correctPassword, wrongPassword) => {
          fc.pre(correctPassword !== wrongPassword);

          const passwordHash = await authService.hashPassword(correctPassword);
          let isAccountLocked = true; // Already locked
          let currentFailedAttempts = MAX_FAILED_ATTEMPTS;

          (mockDb.query as jest.Mock).mockImplementation((query: string) => {
            if (query.includes('SELECT') && query.includes('FROM users')) {
              return Promise.resolve({
                rows: [
                  {
                    ...mockUserData,
                    username,
                    password_hash: passwordHash,
                    account_locked: isAccountLocked,
                    failed_login_attempts: currentFailedAttempts,
                  },
                ],
              });
            }
            return Promise.resolve({ rows: [] });
          });

          // Try additional failed logins on already locked account
          for (let i = 0; i < extraAttempts; i++) {
            const result = await authService.login({
              username,
              password: wrongPassword,
            });

            // Should still be locked
            expect(result.success).toBe(false);
            expect(result.error?.toLowerCase()).toContain('locked');
          }

          // Account should remain locked
          expect(isAccountLocked).toBe(true);

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
