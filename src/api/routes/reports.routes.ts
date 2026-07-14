import { Request, Response, Router } from 'express';
import { pipeline } from 'stream/promises';
import { JobService } from '../../core/jobs/JobService';
import { sendError, sendSuccess } from '../../core/http/responses';
import { ObjectStorageService } from '../../core/storage/ObjectStorageService';
import { pgPool } from '../../database/connection';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requireRole } from '../middleware/authMiddleware';
import { InputValidator } from '../middleware/inputValidator';
import { reportGenerationLimiter } from '../middleware/rateLimiter';

const router = Router();
const reportCollectionPaths = ['/', '/reports'];
const reportResourcePaths = ['/:id', '/reports/:id'];
const reportCompliancePaths = ['/compliance', '/reports/compliance'];

interface ReportRow {
  id: string;
  job_id: string | null;
  report_type: string;
  format: string;
  status: string;
  artifact_id: string | null;
  metadata: Record<string, unknown> | null;
  generated_at: Date;
  file_name?: string | null;
  object_key?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
}

function buildDownloadFileName(report: ReportRow, requestedFormat?: string): string {
  if (report.file_name) {
    return report.file_name;
  }

  const format = (requestedFormat || report.format || 'bin').toLowerCase();
  return `${report.report_type.toLowerCase()}-${report.id}.${format}`;
}

function serializeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text =
    typeof value === 'string' ? value : JSON.stringify(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

router.get(
  reportCollectionPaths,
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const reports = await pgPool.query(
      `SELECT id, job_id, report_type, format, status, artifact_id, metadata, generated_at
       FROM reports
       WHERE generated_by = $1
       ORDER BY generated_at DESC`,
      [req.user.userId]
    );

    sendSuccess(res, { reports: reports.rows });
  })
);

router.get(
  reportResourcePaths,
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const report = await pgPool.query<ReportRow>(
      `SELECT r.id,
              r.job_id,
              r.report_type,
              r.format,
              r.status,
              r.artifact_id,
              r.metadata,
              r.generated_at,
              a.file_name,
              a.object_key,
              a.content_type,
              a.size_bytes
       FROM reports r
       LEFT JOIN job_artifacts a
         ON a.id = r.artifact_id
       WHERE r.id = $1
         AND r.generated_by = $2`,
      [req.params.id, req.user.userId]
    );

    if (report.rows.length === 0) {
      sendError(res, 404, 'NOT_FOUND', 'Report not found');
      return;
    }

    const record = report.rows[0];
    const requestedFormat =
      typeof req.query.format === 'string' ? req.query.format.toLowerCase() : '';

    if (requestedFormat) {
      if (!record.object_key) {
        sendError(res, 409, 'REPORT_NOT_READY', 'Report artifact is not available');
        return;
      }

      const storage = new ObjectStorageService();
      const artifact = await storage.getObjectStream(record.object_key);
      const downloadFileName = buildDownloadFileName(record, requestedFormat);

      res.status(200);
      res.setHeader(
        'Content-Type',
        record.content_type || artifact.contentType || 'application/octet-stream'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${downloadFileName}"`
      );
      if (artifact.sizeBytes) {
        res.setHeader('Content-Length', artifact.sizeBytes.toString());
      }

      await pipeline(artifact.stream, res);
      return;
    }

    sendSuccess(res, { report: record });
  })
);

router.post(
  reportCollectionPaths,
  authenticate(),
  reportGenerationLimiter,
  InputValidator.validateRequired(['reportType', 'format']),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const jobService = new JobService(pgPool);
    const reportMetadata = {
      ...(req.body.metadata || {}),
      ...(req.body.sourceJobId ? { sourceJobId: req.body.sourceJobId } : {}),
    };
    const job = await jobService.createJob({
      jobType: 'REPORT_GENERATION',
      requestedBy: req.user.userId,
      authorizationId: req.body.authorizationId || null,
      targetType: 'report',
      targetValue: req.body.sourceJobId || req.body.reportType,
      payload: {
        reportType: req.body.reportType,
        format: req.body.format,
        sourceJobId: req.body.sourceJobId || null,
        metadata: reportMetadata,
      },
      requiredCapabilities: ['REPORT_GENERATION'],
    });

    const report = await pgPool.query<{ id: string }>(
      `INSERT INTO reports (
         job_id,
         generated_by,
         report_type,
         format,
         status,
         metadata
       ) VALUES ($1, $2, $3, $4, 'queued', $5::jsonb)
       RETURNING id`,
      [
        job.id,
        req.user.userId,
        req.body.reportType,
        req.body.format,
        JSON.stringify(reportMetadata),
      ]
    );

    sendSuccess(
      res,
      {
        reportId: report.rows[0].id,
        jobId: job.id,
        statusUrl: `/api/v1/jobs/${job.id}/status`,
      },
      201
    );
  })
);

router.post(
  reportCompliancePaths,
  authenticate(),
  requireRole('AUDITOR', 'ADMIN'),
  reportGenerationLimiter,
  InputValidator.validateRequired(['startDate', 'endDate']),
  asyncHandler(async (req: Request, res: Response) => {
    req.body.reportType = 'COMPLIANCE';
    req.body.format = req.body.format || 'PDF';
    req.body.metadata = {
      startDate: req.body.startDate,
      endDate: req.body.endDate,
    };

    const jobService = new JobService(pgPool);
    const job = await jobService.createJob({
      jobType: 'REPORT_GENERATION',
      requestedBy: req.user!.userId,
      payload: {
        reportType: 'COMPLIANCE',
        format: req.body.format,
        metadata: req.body.metadata,
      },
      requiredCapabilities: ['REPORT_GENERATION'],
    });

    const report = await pgPool.query<{ id: string }>(
      `INSERT INTO reports (
         job_id,
         generated_by,
         report_type,
         format,
         status,
         metadata
       ) VALUES ($1, $2, 'COMPLIANCE', $3, 'queued', $4::jsonb)
       RETURNING id`,
      [job.id, req.user!.userId, req.body.format, JSON.stringify(req.body.metadata)]
    );

    sendSuccess(
      res,
      {
        reportId: report.rows[0].id,
        jobId: job.id,
        statusUrl: `/api/v1/jobs/${job.id}/status`,
      },
      201
    );
  })
);

router.get(
  '/audit/logs',
  authenticate(),
  requireRole('AUDITOR', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const limit = Math.max(parseInt((req.query.limit as string) || '100', 10), 1);
    const offset = Math.max(parseInt((req.query.offset as string) || '0', 10), 0);
    const logs = await pgPool.query(
      `SELECT id, user_id, event_type, resource, action, result, details, ip_address, user_agent, created_at
       FROM audit_logs
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const total = await pgPool.query(`SELECT COUNT(*)::int AS count FROM audit_logs`);

    sendSuccess(res, {
      logs: logs.rows,
      total: total.rows[0]?.count || 0,
      limit,
      offset,
    });
  })
);

router.get(
  '/audit/logs/export',
  authenticate(),
  requireRole('AUDITOR', 'ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const format = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : 'json';
    const logs = await pgPool.query(
      `SELECT id, user_id, event_type, resource, action, result, details, ip_address, user_agent, created_at
       FROM audit_logs
       ORDER BY created_at DESC`
    );

    const exportedAt = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const header = [
        'id',
        'user_id',
        'event_type',
        'resource',
        'action',
        'result',
        'details',
        'ip_address',
        'user_agent',
        'created_at',
      ];
      const rows = logs.rows.map((row) =>
        [
          row.id,
          row.user_id,
          row.event_type,
          row.resource,
          row.action,
          row.result,
          row.details,
          row.ip_address,
          row.user_agent,
          row.created_at,
        ]
          .map((value) => serializeCsvValue(value))
          .join(',')
      );

      res.status(200);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="audit-logs-${exportedAt}.csv"`
      );
      res.send([header.join(','), ...rows].join('\n'));
      return;
    }

    res.status(200);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${exportedAt}.json"`
    );
    res.send(JSON.stringify(logs.rows, null, 2));
  })
);

export default router;
