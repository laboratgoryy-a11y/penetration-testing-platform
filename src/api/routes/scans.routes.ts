import { Request, Response, Router } from 'express';
import { pipeline } from 'stream/promises';
import { JobService } from '../../core/jobs/JobService';
import { AuthorizationDomainService } from '../../core/authorizations/AuthorizationDomainService';
import { findLatestReportArtifactForEntity } from '../../core/reports/ReportArtifactResolver';
import { sendError, sendSuccess } from '../../core/http/responses';
import { ObjectStorageService } from '../../core/storage/ObjectStorageService';
import { pgPool } from '../../database/connection';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { scanLimiter } from '../middleware/rateLimiter';
import { InputValidator } from '../middleware/inputValidator';

const router = Router();

router.post(
  '/web',
  authenticate(),
  authorize('scans', 'EXECUTE'),
  scanLimiter,
  InputValidator.validateRequired(['target', 'config']),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const target = req.body.target;
    const config = req.body.config;
    const url = target?.url || target?.value;
    const authorizationId = target?.authorizationId;

    if (typeof url !== 'string' || !InputValidator.validateUrl(url).valid) {
      sendError(res, 400, 'INVALID_URL', 'A valid target URL is required');
      return;
    }

    if (typeof authorizationId !== 'string' || !InputValidator.validateUuid(authorizationId).valid) {
      sendError(res, 400, 'INVALID_AUTHORIZATION', 'A valid authorization ID is required');
      return;
    }

    const authorizationService = new AuthorizationDomainService(pgPool);
    const authorization = await authorizationService.getAuthorization(
      authorizationId,
      req.user.userId
    );
    if (!authorization) {
      sendError(res, 404, 'AUTHORIZATION_NOT_FOUND', 'Authorization not found');
      return;
    }

    const validation = await authorizationService.validateAuthorization(
      authorizationId,
      'WEB_SCAN',
      { url }
    );
    if (!validation.valid) {
      sendError(res, 403, 'INVALID_AUTHORIZATION', validation.reason || 'Authorization rejected');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.createJob({
      jobType: 'WEB_SCAN',
      requestedBy: req.user.userId,
      authorizationId,
      targetType: 'url',
      targetValue: url,
      payload: {
        target,
        config,
      },
      requiredCapabilities: ['WEB_SCAN'],
    });

    sendSuccess(
      res,
      {
        jobId: job.id,
        status: job.status,
        statusUrl: `/api/v1/jobs/${job.id}/status`,
      },
      201
    );
  })
);

router.get(
  '/web',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const jobs = await jobService.listJobsForUser(req.user.userId, 'WEB_SCAN');
    sendSuccess(res, { scans: jobs });
  })
);

router.get(
  '/web/:id',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Scan job not found');
      return;
    }

    sendSuccess(res, job);
  })
);

router.get(
  '/web/:id/status',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Scan job not found');
      return;
    }

    sendSuccess(res, {
      jobId: job.id,
      status: job.status,
      updatedAt: job.updatedAt,
      progress:
        typeof job.resultSummary?.progress === 'number'
          ? job.resultSummary.progress
          : null,
      statusMessage:
        typeof job.resultSummary?.statusMessage === 'string'
          ? job.resultSummary.statusMessage
          : null,
      total_requests:
        typeof job.resultSummary?.totalRequests === 'number'
          ? job.resultSummary.totalRequests
          : typeof job.resultSummary?.urlsScanned === 'number'
            ? job.resultSummary.urlsScanned
            : 0,
      total_vulnerabilities:
        typeof job.resultSummary?.totalVulnerabilities === 'number'
          ? job.resultSummary.totalVulnerabilities
          : Array.isArray(job.resultSummary?.findings)
            ? job.resultSummary.findings.length
            : 0,
      page_errors: Array.isArray(job.resultSummary?.pageErrors)
        ? job.resultSummary.pageErrors.length
        : 0,
      resultSummary: job.resultSummary || {},
      errorMessage: job.errorMessage,
    });
  })
);

router.get(
  '/web/:id/vulnerabilities',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Scan job not found');
      return;
    }

    const findings =
      Array.isArray(job.resultSummary?.findings)
        ? (job.resultSummary.findings as unknown[])
        : [];

    sendSuccess(res, findings);
  })
);

router.post(
  '/web/:id/stop',
  authenticate(),
  authorize('scans', 'EXECUTE'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.cancelJob(req.user.userId, req.params.id);
    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Scan job not found');
      return;
    }

    sendSuccess(res, {
      message: 'Scan cancelled successfully',
      jobId: job.id,
      status: job.status,
    });
  })
);

router.get(
  '/web/:id/results',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Scan job not found');
      return;
    }

    sendSuccess(res, {
      results: job.resultSummary || {},
    });
  })
);

router.get(
  '/web/:id/logs',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Scan job not found');
      return;
    }

    const logs = await jobService.listJobLogsForUser(req.user.userId, req.params.id);
    sendSuccess(res, { logs });
  })
);

router.get(
  '/web/:id/artifacts',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job) {
      sendError(res, 404, 'NOT_FOUND', 'Scan job not found');
      return;
    }

    const artifacts = await jobService.listArtifactsForUser(req.user.userId, req.params.id);
    sendSuccess(res, { artifacts });
  })
);

router.get(
  '/web/:id/report',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const artifact = await findLatestReportArtifactForEntity(
      pgPool,
      req.user.userId,
      req.params.id,
      'scan'
    );
    if (!artifact) {
      sendError(res, 404, 'REPORT_NOT_FOUND', 'No generated report is available for this scan');
      return;
    }

    const storage = new ObjectStorageService();
    const storedArtifact = await storage.getObjectStream(artifact.objectKey);
    res.status(200);
    res.setHeader(
      'Content-Type',
      artifact.contentType || storedArtifact.contentType || 'application/octet-stream'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${artifact.fileName}"`
    );
    if (storedArtifact.sizeBytes) {
      res.setHeader('Content-Length', storedArtifact.sizeBytes.toString());
    }

    await pipeline(storedArtifact.stream, res);
  })
);

export default router;
