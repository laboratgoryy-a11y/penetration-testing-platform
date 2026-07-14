import { Request, Response, Router } from 'express';
import { pipeline } from 'stream/promises';
import { JobService } from '../../core/jobs/JobService';
import { sendError, sendSuccess } from '../../core/http/responses';
import { ObjectStorageService } from '../../core/storage/ObjectStorageService';
import { pgPool } from '../../database/connection';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/authMiddleware';
import { jobCancellationLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get(
  '/',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobType = typeof req.query.jobType === 'string' ? req.query.jobType : undefined;
    const jobService = new JobService(pgPool);
    const jobs = await jobService.listJobsForUser(
      req.user.userId,
      jobType as any
    );

    sendSuccess(res, { jobs });
  })
);

router.get(
  '/:id',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Job not found');
      return;
    }

    sendSuccess(res, { job });
  })
);

router.get(
  '/:id/status',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Job not found');
      return;
    }

    sendSuccess(res, {
      jobId: job.id,
      status: job.status,
      updatedAt: job.updatedAt,
      resultSummary: job.resultSummary,
    });
  })
);

router.get(
  '/:id/artifacts',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const ownership = await pgPool.query(
      `SELECT 1
       FROM jobs
       WHERE id = $1
         AND requested_by = $2`,
      [req.params.id, req.user.userId]
    );
    if (ownership.rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Job not found');
      return;
    }

    const artifacts = await pgPool.query(
      `SELECT id, artifact_type, file_name, object_key, size_bytes, content_type, metadata, created_at
       FROM job_artifacts
       WHERE job_id = $1
       ORDER BY created_at ASC`,
      [req.params.id]
    );

    sendSuccess(res, { artifacts: artifacts.rows });
  })
);

router.get(
  '/:id/artifacts/:artifactId/download',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const ownership = await pgPool.query(
      `SELECT 1
       FROM jobs
       WHERE id = $1
         AND requested_by = $2`,
      [req.params.id, req.user.userId]
    );
    if (ownership.rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Job not found');
      return;
    }

    const artifactResult = await pgPool.query<{
      id: string;
      file_name: string;
      object_key: string;
      content_type: string;
      size_bytes: number | null;
    }>(
      `SELECT id, file_name, object_key, content_type, size_bytes
       FROM job_artifacts
       WHERE id = $1
         AND job_id = $2`,
      [req.params.artifactId, req.params.id]
    );

    if (artifactResult.rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Artifact not found');
      return;
    }

    const artifactRecord = artifactResult.rows[0];
    const storage = new ObjectStorageService();
    const artifact = await storage.getObjectStream(artifactRecord.object_key);

    res.status(200);
    res.setHeader(
      'Content-Type',
      artifactRecord.content_type || artifact.contentType || 'application/octet-stream'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${artifactRecord.file_name}"`
    );
    if (artifact.sizeBytes) {
      res.setHeader('Content-Length', artifact.sizeBytes.toString());
    }

    await pipeline(artifact.stream, res);
  })
);

router.post(
  '/:id/cancel',
  authenticate(),
  jobCancellationLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.cancelJob(req.user.userId, req.params.id);
    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Job not found');
      return;
    }

    sendSuccess(res, { job });
  })
);

export default router;
