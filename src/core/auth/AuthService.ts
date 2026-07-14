import { createHash, randomBytes, randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { Pool } from 'pg';
import { config } from '../../config';
import { getRedisClient } from '../../database/connection';
import { AuthTokenSet, TokenValidation } from '../types';
import { AccessControlService } from './AccessControlService';
import { MfaService } from './MfaService';
import {
  PasswordPolicyContext,
  validatePasswordStrength,
} from './passwordPolicy';

const SALT_ROUNDS = 12;

interface UserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  password_changed_at: Date;
  mfa_enabled: boolean;
  account_locked: boolean;
  failed_login_attempts: number;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

interface PasswordResetTokenRow {
  token_id: string;
  user_id: string;
  username?: string;
  email?: string;
}

interface PasswordResetRequestRow {
  created_at: Date;
}

export interface PasswordOperationResult {
  success: boolean;
  errorCode?:
    | 'CURRENT_PASSWORD_INVALID'
    | 'PASSWORD_POLICY_VIOLATION'
    | 'PASSWORD_REUSE_FORBIDDEN'
    | 'PASSWORD_RESET_FAILED';
  error?: string;
  details?: {
    reasons?: string[];
  };
}

export interface LoginResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  authTokens?: AuthTokenSet;
  user?: {
    id: string;
    username: string;
    email: string;
    mfaEnabled: boolean;
    roles: string[];
    createdAt: Date;
    lastLogin: Date | null;
  };
  session?: {
    accessTokenExpiresAt: string;
    refreshTokenExpiresAt: string;
  };
  requiresMFA?: boolean;
  error?: string;
}

function parseExpiryToSeconds(expiry: string): number {
  const matched = expiry.match(/^(\d+)([smhd])$/i);
  if (!matched) {
    throw new Error(`Unsupported expiry format: ${expiry}`);
  }

  const amount = parseInt(matched[1], 10);
  const unit = matched[2].toLowerCase();

  switch (unit) {
    case 's':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 60 * 60 * 24;
    default:
      throw new Error(`Unsupported expiry unit: ${unit}`);
  }
}

export class AuthService {
  private readonly accessControlService: AccessControlService;
  private readonly mfaService: MfaService;

  constructor(private readonly db: Pool) {
    this.accessControlService = new AccessControlService(db);
    this.mfaService = new MfaService(db);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  async login(input: {
    username: string;
    password: string;
    mfaToken?: string;
  }): Promise<LoginResult> {
    const user = await this.getUserByUsername(input.username);
    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    if (user.account_locked) {
      return {
        success: false,
        error: 'Account is locked. Please contact an administrator.',
      };
    }

    const passwordValid = await bcrypt.compare(input.password, user.password_hash);
    if (!passwordValid) {
      const failedAttempts = user.failed_login_attempts + 1;
      await this.db.query(
        `UPDATE users
         SET failed_login_attempts = $1,
             account_locked = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [
          failedAttempts,
          failedAttempts >= config.security.failedLoginAttemptsLimit,
          user.id,
        ]
      );

      return {
        success: false,
        error:
          failedAttempts >= config.security.failedLoginAttemptsLimit
            ? 'Account locked due to too many failed attempts'
            : 'Invalid username or password',
      };
    }

    if (user.mfa_enabled) {
      if (!input.mfaToken) {
        return {
          success: false,
          requiresMFA: true,
          error: 'MFA token required',
        };
      }

      const verification = await this.mfaService.verify(user.id, input.mfaToken);
      if (!verification.valid) {
        return {
          success: false,
          requiresMFA: true,
          error: verification.error || 'Invalid MFA token',
        };
      }
    }

    await this.db.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           last_login = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    const roles = await this.accessControlService.getUserRoles(user.id);
    const tokens = this.issueTokens(user.id, user.username, roles);

    return {
      success: true,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      authTokens: tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        mfaEnabled: user.mfa_enabled,
        roles,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
      session: {
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
      },
    };
  }

  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    await this.revokeToken(accessToken);
    if (refreshToken) {
      await this.revokeToken(refreshToken);
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<LoginResult | null> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as {
        sub: string;
        username: string;
        jti: string;
        roles: string[];
        type: string;
        iat?: number;
      };

      if (decoded.type !== 'refresh') {
        return null;
      }

      if (await this.isTokenRevoked(decoded.jti)) {
        return null;
      }

      const user = await this.getUserById(decoded.sub);
      if (!user || user.account_locked) {
        return null;
      }

      if (!this.isTokenIssuedAfterPasswordChange(decoded.iat, user.password_changed_at)) {
        return null;
      }

      const roles = await this.accessControlService.getUserRoles(user.id);
      const tokens = this.issueTokens(user.id, user.username, roles);

      await this.revokeToken(refreshToken);

      return {
        success: true,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        authTokens: tokens,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          mfaEnabled: user.mfa_enabled,
          roles,
          createdAt: user.created_at,
          lastLogin: user.last_login,
        },
        session: {
          accessTokenExpiresAt: tokens.accessTokenExpiresAt,
          refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        },
      };
    } catch {
      return null;
    }
  }

  async validateToken(token: string): Promise<TokenValidation> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        sub: string;
        username: string;
        jti: string;
        exp: number;
        type: string;
        iat?: number;
      };

      if (decoded.type !== 'access' || (await this.isTokenRevoked(decoded.jti))) {
        return { valid: false };
      }

      const user = await this.getUserById(decoded.sub);
      if (!user || user.account_locked) {
        return { valid: false };
      }

      if (!this.isTokenIssuedAfterPasswordChange(decoded.iat, user.password_changed_at)) {
        return { valid: false };
      }

      const roles = await this.accessControlService.getUserRoles(user.id);
      return {
        valid: true,
        userId: user.id,
        username: user.username,
        roles,
        expiresAt: new Date(decoded.exp * 1000),
        jti: decoded.jti,
      };
    } catch {
      return { valid: false };
    }
  }

  async getUserByToken(token: string): Promise<LoginResult['user'] | null> {
    const validation = await this.validateToken(token);
    if (!validation.valid || !validation.userId) {
      return null;
    }

    const user = await this.getUserById(validation.userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      mfaEnabled: user.mfa_enabled,
      roles: validation.roles || [],
      createdAt: user.created_at,
      lastLogin: user.last_login,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<PasswordOperationResult> {
    const user = await this.getUserById(userId);
    if (!user) {
      return {
        success: false,
        errorCode: 'CURRENT_PASSWORD_INVALID',
        error: 'Current password is invalid',
      };
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );
    if (!isCurrentPasswordValid) {
      return {
        success: false,
        errorCode: 'CURRENT_PASSWORD_INVALID',
        error: 'Current password is invalid',
      };
    }

    const isPasswordReused = await bcrypt.compare(newPassword, user.password_hash);
    if (isPasswordReused) {
      return {
        success: false,
        errorCode: 'PASSWORD_REUSE_FORBIDDEN',
        error: 'New password must differ from the current password',
      };
    }

    const passwordPolicyError = this.validatePasswordPolicy(newPassword, {
      username: user.username,
      email: user.email,
    });
    if (passwordPolicyError) {
      return passwordPolicyError;
    }

    const newPasswordHash = await this.hashPassword(newPassword);
    await this.db.query(
      `UPDATE users
       SET password_hash = $1,
           password_changed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, userId]
    );

    return { success: true };
  }

  async resetPassword(
    userId: string,
    newPassword: string
  ): Promise<PasswordOperationResult> {
    const user = await this.getUserById(userId);
    if (!user) {
      return {
        success: false,
        errorCode: 'PASSWORD_RESET_FAILED',
        error: 'Password reset target user was not found',
      };
    }

    const passwordPolicyError = this.validatePasswordPolicy(newPassword, {
      username: user.username,
      email: user.email,
    });
    if (passwordPolicyError) {
      return passwordPolicyError;
    }

    const newPasswordHash = await this.hashPassword(newPassword);
    await this.db.query(
      `UPDATE users
       SET password_hash = $1,
           password_changed_at = NOW(),
           account_locked = false,
           failed_login_attempts = 0,
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, userId]
    );

    return { success: true };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    const user = await this.getUserByEmail(normalizedEmail);
    if (!user) {
      return;
    }

    const cooldownResult = await this.db.query<PasswordResetRequestRow>(
      `SELECT created_at
       FROM password_reset_tokens
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id]
    );
    const latestRequest = cooldownResult.rows[0];
    if (latestRequest) {
      const createdAt = new Date(latestRequest.created_at);
      const cooldownMs =
        config.security.passwordResetCooldownMinutes * 60 * 1000;
      if (createdAt.getTime() + cooldownMs > Date.now()) {
        return;
      }
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashPasswordResetToken(token);
    const expiresAt = new Date(
      Date.now() + config.security.passwordResetTtlMinutes * 60 * 1000
    );

    await this.db.query(
      `UPDATE password_reset_tokens
       SET consumed_at = NOW()
       WHERE user_id = $1
         AND consumed_at IS NULL`,
      [user.id]
    );

    const insertResult = await this.db.query<{ id: string }>(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [user.id, tokenHash, expiresAt]
    );

    const tokenId = insertResult.rows[0]?.id;

    try {
      await this.sendPasswordResetEmail(user.email, user.username, token);
    } catch (error) {
      if (tokenId) {
        await this.db.query(`DELETE FROM password_reset_tokens WHERE id = $1`, [tokenId]);
      }
      throw error;
    }
  }

  async completePasswordReset(
    token: string,
    newPassword: string
  ): Promise<PasswordOperationResult> {
    if (!token.trim()) {
      return {
        success: false,
        errorCode: 'PASSWORD_RESET_FAILED',
        error: 'Password reset token is invalid or has expired',
      };
    }

    const tokenHash = this.hashPasswordResetToken(token);
    const result = await this.db.query<PasswordResetTokenRow>(
      `SELECT prt.id AS token_id,
              prt.user_id,
              u.username,
              u.email
       FROM password_reset_tokens prt
       INNER JOIN users u
         ON u.id = prt.user_id
       WHERE token_hash = $1
         AND prt.consumed_at IS NULL
         AND prt.expires_at > NOW()`,
      [tokenHash]
    );

    const resetToken = result.rows[0];
    if (!resetToken) {
      return {
        success: false,
        errorCode: 'PASSWORD_RESET_FAILED',
        error: 'Password reset token is invalid or has expired',
      };
    }

    const passwordPolicyError = this.validatePasswordPolicy(newPassword, {
      username: resetToken.username,
      email: resetToken.email,
    });
    if (passwordPolicyError) {
      return passwordPolicyError;
    }

    const newPasswordHash = await this.hashPassword(newPassword);
    await this.db.query(
      `UPDATE users
       SET password_hash = $1,
           password_changed_at = NOW(),
           account_locked = false,
           failed_login_attempts = 0,
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, resetToken.user_id]
    );
    await this.db.query(
      `UPDATE password_reset_tokens
       SET consumed_at = NOW()
       WHERE user_id = $1
        AND consumed_at IS NULL`,
      [resetToken.user_id]
    );

    return { success: true };
  }

  async getUserById(userId: string): Promise<UserRow | null> {
    const result = await this.db.query<UserRow>(
      `SELECT id, username, email, password_hash, password_changed_at, mfa_enabled, account_locked,
              failed_login_attempts, created_at, updated_at, last_login
       FROM users
       WHERE id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  }

  async getUserByUsername(username: string): Promise<UserRow | null> {
    const result = await this.db.query<UserRow>(
      `SELECT id, username, email, password_hash, password_changed_at, mfa_enabled, account_locked,
              failed_login_attempts, created_at, updated_at, last_login
       FROM users
       WHERE LOWER(username) = LOWER($1)`,
      [username]
    );

    return result.rows[0] || null;
  }

  async getUserByEmail(email: string): Promise<UserRow | null> {
    const result = await this.db.query<UserRow>(
      `SELECT id, username, email, password_hash, password_changed_at, mfa_enabled, account_locked,
              failed_login_attempts, created_at, updated_at, last_login
       FROM users
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    return result.rows[0] || null;
  }

  private issueTokens(
    userId: string,
    username: string,
    roles: string[]
  ): AuthTokenSet {
    const accessTokenTtlSeconds = parseExpiryToSeconds(config.jwt.expiresIn);
    const refreshTokenTtlSeconds = parseExpiryToSeconds(
      config.jwt.refreshExpiresIn
    );
    const accessJti = randomUUID();
    const refreshJti = randomUUID();

    const accessToken = jwt.sign(
      {
        sub: userId,
        username,
        roles,
        type: 'access',
        jti: accessJti,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );

    const refreshToken = jwt.sign(
      {
        sub: userId,
        username,
        roles,
        type: 'refresh',
        jti: refreshJti,
      },
      config.jwt.refreshSecret,
      {
        expiresIn:
          config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
      }
    );

    const accessTokenExpiresAt = new Date(
      Date.now() + accessTokenTtlSeconds * 1000
    ).toISOString();
    const refreshTokenExpiresAt = new Date(
      Date.now() + refreshTokenTtlSeconds * 1000
    ).toISOString();

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenTtlSeconds,
      refreshExpiresIn: refreshTokenTtlSeconds,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  private async revokeToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as { exp?: number; jti?: string } | null;
      if (!decoded?.jti || !decoded.exp) {
        return;
      }

      const ttlSeconds = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
      const redis = await getRedisClient();
      await redis.set(`revoked-token:${decoded.jti}`, '1', {
        EX: ttlSeconds,
      });
    } catch {
      return;
    }
  }

  private async isTokenRevoked(jti: string): Promise<boolean> {
    const redis = await getRedisClient();
    return (await redis.get(`revoked-token:${jti}`)) === '1';
  }

  private isTokenIssuedAfterPasswordChange(
    issuedAtSeconds: number | undefined,
    passwordChangedAt: Date
  ): boolean {
    if (!issuedAtSeconds) {
      return false;
    }

    return issuedAtSeconds * 1000 >= passwordChangedAt.getTime();
  }

  private hashPasswordResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private validatePasswordPolicy(
    password: string,
    context: PasswordPolicyContext
  ): PasswordOperationResult | null {
    const validation = validatePasswordStrength(password, context);
    if (validation.valid) {
      return null;
    }

    return {
      success: false,
      errorCode: 'PASSWORD_POLICY_VIOLATION',
      error: 'Password does not meet the security policy',
      details: {
        reasons: validation.reasons,
      },
    };
  }

  private async sendPasswordResetEmail(
    email: string,
    username: string,
    token: string
  ): Promise<void> {
    if (!config.email.smtp.host || !config.email.defaultFrom.email) {
      throw new Error('Password reset email delivery is not configured');
    }

    const transporter = nodemailer.createTransport({
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
      auth:
        config.email.smtp.auth.user && config.email.smtp.auth.pass
          ? {
              user: config.email.smtp.auth.user,
              pass: config.email.smtp.auth.pass,
            }
          : undefined,
    });

    const resetUrl = new URL(config.security.passwordResetUrl);
    resetUrl.searchParams.set('token', token);

    await transporter.sendMail({
      from: `"${config.email.defaultFrom.name}" <${config.email.defaultFrom.email}>`,
      to: email,
      subject: 'Password Reset Request',
      text: [
        `Hello ${username},`,
        '',
        'A password reset was requested for your account.',
        `Reset URL: ${resetUrl.toString()}`,
        `This link expires in ${config.security.passwordResetTtlMinutes} minutes.`,
      ].join('\n'),
      html: [
        `<p>Hello ${username},</p>`,
        '<p>A password reset was requested for your account.</p>',
        `<p><a href="${resetUrl.toString()}">Reset your password</a></p>`,
        `<p>This link expires in ${config.security.passwordResetTtlMinutes} minutes.</p>`,
      ].join(''),
    });
  }
}
