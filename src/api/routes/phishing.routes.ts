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
  '/campaigns',
  authenticate(),
  authorize('phishing', 'EXECUTE'),
  scanLimiter,
  InputValidator.validateRequired(['name', 'authorizationId', 'targets', 'emailTemplate']),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const targets = Array.isArray(req.body.targets) ? req.body.targets : [];
    for (const target of targets) {
      if (!InputValidator.validateEmail(target.email).valid) {
        sendError(res, 400, 'INVALID_EMAIL', `Invalid target email: ${target.email}`);
        return;
      }
    }

    const authorizationService = new AuthorizationDomainService(pgPool);
    const authorization = await authorizationService.getAuthorization(
      req.body.authorizationId,
      req.user.userId
    );
    if (!authorization) {
      sendError(res, 404, 'AUTHORIZATION_NOT_FOUND', 'Authorization not found');
      return;
    }

    for (const target of targets) {
      const validation = await authorizationService.validateAuthorization(
        req.body.authorizationId,
        'PHISHING_CAMPAIGN',
        target.email
      );
      if (!validation.valid) {
        sendError(
          res,
          403,
          'INVALID_AUTHORIZATION',
          validation.reason || `Authorization rejected for ${target.email}`
        );
        return;
      }
    }

    const jobService = new JobService(pgPool);
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');
      const createdCampaign = await client.query<{ id: string }>(
        `INSERT INTO phishing_campaigns (
           user_id,
           authorization_id,
           name,
           status,
           email_template,
           landing_page,
           schedule,
           targets
         ) VALUES ($1, $2, $3, 'queued', $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb)
         RETURNING id`,
        [
          req.user.userId,
          req.body.authorizationId,
          req.body.name,
          JSON.stringify(req.body.emailTemplate || {}),
          JSON.stringify(req.body.landingPage || {}),
          JSON.stringify(req.body.schedule || {}),
          JSON.stringify(targets),
        ]
      );

      const job = await jobService.createJob({
        jobType: 'PHISHING_DISPATCH',
        requestedBy: req.user.userId,
        authorizationId: req.body.authorizationId,
        targetType: 'campaign',
        targetValue: createdCampaign.rows[0].id,
        payload: {
          campaignId: createdCampaign.rows[0].id,
          targets,
          emailTemplate: req.body.emailTemplate,
          landingPage: req.body.landingPage || {},
          schedule: req.body.schedule || {},
        },
        requiredCapabilities: ['PHISHING_DISPATCH'],
      });

      await client.query(
        `UPDATE phishing_campaigns
         SET last_job_id = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [createdCampaign.rows[0].id, job.id]
      );
      await client.query('COMMIT');

      sendSuccess(
        res,
        {
          campaignId: createdCampaign.rows[0].id,
          jobId: job.id,
          statusUrl: `/api/v1/jobs/${job.id}/status`,
        },
        201
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  })
);

router.get(
  '/campaigns',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const campaigns = await pgPool.query(
      `SELECT id, name, status, targets, last_job_id, created_at, updated_at
       FROM phishing_campaigns
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.userId]
    );

    sendSuccess(res, { campaigns: campaigns.rows });
  })
);

router.get(
  '/campaigns/:id',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const campaign = await pgPool.query(
      `SELECT *
       FROM phishing_campaigns
       WHERE id = $1
         AND user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (campaign.rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Campaign not found');
      return;
    }

    sendSuccess(res, { campaign: campaign.rows[0] });
  })
);

router.put(
  '/campaigns/:id',
  authenticate(),
  authorize('phishing', 'EXECUTE'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    await pgPool.query(
      `UPDATE phishing_campaigns
       SET name = COALESCE($3, name),
           email_template = COALESCE($4::jsonb, email_template),
           landing_page = COALESCE($5::jsonb, landing_page),
           schedule = COALESCE($6::jsonb, schedule),
           targets = COALESCE($7::jsonb, targets),
           updated_at = NOW()
       WHERE id = $1
         AND user_id = $2`,
      [
        req.params.id,
        req.user.userId,
        req.body.name || null,
        req.body.emailTemplate ? JSON.stringify(req.body.emailTemplate) : null,
        req.body.landingPage ? JSON.stringify(req.body.landingPage) : null,
        req.body.schedule ? JSON.stringify(req.body.schedule) : null,
        req.body.targets ? JSON.stringify(req.body.targets) : null,
      ]
    );

    sendSuccess(res, { message: 'Campaign updated successfully' });
  })
);

router.delete(
  '/campaigns/:id',
  authenticate(),
  authorize('phishing', 'DELETE'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    await pgPool.query(
      `DELETE FROM phishing_campaigns
       WHERE id = $1
         AND user_id = $2`,
      [req.params.id, req.user.userId]
    );

    sendSuccess(res, { message: 'Campaign deleted successfully' });
  })
);

router.post(
  '/campaigns/:id/launch',
  authenticate(),
  authorize('phishing', 'EXECUTE'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const campaign = await pgPool.query(
      `SELECT *
       FROM phishing_campaigns
       WHERE id = $1
         AND user_id = $2`,
      [req.params.id, req.user.userId]
    );
    if (campaign.rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Campaign not found');
      return;
    }

    const jobService = new JobService(pgPool);
    const job = await jobService.createJob({
      jobType: 'PHISHING_DISPATCH',
      requestedBy: req.user.userId,
      authorizationId: campaign.rows[0].authorization_id,
      targetType: 'campaign',
      targetValue: req.params.id,
      payload: {
        campaignId: req.params.id,
        campaign: campaign.rows[0],
      },
      requiredCapabilities: ['PHISHING_DISPATCH'],
    });

    await pgPool.query(
      `UPDATE phishing_campaigns
       SET status = 'queued',
           last_job_id = $2,
           updated_at = NOW()
       WHERE id = $1`,
      [req.params.id, job.id]
    );

    sendSuccess(res, {
      campaignId: req.params.id,
      jobId: job.id,
      statusUrl: `/api/v1/jobs/${job.id}/status`,
    });
  })
);

router.post(
  '/campaigns/:id/stop',
  authenticate(),
  authorize('phishing', 'EXECUTE'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const campaign = await pgPool.query<{ last_job_id: string | null }>(
      `SELECT last_job_id
       FROM phishing_campaigns
       WHERE id = $1
         AND user_id = $2`,
      [req.params.id, req.user.userId]
    );
    if (campaign.rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Campaign not found');
      return;
    }

    if (campaign.rows[0].last_job_id) {
      const jobService = new JobService(pgPool);
      await jobService.cancelJob(req.user.userId, campaign.rows[0].last_job_id);
    }

    await pgPool.query(
      `UPDATE phishing_campaigns
       SET status = 'cancelled',
           updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );

    sendSuccess(res, { message: 'Campaign stopped successfully' });
  })
);

router.post(
  '/campaigns/:id/complete',
  authenticate(),
  authorize('phishing', 'EXECUTE'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    await pgPool.query(
      `UPDATE phishing_campaigns
       SET status = 'completed',
           updated_at = NOW()
       WHERE id = $1
         AND user_id = $2`,
      [req.params.id, req.user.userId]
    );

    sendSuccess(res, { message: 'Campaign completed successfully' });
  })
);

router.get(
  '/campaigns/:id/results',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const result = await pgPool.query(
      `SELECT c.id,
              c.name,
              c.status,
              c.targets,
              j.status AS job_status,
              j.result_summary
       FROM phishing_campaigns c
       LEFT JOIN jobs j ON j.id = c.last_job_id
       WHERE c.id = $1
         AND c.user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Campaign not found');
      return;
    }

    sendSuccess(res, { results: result.rows[0] });
  })
);

router.get(
  '/campaigns/:id/interactions',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const result = await pgPool.query(
      `SELECT j.result_summary
       FROM phishing_campaigns c
       LEFT JOIN jobs j ON j.id = c.last_job_id
       WHERE c.id = $1
         AND c.user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Campaign not found');
      return;
    }

    const interactions = Array.isArray(result.rows[0].result_summary?.interactions)
      ? result.rows[0].result_summary.interactions
      : [];

    sendSuccess(res, { interactions });
  })
);

router.get(
  '/campaigns/:id/targets',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const result = await pgPool.query(
      `SELECT targets
       FROM phishing_campaigns
       WHERE id = $1
         AND user_id = $2`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Campaign not found');
      return;
    }

    sendSuccess(res, { targets: result.rows[0].targets || [] });
  })
);

router.get(
  '/campaigns/:id/report',
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
      'campaign'
    );
    if (!artifact) {
      sendError(res, 404, 'REPORT_NOT_FOUND', 'No generated report is available for this campaign');
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
