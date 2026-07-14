import { Pool } from 'pg';
import { AuthorizationRecord, AuthorizationScope, OperationType } from '../types';
import {
  cidrToRange,
  isIPInRange,
  isValidCIDR,
  isValidIP,
  isValidIPRange,
} from '../../utils/ipScannerHelpers';

interface AuthorizationRow {
  id: string;
  user_id: string;
  organization_name: string;
  scope: AuthorizationScope;
  valid_from: Date;
  valid_until: Date;
  signed_by: string;
  digital_signature: string;
  allowed_operations: OperationType[];
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  created_at: Date;
  revoked_at: Date | null;
  revocation_reason: string | null;
}

export class AuthorizationDomainService {
  constructor(private readonly db: Pool) {}

  async createAuthorization(input: {
    userId: string;
    organizationName: string;
    scope: AuthorizationScope;
    validFrom: Date;
    validUntil: Date;
    signedBy: string;
    digitalSignature: string;
    allowedOperations: OperationType[];
    document?: {
      fileName: string;
      contentType: string;
      sizeBytes: number;
      objectKey: string;
    };
  }): Promise<AuthorizationRecord> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const created = await client.query<AuthorizationRow>(
        `INSERT INTO authorizations (
           user_id,
           organization_name,
           scope,
           valid_from,
           valid_until,
           signed_by,
           digital_signature,
           allowed_operations,
           status
         ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8::text[], 'ACTIVE')
         RETURNING id, user_id, organization_name, scope, valid_from, valid_until,
                   signed_by, digital_signature, allowed_operations, status,
                   created_at, revoked_at, revocation_reason`,
        [
          input.userId,
          input.organizationName,
          JSON.stringify(input.scope || {}),
          input.validFrom,
          input.validUntil,
          input.signedBy,
          input.digitalSignature,
          input.allowedOperations,
        ]
      );

      if (input.document) {
        await client.query(
          `INSERT INTO authorization_documents (
             authorization_id,
             file_name,
             content_type,
             size_bytes,
             object_key
           ) VALUES ($1, $2, $3, $4, $5)`,
          [
            created.rows[0].id,
            input.document.fileName,
            input.document.contentType,
            input.document.sizeBytes,
            input.document.objectKey,
          ]
        );
      }

      await client.query('COMMIT');
      return this.mapRecord(created.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async listAuthorizations(userId: string): Promise<AuthorizationRecord[]> {
    const result = await this.db.query<AuthorizationRow>(
      `SELECT id, user_id, organization_name, scope, valid_from, valid_until,
              signed_by, digital_signature, allowed_operations, status, created_at,
              revoked_at, revocation_reason
       FROM authorizations
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows.map((row) => this.mapRecord(row));
  }

  async getAuthorization(
    authorizationId: string,
    userId?: string
  ): Promise<AuthorizationRecord | null> {
    const params = userId ? [authorizationId, userId] : [authorizationId];
    const result = await this.db.query<AuthorizationRow>(
      `SELECT id, user_id, organization_name, scope, valid_from, valid_until,
              signed_by, digital_signature, allowed_operations, status, created_at,
              revoked_at, revocation_reason
       FROM authorizations
       WHERE id = $1
       ${userId ? 'AND user_id = $2' : ''}`,
      params
    );

    return result.rows[0] ? this.mapRecord(result.rows[0]) : null;
  }

  async revokeAuthorization(
    authorizationId: string,
    reason: string
  ): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE authorizations
       SET status = 'REVOKED',
           revoked_at = NOW(),
           revocation_reason = $2
       WHERE id = $1`,
      [authorizationId, reason]
    );

    return (result.rowCount || 0) > 0;
  }

  async validateAuthorization(
    authorizationId: string,
    operationType: OperationType,
    target: unknown
  ): Promise<{ valid: boolean; reason?: string }> {
    const authorization = await this.getAuthorization(authorizationId);
    if (!authorization) {
      return { valid: false, reason: 'Authorization not found' };
    }

    if (authorization.status !== 'ACTIVE') {
      return { valid: false, reason: 'Authorization is not active' };
    }

    const now = Date.now();
    if (
      authorization.validFrom.getTime() > now ||
      authorization.validUntil.getTime() < now
    ) {
      return { valid: false, reason: 'Authorization is outside its validity window' };
    }

    if (!authorization.allowedOperations.includes(operationType)) {
      return {
        valid: false,
        reason: `Operation ${operationType} is not allowed by this authorization`,
      };
    }

    if (!this.isTargetInScope(authorization.scope, target)) {
      return { valid: false, reason: 'Target is outside the authorized scope' };
    }

    return { valid: true };
  }

  private isTargetInScope(scope: AuthorizationScope, target: unknown): boolean {
    const normalized = this.normalizeTarget(target);
    if (!normalized) {
      return false;
    }

    if (normalized.kind === 'domain') {
      return (scope.domains || []).some((domain) => {
        const candidate = domain.toLowerCase();
        return (
          normalized.value === candidate ||
          normalized.value.endsWith(`.${candidate}`)
        );
      });
    }

    if (normalized.kind === 'email') {
      const [, domain = ''] = normalized.value.split('@');
      return (scope.emailDomains || []).some(
        (emailDomain) => domain.toLowerCase() === emailDomain.toLowerCase()
      );
    }

    if (normalized.kind === 'ip') {
      return (scope.ipRanges || []).some((ipRange) => {
        if (isValidIPRange(ipRange)) {
          return isIPInRange(normalized.value, ipRange);
        }
        if (isValidCIDR(ipRange)) {
          const convertedRange = cidrToRange(ipRange);
          return isIPInRange(
            normalized.value,
            `${convertedRange.start}-${convertedRange.end}`
          );
        }
        return false;
      });
    }

    if (normalized.kind === 'network') {
      return (scope.networks || []).some((network) => {
        if (network.bssid && normalized.bssid) {
          return network.bssid.toLowerCase() === normalized.bssid.toLowerCase();
        }
        if (network.ssid && normalized.ssid) {
          return network.ssid === normalized.ssid;
        }
        return false;
      });
    }

    return false;
  }

  private normalizeTarget(
    target: unknown
  ):
    | { kind: 'domain'; value: string }
    | { kind: 'email'; value: string }
    | { kind: 'ip'; value: string }
    | { kind: 'network'; ssid?: string; bssid?: string }
    | null {
    if (typeof target === 'string') {
      if (target.includes('@')) {
        return { kind: 'email', value: target.toLowerCase() };
      }
      if (isValidIP(target)) {
        return { kind: 'ip', value: target };
      }
      try {
        const parsed = new URL(target);
        return { kind: 'domain', value: parsed.hostname.toLowerCase() };
      } catch {
        return { kind: 'domain', value: target.toLowerCase() };
      }
    }

    if (typeof target === 'object' && target !== null) {
      const record = target as Record<string, unknown>;
      if (typeof record.url === 'string') {
        try {
          const parsed = new URL(record.url);
          return { kind: 'domain', value: parsed.hostname.toLowerCase() };
        } catch {
          return { kind: 'domain', value: record.url.toLowerCase() };
        }
      }
      if (typeof record.ip === 'string' && isValidIP(record.ip)) {
        return { kind: 'ip', value: record.ip };
      }
      if (typeof record.value === 'string') {
        return this.normalizeTarget(record.value);
      }
      if (typeof record.ssid === 'string' || typeof record.bssid === 'string') {
        return {
          kind: 'network',
          ssid: typeof record.ssid === 'string' ? record.ssid : undefined,
          bssid: typeof record.bssid === 'string' ? record.bssid : undefined,
        };
      }
    }

    return null;
  }

  private mapRecord(row: AuthorizationRow): AuthorizationRecord {
    return {
      id: row.id,
      userId: row.user_id,
      organizationName: row.organization_name,
      scope: row.scope || {},
      validFrom: new Date(row.valid_from),
      validUntil: new Date(row.valid_until),
      signedBy: row.signed_by,
      digitalSignature: row.digital_signature,
      allowedOperations: row.allowed_operations || [],
      status: row.status,
      createdAt: new Date(row.created_at),
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
      revocationReason: row.revocation_reason,
    };
  }
}
