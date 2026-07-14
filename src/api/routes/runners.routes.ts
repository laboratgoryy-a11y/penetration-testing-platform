import { Request, Response, Router } from 'express';
import multer from 'multer';
import { JobStatus, RunnerManifest } from '../../core/types';
import { JobService } from '../../core/jobs/JobService';
import { RunnerService } from '../../core/runners/RunnerService';
import { sendError, sendSuccess } from '../../core/http/responses';
import { ObjectStorageService } from '../../core/storage/ObjectStorageService';
import { pgPool } from '../../database/connection';
import { asyncHandler } from '../middleware/errorHandler';
import { InputValidator } from '../middleware/inputValidator';
import {
  runnerArtifactUploadLimiter,
  runnerClaimLimiter,
  runnerCompletionLimiter,
  runnerHeartbeatLimiter,
  runnerLogLimiter,
  runnerRegistrationLimiter,
  runnerStatusUpdateLimiter,
} from '../middleware/rateLimiter';
import { ValidationError } from '../../utils/errors';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

async function authenticateRunnerRequest(req: Request): Promise<(RunnerManifest & { runnerId: string }) | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const runnerService = new RunnerService(pgPool);
  return runnerService.authenticateRunner(token);
}

function parseOptionalJson(value: unknown, field: string): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      throw new ValidationError(`Invalid JSON field: ${field}`, field, value);
    }
  }

  if (typeof value === 'object') {
    return value as Record<string, unknown>;
  }

  throw new ValidationError(`Invalid field: ${field}`, field, value);
}

router.post(
  '/register',
  runnerRegistrationLimiter,
  InputValidator.validateRequired(['registrationSecret', 'manifest']),
  asyncHandler(async (req: Request, res: Response) => {
    const runnerService = new RunnerService(pgPool);
    const registered = await runnerService.registerRunner(
      req.body.registrationSecret,
      req.body.manifest as RunnerManifest
    );

    sendSuccess(res, registered, 201);
  })
);

router.post(
  '/heartbeat',
  runnerHeartbeatLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const runner = await authenticateRunnerRequest(req);
    if (!runner) {
      sendError(res, 401, 'RUNNER_UNAUTHORIZED', 'Runner authentication failed');
      return;
    }

    const runnerService = new RunnerService(pgPool);
    await runnerService.heartbeat(
      runner.runnerId,
      (req.body.manifest || runner) as RunnerManifest,
      req.body.systemLoad
    );

    sendSuccess(res, { acknowledged: true });
  })
);

router.post(
  '/jobs/claim',
  runnerClaimLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const runner = await authenticateRunnerRequest(req);
    if (!runner) {
      sendError(res, 401, 'RUNNER_UNAUTHORIZED', 'Runner authentication failed');
      return;
    }

    const jobService = new JobService(pgPool);
    const claimed = await jobService.claimNextJob(runner.runnerId, runner);
    sendSuccess(res, claimed);
  })
);

router.post(
  '/jobs/:jobId/logs',
  runnerLogLimiter,
  InputValidator.validateRequired(['level', 'message']),
  asyncHandler(async (req: Request, res: Response) => {
    const runner = await authenticateRunnerRequest(req);
    if (!runner) {
      sendError(res, 401, 'RUNNER_UNAUTHORIZED', 'Runner authentication failed');
      return;
    }

    const jobService = new JobService(pgPool);
    await jobService.appendJobLog(runner.runnerId, req.params.jobId, {
      level: req.body.level,
      message: req.body.message,
      metadata: req.body.metadata,
    });

    sendSuccess(res, { acknowledged: true });
  })
);

router.post(
  '/jobs/:jobId/artifacts',
  runnerArtifactUploadLimiter,
  upload.single('artifact'),
  asyncHandler(async (req: Request, res: Response) => {
    const runner = await authenticateRunnerRequest(req);
    if (!runner) {
      sendError(res, 401, 'RUNNER_UNAUTHORIZED', 'Runner authentication failed');
      return;
    }

    if (typeof req.body.artifactType !== 'string' || !req.body.artifactType.trim()) {
      throw new ValidationError(
        'artifactType is required',
        'artifactType',
        req.body.artifactType
      );
    }

    const metadata = parseOptionalJson(req.body.metadata, 'metadata');
    let artifactRecord: {
      fileName: string;
      objectKey: string;
      sizeBytes: number;
      contentType: string;
    };

    if (req.file) {
      const storage = new ObjectStorageService();
      const storedObject = await storage.putObject({
        prefix: `jobs/${req.params.jobId}`,
        fileName: req.file.originalname,
        contentType: req.file.mimetype || 'application/octet-stream',
        body: req.file.buffer,
        sizeBytes: req.file.size,
        metadata: {
          runnerId: runner.runnerId,
          artifactType: req.body.artifactType.trim(),
        },
      });

      artifactRecord = {
        fileName: req.file.originalname,
        objectKey: storedObject.objectKey,
        sizeBytes: storedObject.sizeBytes,
        contentType: storedObject.contentType,
      };
    } else {
      const fileName = req.body.fileName;
      const objectKey = req.body.objectKey;
      const sizeBytes = Number(req.body.sizeBytes);
      const contentType = req.body.contentType;

      if (
        typeof fileName !== 'string' ||
        typeof objectKey !== 'string' ||
        !Number.isFinite(sizeBytes) ||
        typeof contentType !== 'string'
      ) {
        throw new ValidationError(
          'artifact upload requires a multipart file or explicit artifact metadata',
          'artifact',
          req.body
        );
      }

      artifactRecord = {
        fileName,
        objectKey,
        sizeBytes,
        contentType,
      };
    }

    const jobService = new JobService(pgPool);
    await jobService.addArtifact({
      jobId: req.params.jobId,
      runnerId: runner.runnerId,
      artifactType: req.body.artifactType.trim(),
      fileName: artifactRecord.fileName,
      objectKey: artifactRecord.objectKey,
      sizeBytes: artifactRecord.sizeBytes,
      contentType: artifactRecord.contentType,
      metadata,
    });

    sendSuccess(res, { acknowledged: true });
  })
);

router.post(
  '/jobs/:jobId/status',
  runnerStatusUpdateLimiter,
  InputValidator.validateRequired(['status']),
  asyncHandler(async (req: Request, res: Response) => {
    const runner = await authenticateRunnerRequest(req);
    if (!runner) {
      sendError(res, 401, 'RUNNER_UNAUTHORIZED', 'Runner authentication failed');
      return;
    }

    const status = req.body.status as JobStatus;
    const allowedStatuses: JobStatus[] = ['running', 'artifact_uploading'];
    if (!allowedStatuses.includes(status)) {
      sendError(
        res,
        400,
        'INVALID_STATUS',
        'Status must be running or artifact_uploading for this endpoint'
      );
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.transitionJob(runner.runnerId, req.params.jobId, status, {
      resultSummary: req.body.resultSummary,
      errorCode: req.body.errorCode,
      errorMessage: req.body.errorMessage,
    });

    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Job not found for this runner');
      return;
    }

    sendSuccess(res, { job });
  })
);

router.post(
  '/jobs/:jobId/complete',
  runnerCompletionLimiter,
  InputValidator.validateRequired(['status']),
  asyncHandler(async (req: Request, res: Response) => {
    const runner = await authenticateRunnerRequest(req);
    if (!runner) {
      sendError(res, 401, 'RUNNER_UNAUTHORIZED', 'Runner authentication failed');
      return;
    }

    const status = req.body.status as JobStatus;
    const allowedStatuses: JobStatus[] = ['completed', 'failed', 'cancelled', 'unsupported'];
    if (!allowedStatuses.includes(status)) {
      sendError(res, 400, 'INVALID_STATUS', 'Status must be a terminal job status');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.transitionJob(runner.runnerId, req.params.jobId, status, {
      resultSummary: req.body.resultSummary,
      errorCode: req.body.errorCode,
      errorMessage: req.body.errorMessage,
    });

    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Job not found for this runner');
      return;
    }

    sendSuccess(res, { job });
  })
);

export default router;
