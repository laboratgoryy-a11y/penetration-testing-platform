import { createHash, randomBytes } from 'crypto';
import { Pool } from 'pg';
import { config } from '../../config';
import { RunnerManifest } from '../types';

interface RunnerRow {
  id: string;
  runner_name: string;
  os: 'windows' | 'linux' | 'macos';
  arch: string;
  token_hash: string;
  status: 'active' | 'disabled';
  manifest: Record<string, unknown>;
  last_heartbeat_at: Date | null;
}

export class RunnerService {
  constructor(private readonly db: Pool) {}

  async registerRunner(
    registrationSecret: string,
    manifest: RunnerManifest
  ): Promise<{ runnerId: string; token: string }> {
    if (registrationSecret !== config.runner.registrationSecret) {
      throw new Error('Invalid runner registration secret');
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');
      const created = await client.query<RunnerRow>(
        `INSERT INTO runner_registrations (
           runner_name,
           os,
           arch,
           token_hash,
           status,
           manifest,
           last_heartbeat_at
         ) VALUES ($1, $2, $3, $4, 'active', $5::jsonb, NOW())
         RETURNING *`,
        [
          manifest.runnerName,
          manifest.os,
          manifest.arch,
          tokenHash,
          JSON.stringify({
            capabilities: manifest.capabilities,
            tools: manifest.tools,
            metadata: manifest.metadata || {},
          }),
        ]
      );

      for (const capability of manifest.capabilities) {
        await client.query(
          `INSERT INTO runner_capabilities (runner_id, capability, metadata)
           VALUES ($1, $2, '{}'::jsonb)`,
          [created.rows[0].id, capability]
        );
      }

      await client.query('COMMIT');
      return { runnerId: created.rows[0].id, token };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async authenticateRunner(token: string): Promise<(RunnerManifest & { runnerId: string }) | null> {
    const tokenHash = this.hashToken(token);
    const result = await this.db.query<RunnerRow>(
      `SELECT *
       FROM runner_registrations
       WHERE token_hash = $1
         AND status = 'active'`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const runner = result.rows[0];
    const manifest = runner.manifest || {};
    return {
      runnerId: runner.id,
      runnerName: runner.runner_name,
      os: runner.os,
      arch: runner.arch,
      capabilities: Array.isArray(manifest.capabilities)
        ? (manifest.capabilities as string[])
        : [],
      tools: Array.isArray(manifest.tools) ? (manifest.tools as string[]) : [],
      metadata:
        typeof manifest.metadata === 'object' && manifest.metadata !== null
          ? (manifest.metadata as Record<string, unknown>)
          : {},
    };
  }

  async heartbeat(
    runnerId: string,
    manifest: RunnerManifest,
    systemLoad?: Record<string, unknown>
  ): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE runner_registrations
         SET runner_name = $2,
             os = $3,
             arch = $4,
             manifest = $5::jsonb,
             last_heartbeat_at = NOW()
         WHERE id = $1`,
        [
          runnerId,
          manifest.runnerName,
          manifest.os,
          manifest.arch,
          JSON.stringify({
            capabilities: manifest.capabilities,
            tools: manifest.tools,
            metadata: manifest.metadata || {},
          }),
        ]
      );

      await client.query(
        `DELETE FROM runner_capabilities
         WHERE runner_id = $1`,
        [runnerId]
      );

      for (const capability of manifest.capabilities) {
        await client.query(
          `INSERT INTO runner_capabilities (runner_id, capability, metadata)
           VALUES ($1, $2, '{}'::jsonb)`,
          [runnerId, capability]
        );
      }

      await client.query(
        `INSERT INTO runner_heartbeats (runner_id, manifest, system_load)
         VALUES ($1, $2::jsonb, $3::jsonb)`,
        [runnerId, JSON.stringify(manifest), JSON.stringify(systemLoad || {})]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
