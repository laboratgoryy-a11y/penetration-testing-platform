import { randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from '../config';
import {
  buildWirelessRuntimeReadiness,
  SUPPORTED_WIRELESS_TEST_TYPES,
} from '../core/network/wirelessTestTypes';
import { IpScanProvider } from '../runner/IpScanProvider';
import { WebAssessmentProvider } from '../runner/WebAssessmentProvider';
import { WirelessAssessmentProvider } from '../runner/WirelessAssessmentProvider';
import { discoverRunnerCapabilities, discoverRunnerTools } from '../runner/tooling';
import { RunnerExecutionContext } from '../runner/providers';
import {
  checkInternetConnectivity,
  internetConnectivityMiddleware,
} from '../core/connectivity/internetConnectivity';

type Status =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'claimed'
  | 'artifact_uploading'
  | 'unsupported';

interface DevAuthorization {
  id: string;
  organization_name: string;
  organizationName: string;
  target_system: string;
  targetSystem: string;
  allowed_operations: string[];
  allowedOperations: string[];
  scope: Record<string, unknown>;
  valid_from: string;
  validFrom: string;
  valid_until: string;
  validUntil: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  reference_number?: string;
  referenceNumber?: string;
  contact_person?: string;
  contactPerson?: string;
  notes?: string;
}

interface DevJob {
  id: string;
  jobId: string;
  jobType: string;
  status: Status;
  authorizationId?: string;
  targetType: string;
  targetValue: string;
  payload: Record<string, unknown>;
  resultSummary: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string | null;
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
    metadata?: Record<string, unknown>;
  }>;
  artifacts: Array<{
    artifactType: string;
    fileName: string;
    contentType: string;
    body: string;
    metadata?: Record<string, unknown>;
  }>;
}

interface DevCampaign {
  id: string;
  name: string;
  authorizationId?: string;
  status: Status;
  targets: unknown[];
  emailTemplate?: unknown;
  landingPage?: unknown;
  lastJobId?: string | null;
  resultSummary?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface DevReport {
  id: string;
  job_id: string | null;
  report_type: string;
  format: string;
  status: Status;
  metadata: Record<string, unknown>;
  generated_at: string;
}

const now = () => new Date().toISOString();

const user = {
  id: 'dev-admin',
  username: 'admin',
  email: 'admin@localhost.test',
  roles: ['ADMIN', 'AUDITOR', 'OPERATOR'],
  permissions: ['*'],
};

const authorizations: DevAuthorization[] = [
  buildAuthorization({
    organizationName: 'بيئة التطوير المحلية',
    targetSystem: 'example.com',
    allowedOperations: [
      'WEB_SCAN',
      'IP_SCAN',
      'PHISHING_CAMPAIGN',
      'NETWORK_ANALYSIS',
      'REPORT_GENERATION',
    ],
    scope: {
      domains: ['example.com'],
      ipRanges: ['192.168.1.0/24'],
      emailDomains: ['example.com'],
      networks: [{ ssid: 'faraa net', bssid: '00:11:22:33:44:55' }],
    },
    referenceNumber: 'DEV-AUTH-001',
    contactPerson: 'admin@localhost.test',
    notes: 'تصريح افتراضي لتجربة النظام محليا عند عدم توفر قاعدة البيانات.',
  }),
];

const jobs: DevJob[] = [];
const campaigns: DevCampaign[] = [];
const reports: DevReport[] = [];
const webScanProvider = new WebAssessmentProvider();
const wirelessProvider = new WirelessAssessmentProvider();
const ipScanProvider = new IpScanProvider();
const auditLogs: Array<Record<string, unknown>> = [
  {
    id: 'audit-dev-1',
    user_id: user.id,
    event_type: 'SYSTEM_STARTED',
    resource: 'dev-fallback',
    action: 'START',
    result: 'SUCCESS',
    details: { mode: 'memory' },
    created_at: now(),
  },
];

function buildAuthorization(input: {
  organizationName: string;
  targetSystem: string;
  allowedOperations: string[];
  scope: Record<string, unknown>;
  validFrom?: string;
  validUntil?: string;
  referenceNumber?: string;
  contactPerson?: string;
  notes?: string;
}): DevAuthorization {
  const id = randomUUID();
  const validFrom = input.validFrom || now().slice(0, 10);
  const validUntil =
    input.validUntil ||
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    id,
    organization_name: input.organizationName,
    organizationName: input.organizationName,
    target_system: input.targetSystem,
    targetSystem: input.targetSystem,
    allowed_operations: input.allowedOperations,
    allowedOperations: input.allowedOperations,
    scope: input.scope,
    valid_from: validFrom,
    validFrom,
    valid_until: validUntil,
    validUntil,
    status: 'ACTIVE',
    reference_number: input.referenceNumber,
    referenceNumber: input.referenceNumber,
    contact_person: input.contactPerson,
    contactPerson: input.contactPerson,
    notes: input.notes,
  };
}

function sendSuccess(res: Response, data: unknown = {}, status = 200): void {
  res.status(status).json({
    success: true,
    data,
    timestamp: now(),
  });
}

function sendError(
  res: Response,
  status: number,
  code: string,
  message: string
): void {
  res.status(status).json({
    success: false,
    error: { code, message },
    timestamp: now(),
  });
}

type ReportTable = {
  title: string;
  headers: string[];
  rows: Array<Array<unknown>>;
};

function stringifyReportValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Not available';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

async function buildPdfReport(input: {
  title: string;
  intro: string;
  summary: Record<string, unknown>;
  tables: ReportTable[];
}): Promise<Buffer> {
  const pdf = new PDFDocument({ margin: 42, size: 'A4' });
  const chunks: Buffer[] = [];
  pdf.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  const completed = new Promise<Buffer>((resolve, reject) => {
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
  });

  const pageWidth = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;

  pdf.fontSize(20).fillColor('#111827').text(input.title, { align: 'left' });
  pdf.moveDown(0.4);
  pdf.fontSize(10).fillColor('#64748b').text(`Generated at: ${new Date().toLocaleString('en-US')}`);
  pdf.moveDown();
  pdf.fontSize(11).fillColor('#111827').text(input.intro, {
    width: pageWidth,
    align: 'left',
  });
  pdf.moveDown();

  pdf.fontSize(15).fillColor('#111827').text('Executive Summary');
  pdf.moveDown(0.4);
  Object.entries(input.summary).forEach(([key, value]) => {
    pdf.fontSize(10).fillColor('#334155').text(`${key}: `, { continued: true });
    pdf.fillColor('#111827').text(stringifyReportValue(value));
  });

  input.tables.forEach((table) => {
    pdf.moveDown();
    if (pdf.y > pdf.page.height - 150) {
      pdf.addPage();
    }
    pdf.fontSize(14).fillColor('#111827').text(table.title);
    pdf.moveDown(0.35);

    const colWidth = pageWidth / Math.max(table.headers.length, 1);
    const startX = pdf.x;
    let y = pdf.y;

    pdf.rect(startX, y, pageWidth, 22).fill('#e5e7eb');
    table.headers.forEach((header, index) => {
      pdf
        .fillColor('#111827')
        .fontSize(8)
        .text(header, startX + index * colWidth + 4, y + 7, {
          width: colWidth - 8,
          lineBreak: false,
        });
    });
    y += 22;

    const rows = table.rows.length ? table.rows : [['No results available']];
    rows.slice(0, 80).forEach((row, rowIndex) => {
      const rowHeight = 28;
      if (y > pdf.page.height - 70) {
        pdf.addPage();
        y = pdf.y;
      }

      pdf.rect(startX, y, pageWidth, rowHeight).fill(rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc');
      table.headers.forEach((_header, index) => {
        pdf
          .fillColor('#111827')
          .fontSize(8)
          .text(stringifyReportValue(row[index]), startX + index * colWidth + 4, y + 7, {
            width: colWidth - 8,
            height: rowHeight - 8,
          });
      });
      y += rowHeight;
    });

    pdf.y = y + 6;
  });

  pdf.end();
  return completed;
}

async function sendPdfReport(
  res: Response,
  filename: string,
  input: {
    title: string;
    intro: string;
    summary: Record<string, unknown>;
    tables: ReportTable[];
  }
): Promise<void> {
  const body = await buildPdfReport(input);
  res.status(200);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', body.length.toString());
  res.send(body);
}

function requireDevAuth(req: Request, res: Response, next: () => void): void {
  if (!req.headers.authorization) {
    sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
    return;
  }
  next();
}

function createJob(input: {
  jobType: string;
  authorizationId?: string;
  targetType: string;
  targetValue: string;
  payload: Record<string, unknown>;
  resultSummary?: Record<string, unknown>;
}): DevJob {
  const id = randomUUID();
  const createdAt = now();
  const job: DevJob = {
    id,
    jobId: id,
    jobType: input.jobType,
    status: 'queued',
    authorizationId: input.authorizationId,
    targetType: input.targetType,
    targetValue: input.targetValue,
    payload: input.payload,
    resultSummary: input.resultSummary || {},
    createdAt,
    updatedAt: createdAt,
    logs: [],
    artifacts: [],
  };
  jobs.unshift(job);
  auditLogs.unshift({
    id: randomUUID(),
    user_id: user.id,
    event_type: `${input.jobType}_CREATED`,
    resource: 'jobs',
    action: 'CREATE',
    result: 'SUCCESS',
    details: { target: input.targetValue },
    created_at: createdAt,
  });
  return job;
}

function findJob(id: string): DevJob | undefined {
  return jobs.find((job) => job.id === id || job.jobId === id);
}

function deleteJob(id: string): boolean {
  const index = jobs.findIndex((job) => job.id === id || job.jobId === id);
  if (index === -1) {
    return false;
  }

  jobs.splice(index, 1);
  return true;
}

function normalizeJobForApi(job: DevJob): Record<string, unknown> {
  return {
    ...job,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    started_at: job.startedAt || null,
    completed_at: job.completedAt || null,
    result_summary: job.resultSummary || {},
    error_message: job.errorMessage || null,
  };
}

function serializeArtifactBody(body: Buffer | Uint8Array | string): string {
  if (typeof body === 'string') {
    return body;
  }

  return Buffer.from(body).toString('utf8');
}

function buildDevExecutionContext(
  job: DevJob,
  requiredCapabilities: string[]
): RunnerExecutionContext {
  return {
    job: {
      id: job.id,
      jobType: job.jobType as any,
      status: 'running',
      requestedBy: user.id,
      authorizationId: job.authorizationId || null,
      targetType: job.targetType,
      targetValue: job.targetValue,
      payload: job.payload,
      requiredOs: null,
      requiredCapabilities,
      requiredTools: [],
      runnerId: 'dev-memory-runner',
      errorCode: null,
      errorMessage: null,
      resultSummary: job.resultSummary,
      createdAt: new Date(job.createdAt),
      updatedAt: new Date(job.updatedAt),
      startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
    },
    appendLog: async (level, message, metadata) => {
      job.logs.push({
        timestamp: now(),
        level,
        message,
        metadata,
      });
      job.updatedAt = now();
    },
    updateStatus: async (_status, payload) => {
      job.status = 'running';
      if (payload?.resultSummary) {
        job.resultSummary = payload.resultSummary;
      }
      if (payload?.errorMessage) {
        job.errorMessage = payload.errorMessage;
      }
      job.updatedAt = now();
    },
    uploadArtifact: async (input) => {
      job.artifacts.push({
        artifactType: input.artifactType,
        fileName: input.fileName,
        contentType: input.contentType,
        body: serializeArtifactBody(input.body),
        metadata: input.metadata,
      });
      job.updatedAt = now();
    },
  };
}

async function runWirelessJob(job: DevJob): Promise<void> {
  job.status = 'running';
  job.startedAt = now();
  job.updatedAt = job.startedAt;

  const context = buildDevExecutionContext(job, ['WIRELESS_ASSESSMENT']);

  try {
    const result = await wirelessProvider.execute(context);
    job.resultSummary = result.summary || {};
    job.status = 'completed';
    job.completedAt = now();
    job.updatedAt = job.completedAt;
  } catch (error) {
    job.status =
      error instanceof Error && /unsupported/i.test(error.message)
        ? 'unsupported'
        : 'failed';
    job.errorMessage =
      error instanceof Error ? error.message : 'Unknown wireless execution error';
    job.completedAt = now();
    job.updatedAt = job.completedAt;
    job.logs.push({
      timestamp: now(),
      level: 'error',
      message: job.errorMessage,
    });
  }
}

async function runIpScanJob(job: DevJob): Promise<void> {
  job.status = 'running';
  job.startedAt = now();
  job.updatedAt = job.startedAt;

  const context = buildDevExecutionContext(job, ['IP_SCAN']);

  try {
    const result = await ipScanProvider.execute(context);
    job.resultSummary = result.summary || {};
    job.status = 'completed';
    job.completedAt = now();
    job.updatedAt = job.completedAt;
  } catch (error) {
    job.status =
      error instanceof Error && /unsupported/i.test(error.message)
        ? 'unsupported'
        : 'failed';
    job.errorMessage = error instanceof Error ? error.message : 'Unknown IP scan execution error';
    job.completedAt = now();
    job.updatedAt = job.completedAt;
    job.logs.push({
      timestamp: now(),
      level: 'error',
      message: job.errorMessage,
    });
  }
}

async function runWebScanJob(job: DevJob): Promise<void> {
  job.status = 'running';
  job.startedAt = now();
  job.updatedAt = job.startedAt;

  const context = buildDevExecutionContext(job, ['WEB_SCAN']);

  try {
    const result = await webScanProvider.execute(context);
    job.resultSummary = result.summary || {};
    job.status = 'completed';
    job.completedAt = now();
    job.updatedAt = job.completedAt;
  } catch (error) {
    job.status =
      error instanceof Error && /unsupported/i.test(error.message)
        ? 'unsupported'
        : 'failed';
    job.errorMessage = error instanceof Error ? error.message : 'Unknown web scan execution error';
    job.completedAt = now();
    job.updatedAt = job.completedAt;
    job.logs.push({
      timestamp: now(),
      level: 'error',
      message: job.errorMessage,
    });
  }
}

function scheduleWirelessJob(job: DevJob): void {
  setTimeout(() => {
    runWirelessJob(job).catch((error) => {
      job.status = 'failed';
      job.errorMessage =
        error instanceof Error ? error.message : 'Unexpected background error';
      job.completedAt = now();
      job.updatedAt = job.completedAt;
    });
  }, 50);
}

function scheduleWebScanJob(job: DevJob): void {
  setTimeout(() => {
    runWebScanJob(job).catch((error) => {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unexpected background error';
      job.completedAt = now();
      job.updatedAt = job.completedAt;
    });
  }, 50);
}

function scheduleIpScanJob(job: DevJob): void {
  setTimeout(() => {
    runIpScanJob(job).catch((error) => {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unexpected background error';
      job.completedAt = now();
      job.updatedAt = job.completedAt;
    });
  }, 50);
}

function buildDevRouter(): express.Router {
  const router = express.Router();

  router.post('/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Username and password are required');
      return;
    }
    sendSuccess(res, {
      token: 'dev-token',
      refreshToken: 'dev-refresh-token',
      user,
      session: { expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() },
    });
  });

  router.post('/auth/logout', (_req, res) => sendSuccess(res, { message: 'Logged out' }));
  router.get('/auth/me', requireDevAuth, (_req, res) => sendSuccess(res, { user }));
  router.get('/network/runtime-readiness', requireDevAuth, (_req, res) => {
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
  });

  router.get('/dashboard/stats', requireDevAuth, (_req, res) => {
    sendSuccess(res, {
      totalScans: jobs.filter((job) => job.jobType === 'WEB_SCAN').length,
      totalVulnerabilities: jobs.reduce(
        (total, job) => total + Number(job.resultSummary.totalVulnerabilities || 0),
        0
      ),
      totalCampaigns: campaigns.length,
      totalNetworkTests: jobs.filter((job) => job.jobType === 'WIRELESS_ASSESSMENT').length,
      totalJobs: jobs.length,
      totalAuthorizations: authorizations.length,
      totalReports: reports.length,
    });
  });

  router.get('/dashboard/vulnerability-distribution', requireDevAuth, (_req, res) => {
    sendSuccess(res, {
      distribution: [
        { severity: 'HIGH', count: 3 },
        { severity: 'MEDIUM', count: 5 },
        { severity: 'LOW', count: 8 },
      ],
    });
  });

  router.get('/dashboard/recent-activity', requireDevAuth, (_req, res) => {
    sendSuccess(res, { activity: auditLogs.slice(0, 10) });
  });

  router.get('/authorizations', requireDevAuth, (_req, res) => {
    sendSuccess(res, { authorizations });
  });

  router.post('/authorizations', requireDevAuth, (req, res) => {
    const body = req.body || {};
    const organizationName = body.organizationName || body.organization_name;
    const targetSystem = body.targetSystem || body.target_system;
    const allowedOperations = body.allowedOperations || body.allowed_operations;
    if (!organizationName || !targetSystem || !Array.isArray(allowedOperations)) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Authorization data is incomplete');
      return;
    }
    const authorization = buildAuthorization({
      organizationName,
      targetSystem,
      allowedOperations,
      scope: body.scope || {},
      validFrom: body.validFrom || body.valid_from,
      validUntil: body.validUntil || body.valid_until,
      referenceNumber: body.referenceNumber || body.reference_number,
      contactPerson: body.contactPerson || body.contact_person,
      notes: body.notes,
    });
    authorizations.unshift(authorization);
    auditLogs.unshift({
      id: randomUUID(),
      user_id: user.id,
      event_type: 'AUTHORIZATION_CREATED',
      resource: 'authorizations',
      action: 'CREATE',
      result: 'SUCCESS',
      details: { organizationName },
      created_at: now(),
    });
    sendSuccess(res, { authorization }, 201);
  });

  router.get('/authorizations/:id', requireDevAuth, (req, res) => {
    const authorization = authorizations.find((item) => item.id === req.params.id);
    if (!authorization) {
      sendError(res, 404, 'NOT_FOUND', 'Authorization not found');
      return;
    }
    sendSuccess(res, { authorization });
  });

  router.post('/authorizations/:id/validate', requireDevAuth, (req, res) => {
    const authorization = authorizations.find((item) => item.id === req.params.id);
    sendSuccess(res, {
      valid: !!authorization && authorization.status === 'ACTIVE',
      reason: authorization ? undefined : 'Authorization not found',
    });
  });

  router.post('/authorizations/:id/revoke', requireDevAuth, (req, res) => {
    const authorization = authorizations.find((item) => item.id === req.params.id);
    if (!authorization) {
      sendError(res, 404, 'NOT_FOUND', 'Authorization not found');
      return;
    }
    authorization.status = 'REVOKED';
    sendSuccess(res, { authorization });
  });

  router.get('/scans/web', requireDevAuth, (_req, res) => {
    sendSuccess(res, {
      scans: jobs
        .filter((job) => job.jobType === 'WEB_SCAN')
        .map((job) => normalizeJobForApi(job)),
    });
  });

  router.post('/scans/web', requireDevAuth, (req, res) => {
    const target = req.body?.target || {};
    const job = createJob({
      jobType: 'WEB_SCAN',
      authorizationId: target.authorizationId,
      targetType: 'url',
      targetValue: target.url || 'unknown',
      payload: req.body,
    });
    scheduleWebScanJob(job);
    sendSuccess(res, { jobId: job.id, status: job.status, statusUrl: `/api/v1/jobs/${job.id}/status` }, 201);
  });

  router.get('/scans/web/:id', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WEB_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'Web scan job not found');
      return;
    }

    sendSuccess(res, normalizeJobForApi(job));
  });

  router.get('/scans/web/:id/status', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WEB_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'Web scan job not found');
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
  });

  router.get('/scans/web/:id/results', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WEB_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'Web scan job not found');
      return;
    }

    sendSuccess(res, { results: job.resultSummary || {} });
  });

  router.get('/scans/web/:id/vulnerabilities', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WEB_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'Web scan job not found');
      return;
    }

    sendSuccess(res, Array.isArray(job.resultSummary?.findings) ? job.resultSummary.findings : []);
  });

  router.get('/scans/web/:id/logs', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WEB_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'Web scan job not found');
      return;
    }

    sendSuccess(res, {
      logs: job.logs.map((entry, index) => ({
        id: `${job.id}-log-${index}`,
        created_at: entry.timestamp,
        level: entry.level,
        message: entry.message,
        metadata: entry.metadata || {},
      })),
    });
  });

  router.get('/scans/web/:id/artifacts', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WEB_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'Web scan job not found');
      return;
    }

    sendSuccess(res, {
      artifacts: job.artifacts.map((artifact, index) => ({
        id: `${job.id}-artifact-${index}`,
        artifact_type: artifact.artifactType,
        file_name: artifact.fileName,
        content_type: artifact.contentType,
        metadata: artifact.metadata || {},
        created_at: job.completedAt || job.updatedAt,
      })),
    });
  });

  router.get('/scans/web/:id/report', requireDevAuth, async (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WEB_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'Web scan job not found');
      return;
    }

    const summary = job.resultSummary || {};
    const findings = Array.isArray(summary.findings) ? summary.findings : [];
    const pageErrors = Array.isArray(summary.pageErrors) ? summary.pageErrors : [];

    await sendPdfReport(res, `scan-report-${job.id}.pdf`, {
      title: 'Web Scan Report',
      intro:
        'This report summarizes the information collected during the authorized web scan. The tables below show the discovered findings, scan statistics, and any unavailable values as Not available.',
      summary: {
        'Target URL': job.targetValue,
        Status: job.status,
        'Pages / Requests': summary.urlsScanned || summary.totalRequests || 0,
        Findings: findings.length,
        'Started At': job.startedAt || job.createdAt,
        'Completed At': job.completedAt || 'Not available',
      },
      tables: [
        {
          title: 'Detected Findings',
          headers: ['Severity', 'Type', 'Title', 'URL', 'Recommendation'],
          rows: findings.map((finding: any) => [
            finding.severity,
            finding.type,
            finding.title || finding.description,
            finding.url || finding.location,
            finding.remediation || finding.recommendation,
          ]),
        },
        {
          title: 'Page Errors',
          headers: ['URL', 'Error'],
          rows: pageErrors.map((item: any) => [item.url, item.error || item.message]),
        },
      ],
    });
  });

  router.post('/scans/web/:id/stop', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WEB_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'Web scan job not found');
      return;
    }
    job.status = 'cancelled';
    job.updatedAt = now();
    sendSuccess(res, { jobId: req.params.id, status: 'cancelled' });
  });

  router.get('/ip-scans', requireDevAuth, (_req, res) => {
    sendSuccess(res, {
      scans: jobs
        .filter((job) => job.jobType === 'IP_SCAN')
        .map((job) => normalizeJobForApi(job)),
    });
  });

  router.post('/ip-scans', requireDevAuth, (req, res) => {
    const target = req.body?.target || {};
    const job = createJob({
      jobType: 'IP_SCAN',
      authorizationId: target.authorizationId || req.body?.authorizationId,
      targetType: 'ip',
      targetValue: target.value || req.body?.target || '192.168.1.1',
      payload: req.body,
    });
    scheduleIpScanJob(job);
    sendSuccess(res, { jobId: job.id, status: job.status }, 201);
  });

  router.get('/ip-scans/:id', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
      return;
    }

    sendSuccess(res, normalizeJobForApi(job));
  });

  router.get('/ip-scans/:id/status', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
      return;
    }

    sendSuccess(res, {
      jobId: job.id,
      status: job.status,
      updatedAt: job.updatedAt,
      progress:
        typeof job.resultSummary?.progress === 'number' ? job.resultSummary.progress : null,
      totalHosts:
        typeof job.resultSummary?.totalHosts === 'number' ? job.resultSummary.totalHosts : 0,
      totalPorts:
        typeof job.resultSummary?.totalPorts === 'number' ? job.resultSummary.totalPorts : 0,
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
      errorMessage: job.errorMessage || null,
    });
  });

  router.get('/ip-scans/:id/results', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
      return;
    }

    sendSuccess(res, { results: job.resultSummary || {} });
  });

  router.get('/ip-scans/:id/logs', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
      return;
    }

    sendSuccess(res, {
      logs: job.logs.map((entry, index) => ({
        id: `${job.id}-log-${index + 1}`,
        jobId: job.id,
        runnerId: 'dev-memory-runner',
        level: entry.level,
        message: entry.message,
        metadata: entry.metadata || null,
        createdAt: entry.timestamp,
      })),
    });
  });

  router.get('/ip-scans/:id/artifacts', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
      return;
    }

    sendSuccess(res, {
      artifacts: job.artifacts.map((artifact, index) => ({
        id: `${job.id}-artifact-${index + 1}`,
        artifactType: artifact.artifactType,
        fileName: artifact.fileName,
        objectKey: artifact.fileName,
        sizeBytes: artifact.body.length,
        contentType: artifact.contentType,
        metadata: artifact.metadata || null,
        createdAt: job.completedAt || job.updatedAt,
      })),
    });
  });

  router.get('/ip-scans/:id/report', requireDevAuth, async (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
      return;
    }

    const summary = job.resultSummary || {};
    const hosts = Array.isArray(summary.hosts) ? summary.hosts : [];
    const ports = Array.isArray(summary.ports) ? summary.ports : [];
    const services = Array.isArray(summary.services) ? summary.services : [];
    const vulnerabilities = Array.isArray(summary.vulnerabilities) ? summary.vulnerabilities : [];

    await sendPdfReport(res, `ip-scan-report-${job.id}.pdf`, {
      title: 'IP Scan Report',
      intro:
        'This report contains the actual data returned by the authorized IP scan. It starts with a summary, then organized tables for hosts, ports, services, and security notes.',
      summary: {
        Target: job.targetValue,
        Status: job.status,
        Hosts: summary.totalHosts ?? hosts.length,
        Ports: summary.totalPorts ?? ports.length,
        Vulnerabilities: summary.totalVulnerabilities ?? vulnerabilities.length,
        'Started At': job.startedAt || job.createdAt,
        'Completed At': job.completedAt || 'Not available',
      },
      tables: [
        {
          title: 'Discovered Hosts',
          headers: ['IP', 'MAC', 'Hostname', 'Vendor', 'OS', 'Status', 'RTT'],
          rows: hosts.map((host: any) => [
            host.ip || host.ip_address,
            host.mac || host.mac_address,
            host.hostname,
            host.vendor,
            host.os,
            host.status,
            host.rtt || host.latency,
          ]),
        },
        {
          title: 'Ports and Services',
          headers: ['Port', 'Protocol', 'State', 'Service', 'Version', 'Risk'],
          rows: ports.map((port: any) => [
            port.port,
            port.protocol || port.transport,
            port.state,
            port.service || port.service_name || port.service_label,
            port.version || port.service_version,
            port.risk || port.risk_level,
          ]),
        },
        {
          title: 'Detected Services',
          headers: ['IP', 'Port', 'Service', 'Product', 'Version', 'Category'],
          rows: services.map((service: any) => [
            service.ip || service.ip_address,
            service.port,
            service.service_name || service.name,
            service.service_product || service.product,
            service.service_version || service.version,
            service.category,
          ]),
        },
        {
          title: 'Security Notes',
          headers: ['Severity', 'Title', 'Port', 'Description', 'Recommendation'],
          rows: vulnerabilities.map((vuln: any) => [
            vuln.severity,
            vuln.title || vuln.type,
            vuln.port,
            vuln.description,
            vuln.recommendation || vuln.remediation,
          ]),
        },
      ],
    });
  });

  router.post('/ip-scans/:id/stop', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'IP_SCAN') {
      sendError(res, 404, 'NOT_FOUND', 'IP scan job not found');
      return;
    }

    job.status = 'cancelled';
    job.completedAt = now();
    job.updatedAt = job.completedAt;
    job.logs.push({
      timestamp: now(),
      level: 'warning',
      message: 'IP scan cancelled by operator',
    });

    sendSuccess(res, { jobId: job.id, status: job.status });
  });

  router.get('/network/tests', requireDevAuth, (_req, res) => {
    sendSuccess(res, {
      tests: jobs
        .filter((job) => job.jobType === 'WIRELESS_ASSESSMENT')
        .map((job) => normalizeJobForApi(job)),
    });
  });

  router.post('/network/tests', requireDevAuth, (req, res) => {
    const target = req.body?.target || {};
    const job = createJob({
      jobType: 'WIRELESS_ASSESSMENT',
      authorizationId: target.authorizationId,
      targetType: 'wireless',
      targetValue: target.ssid || target.bssid || 'wireless',
      payload: req.body,
      resultSummary: {},
    });
    scheduleWirelessJob(job);
    sendSuccess(res, { jobId: job.id, status: job.status }, 201);
  });

  router.post('/network/discover', requireDevAuth, (req, res) => {
    const job = createJob({
      jobType: 'WIRELESS_DISCOVERY',
      authorizationId: req.body?.authorizationId,
      targetType: 'wireless',
      targetValue: 'default',
      payload: req.body,
    });
    scheduleWirelessJob(job);
    sendSuccess(res, { jobId: job.id, status: job.status }, 201);
  });

  router.get('/network/discover/:id', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WIRELESS_DISCOVERY') {
      sendError(res, 404, 'NOT_FOUND', 'Wireless discovery job not found');
      return;
    }
    sendSuccess(res, { discovery: normalizeJobForApi(job) });
  });

  router.get('/network/discover/:id/status', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WIRELESS_DISCOVERY') {
      sendError(res, 404, 'NOT_FOUND', 'Wireless discovery job not found');
      return;
    }
    sendSuccess(res, {
      jobId: job.id,
      status: job.status,
      updatedAt: job.updatedAt,
    });
  });

  router.get('/network/discover/:id/results', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WIRELESS_DISCOVERY') {
      sendError(res, 404, 'NOT_FOUND', 'Wireless discovery job not found');
      return;
    }
    sendSuccess(res, { results: job.resultSummary || {} });
  });

  router.get('/network/tests/:id', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }
    sendSuccess(res, { test: normalizeJobForApi(job) });
  });

  router.get('/network/tests/:id/status', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    sendSuccess(res, { jobId: req.params.id, status: job?.status || 'queued', updatedAt: job?.updatedAt || now() });
  });

  router.get('/network/tests/:id/results', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }
    sendSuccess(res, { results: job.resultSummary || {} });
  });

  router.get('/network/tests/:id/logs', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }

    sendSuccess(res, {
      logs: job.logs.map((entry, index) => ({
        id: `${job.id}-log-${index + 1}`,
        jobId: job.id,
        runnerId: 'dev-memory-runner',
        level: entry.level,
        message: entry.message,
        metadata: entry.metadata || null,
        createdAt: entry.timestamp,
      })),
    });
  });

  router.get('/network/tests/:id/artifacts', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }

    sendSuccess(res, {
      artifacts: job.artifacts.map((artifact, index) => ({
        id: `${job.id}-artifact-${index + 1}`,
        artifactType: artifact.artifactType,
        fileName: artifact.fileName,
        objectKey: artifact.fileName,
        sizeBytes: artifact.body.length,
        contentType: artifact.contentType,
        metadata: artifact.metadata || null,
        createdAt: job.completedAt || job.updatedAt,
      })),
    });
  });

  router.post('/network/tests/:id/stop', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (job) {
      job.status = 'cancelled';
      job.completedAt = now();
      job.updatedAt = job.completedAt;
    }
    sendSuccess(res, { jobId: req.params.id, status: 'cancelled' });
  });

  router.delete('/network/tests/:id', requireDevAuth, (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }

    deleteJob(req.params.id);
    sendSuccess(res, {
      message: 'Network assessment deleted successfully',
      jobId: req.params.id,
    });
  });

  router.post('/network/tests/cleanup', requireDevAuth, (req, res) => {
    const statuses = Array.isArray(req.body?.statuses) && req.body.statuses.length > 0
      ? req.body.statuses.map((status: unknown) => String(status).toLowerCase())
      : ['completed', 'failed', 'cancelled', 'unsupported'];

    const before = jobs.length;
    for (let index = jobs.length - 1; index >= 0; index -= 1) {
      const job = jobs[index];
      if (
        job.jobType === 'WIRELESS_ASSESSMENT' &&
        statuses.includes(String(job.status).toLowerCase())
      ) {
        jobs.splice(index, 1);
      }
    }

    sendSuccess(res, {
      deletedCount: before - jobs.length,
      statuses,
    });
  });

  router.get('/network/tests/:id/report', requireDevAuth, async (req, res) => {
    const job = findJob(req.params.id);
    if (!job || job.jobType !== 'WIRELESS_ASSESSMENT') {
      sendError(res, 404, 'NOT_FOUND', 'Network assessment job not found');
      return;
    }

    const summary = job.resultSummary || {};
    const target =
      (job.payload && typeof job.payload === 'object' ? (job.payload.target as Record<string, unknown>) : null) ||
      {};
    const findings = Array.isArray(summary.findings) ? summary.findings : [];
    const checks = Array.isArray(summary.assessmentChecks) ? summary.assessmentChecks : [];

    await sendPdfReport(res, `network-report-${job.id}.pdf`, {
      title: 'Wireless Network Assessment Report',
      intro:
        'This report contains the observed wireless assessment data collected inside the authorized environment. Unsupported or missing runner data is shown as Not available.',
      summary: {
        SSID: summary.targetSsid || target.ssid || 'Not available',
        BSSID: summary.targetBssid || target.bssid || 'Not available',
        Status: job.status,
        Security: summary.security || 'Not available',
        Findings: findings.length,
        'Started At': job.startedAt || job.createdAt,
        'Completed At': job.completedAt || 'Not available',
      },
      tables: [
        {
          title: 'Assessment Findings',
          headers: ['Severity', 'Type', 'Title', 'Description', 'Recommendation'],
          rows: findings.map((finding: any) => [
            finding.severity,
            finding.type,
            finding.title,
            finding.description,
            finding.remediation || finding.recommendation,
          ]),
        },
        {
          title: 'Execution Checks',
          headers: ['Check', 'Status', 'Detail'],
          rows: checks.map((check: any) => [check.title || check.name, check.status, check.detail]),
        },
      ],
    });
  });

  router.get('/phishing/campaigns', requireDevAuth, (_req, res) => {
    sendSuccess(res, { campaigns });
  });

  router.post('/phishing/campaigns', requireDevAuth, (req, res) => {
    const id = randomUUID();
    const createdAt = now();
    const campaign: DevCampaign = {
      id,
      name: req.body?.name || 'حملة تطوير',
      authorizationId: req.body?.authorizationId,
      status: 'queued',
      targets: req.body?.targets || [],
      emailTemplate: req.body?.emailTemplate || null,
      landingPage: req.body?.landingPage || null,
      lastJobId: null,
      resultSummary: {
        interactions: [],
        deliveredCount: 0,
        failedCount: 0,
        note: 'لم يستلم خادم التطوير نتائج تنفيذ فعلية بعد.',
      },
      createdAt,
      updatedAt: createdAt,
    };
    campaigns.unshift(campaign);
    sendSuccess(res, { campaignId: id, campaign }, 201);
  });

  router.get('/phishing/campaigns/:id', requireDevAuth, (req, res) => {
    const campaign = campaigns.find((item) => item.id === req.params.id);
    if (!campaign) {
      sendError(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign was not found');
      return;
    }
    sendSuccess(res, { campaign });
  });

  router.post('/phishing/campaigns/:id/launch', requireDevAuth, (req, res) => {
    const campaign = campaigns.find((item) => item.id === req.params.id);
    if (campaign) {
      campaign.status = 'running';
      campaign.lastJobId = campaign.lastJobId || randomUUID();
      campaign.updatedAt = now();
    }
    sendSuccess(res, { campaignId: req.params.id, status: 'running' });
  });

  router.get('/phishing/campaigns/:id/results', requireDevAuth, (req, res) => {
    const campaign = campaigns.find((item) => item.id === req.params.id);
    if (!campaign) {
      sendError(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign was not found');
      return;
    }

    sendSuccess(res, {
      results: {
        campaignId: campaign.id,
        status: campaign.status,
        targets: campaign.targets,
        result_summary: campaign.resultSummary || {
          interactions: [],
          deliveredCount: 0,
          failedCount: 0,
        },
        evidence: [],
        generatedAt: now(),
        source: 'development-memory-fallback',
        note: 'لا توجد نتائج تنفيذ فعلية حتى الآن؛ هذه الاستجابة تعرض الحالة المخزنة فقط.',
      },
    });
  });

  router.get('/phishing/campaigns/:id/report', requireDevAuth, async (req, res) => {
    const campaign = campaigns.find((item) => item.id === req.params.id);
    if (!campaign) {
      sendError(res, 404, 'CAMPAIGN_NOT_FOUND', 'Campaign was not found');
      return;
    }

    const summary = campaign.resultSummary || {};
    const interactions = Array.isArray(summary.interactions) ? summary.interactions : [];
    const targets = Array.isArray(campaign.targets) ? campaign.targets : [];

    await sendPdfReport(res, `campaign-report-${campaign.id}.pdf`, {
      title: 'Phishing Awareness Campaign Report',
      intro:
        'This report summarizes the authorized internal awareness campaign. It includes only stored execution data; missing runner results are shown as Not available.',
      summary: {
        Campaign: campaign.name,
        Status: campaign.status,
        Targets: targets.length,
        Interactions: interactions.length,
        Delivered: summary.deliveredCount ?? 0,
        Failed: summary.failedCount ?? 0,
        'Created At': campaign.createdAt,
        'Updated At': campaign.updatedAt,
      },
      tables: [
        {
          title: 'Targets',
          headers: ['Target', 'Status'],
          rows: targets.map((target: any) => [
            typeof target === 'string' ? target : target.email || target.address,
            typeof target === 'string' ? 'Queued' : target.status || 'Queued',
          ]),
        },
        {
          title: 'Interactions',
          headers: ['Type', 'Target', 'Time', 'Metadata'],
          rows: interactions.map((interaction: any) => [
            interaction.type,
            interaction.target || interaction.email,
            interaction.createdAt || interaction.created_at,
            interaction.metadata,
          ]),
        },
      ],
    });
  });

  router.get('/reports', requireDevAuth, (_req, res) => sendSuccess(res, { reports }));
  router.get('/reports/:id', requireDevAuth, async (req, res) => {
    const report = reports.find((item) => item.id === req.params.id);
    if (!report) {
      sendError(res, 404, 'NOT_FOUND', 'Report not found');
      return;
    }

    if (typeof req.query.format === 'string') {
      await sendPdfReport(res, `report-${report.id}.pdf`, {
        title: `${report.report_type} Report`,
        intro:
          'This report was generated from the approved internal platform data. The summary and tables below reflect the currently stored report metadata.',
        summary: {
          'Report ID': report.id,
          Type: report.report_type,
          Format: report.format,
          Status: report.status,
          'Generated At': report.generated_at,
        },
        tables: [
          {
            title: 'Report Metadata',
            headers: ['Field', 'Value'],
            rows: Object.entries(report.metadata || {}),
          },
        ],
      });
      return;
    }

    sendSuccess(res, { report });
  });
  router.post('/reports', requireDevAuth, (req, res) => {
    const report = createReport(req.body?.reportType || 'GENERAL', req.body?.format || 'PDF', req.body?.metadata || {});
    sendSuccess(res, { reportId: report.id, status: report.status }, 201);
  });
  router.post('/reports/compliance', requireDevAuth, (req, res) => {
    const report = createReport('COMPLIANCE', req.body?.format || 'PDF', req.body?.metadata || {});
    sendSuccess(res, { reportId: report.id, status: report.status }, 201);
  });

  router.get('/audit/logs', requireDevAuth, (_req, res) => {
    sendSuccess(res, {
      logs: auditLogs,
      total: auditLogs.length,
      limit: auditLogs.length,
      offset: 0,
    });
  });

  return router;
}

function createReport(
  reportType: string,
  format: string,
  metadata: Record<string, unknown>
): DevReport {
  const report: DevReport = {
    id: randomUUID(),
    job_id: null,
    report_type: reportType,
    format,
    status: 'queued',
    metadata,
    generated_at: now(),
  };
  reports.unshift(report);
  return report;
}

export function createDevFallbackApp(): Application {
  const fallbackApp = express();
  fallbackApp.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  fallbackApp.use(cors());
  fallbackApp.use(express.json({ limit: '10mb' }));
  fallbackApp.use(express.urlencoded({ extended: true, limit: '10mb' }));
  fallbackApp.use(internetConnectivityMiddleware);

  fallbackApp.get('/health', (_req, res) => {
    sendSuccess(res, {
      status: 'ok',
      mode: 'development-memory-fallback',
      timestamp: now(),
      version: config.apiVersion,
    });
  });

  fallbackApp.get('/api/v1/system/connectivity', async (_req, res) => {
    const status = await checkInternetConnectivity(true);
    res.status(status.online ? 200 : 503).json({
      success: status.online,
      data: status,
      error: status.online
        ? undefined
        : {
            code: 'INTERNET_CONNECTION_REQUIRED',
            message: status.message,
          },
      timestamp: now(),
    });
  });

  fallbackApp.use('/api/v1', buildDevRouter());
  fallbackApp.use(express.static(path.join(__dirname, '../../public')));

  fallbackApp.use((_req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  });

  return fallbackApp;
}
