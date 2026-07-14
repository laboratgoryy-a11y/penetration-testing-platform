import { Request, Response, Router } from 'express';
import { pipeline } from 'stream/promises';
import { JobService } from '../../core/jobs/JobService';
import { AuthorizationDomainService } from '../../core/authorizations/AuthorizationDomainService';
import {
  buildWirelessRuntimeReadiness,
  findUnknownWirelessTestTypes,
  normalizeWirelessTestTypes,
  SUPPORTED_WIRELESS_TEST_TYPES,
} from '../../core/network/wirelessTestTypes';
import { findLatestReportArtifactForEntity } from '../../core/reports/ReportArtifactResolver';
import { sendError, sendSuccess } from '../../core/http/responses';
import { ObjectStorageService } from '../../core/storage/ObjectStorageService';
import { pgPool } from '../../database/connection';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { scanLimiter } from '../middleware/rateLimiter';
import { InputValidator } from '../middleware/inputValidator';
import { discoverRunnerCapabilities, discoverRunnerTools } from '../../runner/tooling';

const router = Router();

router.get(
  '/runtime-readiness',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const tools = discoverRunnerTools([]);
    const capabilities = discoverRunnerCapabilities([], tools);

    sendSuccess(res, {
      platform: process.platform,
      tools,
      capabilities,
      supportedTestTypes: [...SUPPORTED_WIRELESS_TEST_TYPES],
      tests: buildWirelessRuntimeReadiness({
        platform: process.platform,
        tools,
        capabilities,
      }),
    });
  })
);

router.post(
  '/discover',
  authenticate(),
  authorize('network', 'EXECUTE'),
  scanLimiter,
  InputValidator.validateRequired(['authorizationId']),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.createJob({
      jobType: 'WIRELESS_DISCOVERY',
      requestedBy: req.user.userId,
      authorizationId: req.body.authorizationId,
      targetType: 'wireless',
      targetValue: req.body.interface || 'default',
      payload: {
        authorizationId: req.body.authorizationId,
        interface: req.body.interface || null,
      },
      requiredCapabilities: ['WIRELESS_ASSESSMENT'],
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
  '/discover/:id',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'WIRELESS_DISCOVERY') {
      sendError(res, 404, 'NOT_FOUND', 'Wireless discovery job not found');
      return;
    }

    sendSuccess(res, { discovery: job });
  })
);

router.get(
  '/discover/:id/status',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'WIRELESS_DISCOVERY') {
      sendError(res, 404, 'NOT_FOUND', 'Wireless discovery job not found');
      return;
    }

    sendSuccess(res, {
      jobId: job.id,
      status: job.status,
      updatedAt: job.updatedAt,
    });
  })
);

router.get(
  '/discover/:id/results',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'WIRELESS_DISCOVERY') {
      sendError(res, 404, 'NOT_FOUND', 'Wireless discovery job not found');
      return;
    }

    sendSuccess(res, { results: job.resultSummary || {} });
  })
);

router.post(
  '/tests',
  authenticate(),
  authorize('network', 'EXECUTE'),
  scanLimiter,
  InputValidator.validateRequired(['target', 'config']),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const target = req.body.target;
    if (
      typeof target?.authorizationId !== 'string' ||
      typeof target?.ssid !== 'string'
    ) {
      sendError(res, 400, 'INVALID_TARGET', 'SSID and authorizationId are required');
      return;
    }

    if (target.bssid && !InputValidator.validateMacAddress(target.bssid).valid) {
      sendError(res, 400, 'INVALID_BSSID', 'Invalid BSSID format');
      return;
    }

    const requestedTestTypes = normalizeWirelessTestTypes(req.body.config?.testTypes);
    if (requestedTestTypes.length === 0) {
      sendError(
        res,
        400,
        'INVALID_TEST_TYPES',
        'At least one supported wireless test type is required',
        {
          supportedTestTypes: [...SUPPORTED_WIRELESS_TEST_TYPES],
        }
      );
      return;
    }

    const unknownTestTypes = findUnknownWirelessTestTypes(requestedTestTypes);
    if (unknownTestTypes.length > 0) {
      sendError(
        res,
        400,
        'UNKNOWN_TEST_TYPES',
        'One or more requested wireless test types are not recognized by the system',
        {
          unknownTestTypes,
          supportedTestTypes: [...SUPPORTED_WIRELESS_TEST_TYPES],
        }
      );
      return;
    }

    const authorizationService = new AuthorizationDomainService(pgPool);
    const authorization = await authorizationService.getAuthorization(
      target.authorizationId,
      req.user.userId
    );
    if (!authorization) {
      sendError(res, 404, 'AUTHORIZATION_NOT_FOUND', 'Authorization not found');
      return;
    }

    const authorizationValidation = await authorizationService.validateAuthorization(
      target.authorizationId,
      'NETWORK_ANALYSIS',
      target
    );
    if (!authorizationValidation.valid) {
      sendError(
        res,
        403,
        'INVALID_AUTHORIZATION',
        authorizationValidation.reason || 'Authorization rejected'
      );
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.createJob({
      jobType: 'WIRELESS_ASSESSMENT',
      requestedBy: req.user.userId,
      authorizationId: target.authorizationId,
      targetType: 'wireless',
      targetValue: target.ssid,
      payload: {
        target,
        config: {
          ...req.body.config,
          testTypes: requestedTestTypes,
        },
      },
      requiredCapabilities: ['WIRELESS_ASSESSMENT'],
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
  '/tests',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const allJobs = await jobService.listJobsForUser(req.user.userId);
    const tests = allJobs.filter((job) => job.jobType === 'WIRELESS_ASSESSMENT');
    sendSuccess(res, { tests });
  })
);

router.get(
  '/tests/:id',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }

    sendSuccess(res, { test: job });
  })
);

router.get(
  '/tests/:id/status',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }

    sendSuccess(res, {
      jobId: job.id,
      status: job.status,
      updatedAt: job.updatedAt,
    });
  })
);

router.post(
  '/tests/:id/stop',
  authenticate(),
  authorize('network', 'EXECUTE'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.cancelJob(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }

    sendSuccess(res, {
      message: 'Network assessment cancelled successfully',
      jobId: job.id,
      status: job.status,
    });
  })
);

router.delete(
  '/tests/:id',
  authenticate(),
  authorize('network', 'EXECUTE'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }

    await jobService.deleteJobForUser(req.user.userId, req.params.id);
    sendSuccess(res, {
      message: 'Network assessment deleted successfully',
      jobId: req.params.id,
    });
  })
);

router.post(
  '/tests/cleanup',
  authenticate(),
  authorize('network', 'EXECUTE'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const statuses =
      Array.isArray(req.body?.statuses) && req.body.statuses.length > 0
        ? req.body.statuses
        : ['completed', 'failed', 'cancelled', 'unsupported'];

    const deletedCount = await new JobService(pgPool).deleteJobsForUser(req.user.userId, {
      jobType: 'WIRELESS_ASSESSMENT',
      statuses,
    });

    sendSuccess(res, {
      deletedCount,
      statuses,
    });
  })
);

router.get(
  '/tests/:id/results',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }

    sendSuccess(res, { results: job.resultSummary || {} });
  })
);

router.get(
  '/tests/:id/logs',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }

    const logs = await jobService.listJobLogsForUser(req.user.userId, req.params.id);
    sendSuccess(res, { logs });
  })
);

router.get(
  '/tests/:id/artifacts',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.getJobForUser(req.user.userId, req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }

    const artifacts = await jobService.listArtifactsForUser(req.user.userId, req.params.id);
    sendSuccess(res, { artifacts });
  })
);

router.get(
  '/tests/:id/report',
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
      'network'
    );
    if (!artifact) {
      sendError(res, 404, 'REPORT_NOT_FOUND', 'No generated report is available for this job');
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
