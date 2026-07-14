import { Pool } from 'pg';
import { assertValidJobTransition } from './jobLifecycle';
import { getUnsupportedReason, supportsJob } from '../runners/capabilityMatcher';
import { JobRecord, JobStatus, JobType, RunnerManifest } from '../types';

interface JobRow {
  id: string;
  job_type: JobType;
  status: JobStatus;
  requested_by: string;
  authorization_id: string | null;
  target_type: string | null;
  target_value: string | null;
  payload: Record<string, unknown>;
  required_os: 'windows' | 'linux' | 'macos' | null;
  required_capabilities: string[] | null;
  required_tools: string[] | null;
  runner_id: string | null;
  error_code: string | null;
  error_message: string | null;
  result_summary: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  claimed_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
}

interface JobLogRow {
  id: string;
  job_id: string;
  runner_id: string | null;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

interface JobArtifactRow {
  id: string;
  artifact_type: string;
  file_name: string;
  object_key: string;
  size_bytes: number;
  content_type: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

export class JobService {
  constructor(private readonly db: Pool) {}

  async createJob(input: {
    jobType: JobType;
    requestedBy: string;
    authorizationId?: string | null;
    targetType?: string | null;
    targetValue?: string | null;
    payload: Record<string, unknown>;
    requiredOs?: 'windows' | 'linux' | 'macos' | null;
    requiredCapabilities?: string[];
    requiredTools?: string[];
  }): Promise<JobRecord> {
    const result = await this.db.query<JobRow>(
      `INSERT INTO jobs (
         job_type,
         status,
         requested_by,
         authorization_id,
         target_type,
         target_value,
         payload,
         required_os,
         required_capabilities,
         required_tools
       ) VALUES ($1, 'queued', $2, $3, $4, $5, $6::jsonb, $7, $8::text[], $9::text[])
       RETURNING *`,
      [
        input.jobType,
        input.requestedBy,
        input.authorizationId || null,
        input.targetType || null,
        input.targetValue || null,
        JSON.stringify(input.payload),
        input.requiredOs || null,
        input.requiredCapabilities || [],
        input.requiredTools || [],
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  async listJobsForUser(
    userId: string,
    jobType?: JobType
  ): Promise<JobRecord[]> {
    const result = await this.db.query<JobRow>(
      `SELECT *
       FROM jobs
       WHERE requested_by = $1
       ${jobType ? 'AND job_type = $2' : ''}
       ORDER BY created_at DESC`,
      jobType ? [userId, jobType] : [userId]
    );

    return result.rows.map((row) => this.mapRow(row));
  }

  async getJobForUser(userId: string, jobId: string): Promise<JobRecord | null> {
    const result = await this.db.query<JobRow>(
      `SELECT *
       FROM jobs
       WHERE id = $1
         AND requested_by = $2`,
      [jobId, userId]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async getJobById(jobId: string): Promise<JobRecord | null> {
    const result = await this.db.query<JobRow>(
      `SELECT *
       FROM jobs
       WHERE id = $1`,
      [jobId]
    );

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async cancelJob(userId: string, jobId: string): Promise<JobRecord | null> {
    const currentJob = await this.getJobForUser(userId, jobId);
    if (!currentJob) {
      return null;
    }

    assertValidJobTransition(currentJob.status, 'cancelled');

    const result = await this.db.query<JobRow>(
      `UPDATE jobs
       SET status = 'cancelled',
           cancelled_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [jobId]
    );

    return this.mapRow(result.rows[0]);
  }

  async deleteJobForUser(userId: string, jobId: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM jobs
       WHERE id = $1
         AND requested_by = $2`,
      [jobId, userId]
    );

    return (result.rowCount || 0) > 0;
  }

  async deleteJobsForUser(
    userId: string,
    options: { jobType?: JobType; statuses?: JobStatus[] } = {}
  ): Promise<number> {
    const values: Array<string | string[]> = [userId];
    const conditions = ['requested_by = $1'];

    if (options.jobType) {
      values.push(options.jobType);
      conditions.push(`job_type = $${values.length}`);
    }

    if (options.statuses && options.statuses.length > 0) {
      values.push(options.statuses);
      conditions.push(`status = ANY($${values.length}::text[])`);
    }

    const result = await this.db.query(
      `DELETE FROM jobs
       WHERE ${conditions.join(' AND ')}`,
      values
    );

    return result.rowCount || 0;
  }

  async listJobLogsForUser(
    userId: string,
    jobId: string
  ): Promise<
    Array<{
      id: string;
      jobId: string;
      runnerId: string | null;
      level: string;
      message: string;
      metadata: Record<string, unknown> | null;
      createdAt: Date;
    }>
  > {
    const result = await this.db.query<JobLogRow>(
      `SELECT l.id, l.job_id, l.runner_id, l.level, l.message, l.metadata, l.created_at
       FROM job_logs l
       INNER JOIN jobs j ON j.id = l.job_id
       WHERE l.job_id = $1
         AND j.requested_by = $2
       ORDER BY l.created_at ASC`,
      [jobId, userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      jobId: row.job_id,
      runnerId: row.runner_id,
      level: row.level,
      message: row.message,
      metadata: row.metadata || null,
      createdAt: row.created_at,
    }));
  }

  async listArtifactsForUser(
    userId: string,
    jobId: string
  ): Promise<
    Array<{
      id: string;
      artifactType: string;
      fileName: string;
      objectKey: string;
      sizeBytes: number;
      contentType: string;
      metadata: Record<string, unknown> | null;
      createdAt: Date;
    }>
  > {
    const result = await this.db.query<JobArtifactRow>(
      `SELECT a.id, a.artifact_type, a.file_name, a.object_key, a.size_bytes, a.content_type, a.metadata, a.created_at
       FROM job_artifacts a
       INNER JOIN jobs j ON j.id = a.job_id
       WHERE a.job_id = $1
         AND j.requested_by = $2
       ORDER BY a.created_at ASC`,
      [jobId, userId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      artifactType: row.artifact_type,
      fileName: row.file_name,
      objectKey: row.object_key,
      sizeBytes: row.size_bytes,
      contentType: row.content_type,
      metadata: row.metadata || null,
      createdAt: row.created_at,
    }));
  }

  async claimNextJob(
    runnerId: string,
    manifest: RunnerManifest
  ): Promise<{ job: JobRecord | null; unsupportedReason?: string | null }> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const candidateJobs = await client.query<JobRow>(
        `SELECT *
         FROM jobs
         WHERE status = 'queued'
         ORDER BY created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 50`
      );

      for (const candidate of candidateJobs.rows) {
        const manifestInput = {
          os: manifest.os,
          capabilities: manifest.capabilities,
          tools: manifest.tools,
        };
        const jobInput = {
          id: candidate.id,
          jobType: candidate.job_type,
          requiredOs: candidate.required_os,
          requiredCapabilities: candidate.required_capabilities || [],
          requiredTools: candidate.required_tools || [],
        };

        if (!supportsJob(manifestInput, jobInput)) {
          continue;
        }

        const claimed = await client.query<JobRow>(
          `UPDATE jobs
           SET status = 'claimed',
               runner_id = $2,
               claimed_at = NOW(),
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [candidate.id, runnerId]
        );

        await client.query(
          `INSERT INTO job_attempts (job_id, runner_id, attempt_number, status, started_at)
           VALUES ($1, $2, COALESCE((
             SELECT MAX(attempt_number) + 1
             FROM job_attempts
             WHERE job_id = $1
           ), 1), 'claimed', NOW())`,
          [candidate.id, runnerId]
        );

        await client.query('COMMIT');
        return { job: this.mapRow(claimed.rows[0]), unsupportedReason: null };
      }

      await client.query('COMMIT');

      const firstUnsupported = candidateJobs.rows[0];
      if (firstUnsupported) {
        return {
          job: null,
          unsupportedReason: getUnsupportedReason(
            {
              os: manifest.os,
              capabilities: manifest.capabilities,
              tools: manifest.tools,
            },
            {
              id: firstUnsupported.id,
              jobType: firstUnsupported.job_type,
              requiredOs: firstUnsupported.required_os,
              requiredCapabilities: firstUnsupported.required_capabilities || [],
              requiredTools: firstUnsupported.required_tools || [],
            }
          ),
        };
      }

      return { job: null, unsupportedReason: null };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async transitionJob(
    runnerId: string,
    jobId: string,
    nextStatus: JobStatus,
    update: {
      resultSummary?: Record<string, unknown>;
      errorCode?: string;
      errorMessage?: string;
    } = {}
  ): Promise<JobRecord | null> {
    const currentJob = await this.getJobById(jobId);
    if (!currentJob || currentJob.runnerId !== runnerId) {
      return null;
    }

    assertValidJobTransition(currentJob.status, nextStatus);

    const startedAtClause =
      nextStatus === 'running' ? 'started_at = COALESCE(started_at, NOW()),' : '';
    const completedAtClause =
      ['completed', 'failed', 'cancelled', 'unsupported'].includes(nextStatus)
        ? 'completed_at = NOW(),'
        : '';

    const result = await this.db.query<JobRow>(
      `UPDATE jobs
       SET status = $2,
           ${startedAtClause}
           ${completedAtClause}
           result_summary = COALESCE($3::jsonb, result_summary),
           error_code = COALESCE($4, error_code),
           error_message = COALESCE($5, error_message),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        jobId,
        nextStatus,
        update.resultSummary ? JSON.stringify(update.resultSummary) : null,
        update.errorCode || null,
        update.errorMessage || null,
      ]
    );

    await this.db.query(
      `UPDATE job_attempts
       SET status = $3,
           completed_at = CASE
             WHEN $3 IN ('completed', 'failed', 'cancelled', 'unsupported')
               THEN NOW()
             ELSE completed_at
           END,
           error_message = $4
       WHERE id = (
         SELECT id
         FROM job_attempts
         WHERE job_id = $1
           AND runner_id = $2
         ORDER BY attempt_number DESC
         LIMIT 1
       )`,
      [jobId, runnerId, nextStatus, update.errorMessage || null]
    );

    if (currentJob.jobType === 'PHISHING_DISPATCH') {
      let campaignStatus: string | null = null;

      if (['claimed', 'running', 'artifact_uploading'].includes(nextStatus)) {
        campaignStatus = 'running';
      } else if (nextStatus === 'completed') {
        campaignStatus = 'completed';
      } else if (nextStatus === 'cancelled') {
        campaignStatus = 'cancelled';
      } else if (['failed', 'unsupported'].includes(nextStatus)) {
        campaignStatus = 'failed';
      }

      if (campaignStatus) {
        await this.db.query(
          `UPDATE phishing_campaigns
           SET status = $1,
               updated_at = NOW()
           WHERE last_job_id = $2`,
          [campaignStatus, jobId]
        );
      }
    }

    if (currentJob.jobType === 'REPORT_GENERATION') {
      if (['failed', 'cancelled', 'unsupported'].includes(nextStatus)) {
        await this.db.query(
          `UPDATE reports
           SET status = 'failed'
           WHERE job_id = $1`,
          [jobId]
        );
      }

      if (nextStatus === 'completed') {
        await this.db.query(
          `UPDATE reports
           SET status = CASE
             WHEN artifact_id IS NULL THEN 'failed'
             ELSE status
           END
           WHERE job_id = $1`,
          [jobId]
        );
      }
    }

    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async appendJobLog(
    runnerId: string,
    jobId: string,
    entry: { level: string; message: string; metadata?: Record<string, unknown> }
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO job_logs (job_id, runner_id, level, message, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [jobId, runnerId, entry.level, entry.message, JSON.stringify(entry.metadata || {})]
    );
  }

  async addArtifact(input: {
    jobId: string;
    runnerId: string;
    artifactType: string;
    fileName: string;
    objectKey: string;
    sizeBytes: number;
    contentType: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const insertedArtifact = await this.db.query<{ id: string }>(
      `INSERT INTO job_artifacts (
         job_id,
         runner_id,
         artifact_type,
         file_name,
         object_key,
         size_bytes,
         content_type,
         metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING id`,
      [
        input.jobId,
        input.runnerId,
        input.artifactType,
        input.fileName,
        input.objectKey,
        input.sizeBytes,
        input.contentType,
        JSON.stringify(input.metadata || {}),
      ]
    );

    await this.db.query(
      `UPDATE reports
       SET artifact_id = $2,
           status = 'ready'
       WHERE job_id = $1`,
      [input.jobId, insertedArtifact.rows[0].id]
    );
  }

  private mapRow(row: JobRow): JobRecord {
    return {
      id: row.id,
      jobType: row.job_type,
      status: row.status,
      requestedBy: row.requested_by,
      authorizationId: row.authorization_id,
      targetType: row.target_type,
      targetValue: row.target_value,
      payload: row.payload || {},
      requiredOs: row.required_os,
      requiredCapabilities: row.required_capabilities || [],
      requiredTools: row.required_tools || [],
      runnerId: row.runner_id,
      errorCode: row.error_code,
      errorMessage: row.error_message,
      resultSummary: row.result_summary,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      claimedAt: row.claimed_at ? new Date(row.claimed_at) : null,
      startedAt: row.started_at ? new Date(row.started_at) : null,
      completedAt: row.completed_at ? new Date(row.completed_at) : null,
      cancelledAt: row.cancelled_at ? new Date(row.cancelled_at) : null,
    };
  }
}
