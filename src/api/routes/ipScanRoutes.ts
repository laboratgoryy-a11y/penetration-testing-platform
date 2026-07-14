import { Request, Response, Router } from 'express';
import { JobService } from '../../core/jobs/JobService';
import { AuthorizationDomainService } from '../../core/authorizations/AuthorizationDomainService';
import { sendError, sendSuccess } from '../../core/http/responses';
import { pgPool } from '../../database/connection';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { scanLimiter } from '../middleware/rateLimiter';
import { InputValidator } from '../middleware/inputValidator';

const router = Router();

router.post(
  '/',
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
    const targetValue = target?.value;
    const authorizationId = target?.authorizationId;

    if (typeof targetValue !== 'string' || targetValue.trim().length === 0) {
      sendError(res, 400, 'INVALID_TARGET', 'A scan target is required');
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
      'IP_SCAN',
      targetValue
    );
    if (!validation.valid) {
      sendError(res, 403, 'INVALID_AUTHORIZATION', validation.reason || 'Authorization rejected');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.createJob({
      jobType: 'IP_SCAN',
      requestedBy: req.user.userId,
      authorizationId,
      targetType: target.type || 'hostname',
      targetValue,
      payload: {
        target,
        config,
      },
      requiredCapabilities: ['IP_SCAN'],
      requiredTools: ['nmap'],
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
  '/',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const scans = await jobService.listJobsForUser(req.user.userId, 'IP_SCAN');
    const requestedStatus =
      typeof req.query.status === 'string' ? req.query.status.toLowerCase() : null;
    const filteredScans = requestedStatus
      ? scans.filter((scan) => scan.status.toLowerCase() === requestedStatus)
      : scans;
    sendSuccess(res, { scans: filteredScans });
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
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
      return;
    }

    sendSuccess(res, job);
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
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
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
      totalHosts:
        typeof job.resultSummary?.totalHosts === 'number'
          ? job.resultSummary.totalHosts
          : Array.isArray(job.resultSummary?.hosts)
            ? job.resultSummary.hosts.length
            : 0,
      totalPorts:
        typeof job.resultSummary?.totalPorts === 'number'
          ? job.resultSummary.totalPorts
          : Array.isArray(job.resultSummary?.ports)
            ? job.resultSummary.ports.length
            : 0,
      totalVulnerabilities:
        typeof job.resultSummary?.totalVulnerabilities === 'number'
          ? job.resultSummary.totalVulnerabilities
          : Array.isArray(job.resultSummary?.vulnerabilities)
            ? job.resultSummary.vulnerabilities.length
            : 0,
      statusMessage:
        typeof job.resultSummary?.statusMessage === 'string'
          ? job.resultSummary.statusMessage
          : null,
      errorMessage: job.errorMessage,
    });
  })
);

router.get(
  '/:id/results',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
      return;
    }

    sendSuccess(res, {
      results: job.resultSummary || {},
    });
  })
);

router.post(
  '/:id/stop',
  authenticate(),
  authorize('scans', 'EXECUTE'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.cancelJob(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
      return;
    }

    sendSuccess(res, {
      message: 'IP scan cancelled successfully',
      jobId: job.id,
      status: job.status,
    });
  })
);

router.get(
  '/:id/logs',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
      return;
    }

    const logs = await jobService.listJobLogsForUser(req.user.userId, req.params.id);
    sendSuccess(res, { logs });
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

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
      return;
    }

    const artifacts = await jobService.listArtifactsForUser(req.user.userId, req.params.id);
    sendSuccess(res, { artifacts });
  })
);

export default router;
