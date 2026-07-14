import { Request, Response, Router } from 'express';
import { pgPool } from '../../database/connection';
import { sendSuccess } from '../../core/http/responses';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get(
  '/stats',
  authenticate(),
  asyncHandler(async (_req: Request, res: Response) => {
    const [jobs, campaigns, authorizations, reports] = await Promise.all([
      pgPool.query(`SELECT COUNT(*)::int AS count FROM jobs`),
      pgPool.query(`SELECT COUNT(*)::int AS count FROM phishing_campaigns`),
      pgPool.query(`SELECT COUNT(*)::int AS count FROM authorizations`),
      pgPool.query(`SELECT COUNT(*)::int AS count FROM reports`),
    ]);

    sendSuccess(res, {
      totalJobs: jobs.rows[0]?.count || 0,
      totalCampaigns: campaigns.rows[0]?.count || 0,
      totalAuthorizations: authorizations.rows[0]?.count || 0,
      totalReports: reports.rows[0]?.count || 0,
    });
  })
);

router.get(
  '/vulnerability-distribution',
  authenticate(),
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await pgPool.query(
      `SELECT
         COALESCE(result_summary->>'severity', 'UNSPECIFIED') AS severity,
         COUNT(*)::int AS count
       FROM jobs
       WHERE result_summary IS NOT NULL
       GROUP BY severity
       ORDER BY count DESC`
    );

    sendSuccess(res, {
      distribution: result.rows,
    });
  })
);

router.get(
  '/recent-activity',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.max(parseInt((req.query.limit as string) || '10', 10), 1);
    const result = await pgPool.query(
      `SELECT id, user_id, event_type, resource, action, result, details, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    sendSuccess(res, {
      activity: result.rows,
    });
  })
);

export default router;
