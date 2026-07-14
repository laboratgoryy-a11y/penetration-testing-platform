import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import speakeasy from 'speakeasy';
import { config } from '../../config';

export interface MfaSetupResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MfaVerificationResult {
  valid: boolean;
  error?: string;
  usedRecoveryCode?: boolean;
}

interface UserMfaRow {
  mfa_enabled: boolean;
  mfa_secret: string | null;
  mfa_recovery_codes: string[] | null;
}

export class MfaService {
  constructor(private readonly db: Pool) {}

  async setup(userId: string, email: string): Promise<MfaSetupResult> {
    const secret = speakeasy.generateSecret({
      name: `${config.security.mfaIssuer}:${email}`,
      issuer: config.security.mfaIssuer,
    });

    const backupCodes = Array.from({ length: 8 }, () =>
      randomBytes(5).toString('hex').toUpperCase()
    );
    const hashedCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10))
    );

    await this.db.query(
      `UPDATE users
       SET mfa_secret = $1,
           mfa_enabled = false,
           mfa_recovery_codes = $2::jsonb,
           updated_at = NOW()
       WHERE id = $3`,
      [secret.base32, JSON.stringify(hashedCodes), userId]
    );

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url || '',
      backupCodes,
    };
  }

  async enable(userId: string, token: string): Promise<MfaVerificationResult> {
    const verification = await this.verify(userId, token);
    if (!verification.valid) {
      return verification;
    }

    await this.db.query(
      `UPDATE users
       SET mfa_enabled = true,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    return { valid: true };
  }

  async disable(userId: string, token: string): Promise<MfaVerificationResult> {
    const verification = await this.verify(userId, token);
    if (!verification.valid) {
      return verification;
    }

    await this.db.query(
      `UPDATE users
       SET mfa_enabled = false,
           mfa_secret = NULL,
           mfa_recovery_codes = '[]'::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    return { valid: true };
  }

  async verify(userId: string, token: string): Promise<MfaVerificationResult> {
    const result = await this.db.query<UserMfaRow>(
      `SELECT mfa_enabled, mfa_secret, mfa_recovery_codes
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { valid: false, error: 'User not found' };
    }

    const user = result.rows[0];
    if (!user.mfa_secret) {
      return { valid: false, error: 'MFA is not configured for this user' };
    }

    const isTotpValid = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (isTotpValid) {
      return { valid: true };
    }

    const recoveryCodes = user.mfa_recovery_codes || [];
    for (const hashedCode of recoveryCodes) {
      if (await bcrypt.compare(token, hashedCode)) {
        const remainingCodes = recoveryCodes.filter((code) => code !== hashedCode);
        await this.db.query(
          `UPDATE users
           SET mfa_recovery_codes = $1::jsonb,
               updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(remainingCodes), userId]
        );

        return { valid: true, usedRecoveryCode: true };
      }
    }

    return { valid: false, error: 'Invalid MFA token or recovery code' };
  }
}
