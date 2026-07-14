import PDFDocument from 'pdfkit';
import { UnsupportedCapabilityError } from '../core/types';
import {
  ProviderResult,
  ReportGenerationProvider as ReportGenerationProviderContract,
  RunnerExecutionContext,
} from './providers';

interface ReportPayload {
  reportType?: string;
  format?: string;
  sourceJobId?: string;
  metadata?: Record<string, unknown>;
  sourceJob?: Record<string, unknown>;
}

function normalizeFormat(format: unknown): 'JSON' | 'HTML' | 'PDF' {
  const normalized = typeof format === 'string' ? format.toUpperCase() : 'PDF';
  if (normalized === 'JSON' || normalized === 'HTML' || normalized === 'PDF') {
    return normalized;
  }

  throw new UnsupportedCapabilityError(`Unsupported report format: ${String(format)}`);
}

function buildFileName(payload: ReportPayload, format: 'JSON' | 'HTML' | 'PDF'): string {
  const sourceName =
    typeof payload.sourceJobId === 'string' && payload.sourceJobId.trim()
      ? payload.sourceJobId.trim()
      : 'report';
  const reportType =
    typeof payload.reportType === 'string' && payload.reportType.trim()
      ? payload.reportType.trim().toLowerCase()
      : 'report';
  return `${sourceName}-${reportType}-report.${format.toLowerCase()}`;
}

function buildReportDocument(
  context: RunnerExecutionContext,
  payload: ReportPayload,
  format: 'JSON' | 'HTML' | 'PDF'
): Record<string, unknown> {
  return {
    generatedAt: new Date().toISOString(),
    reportType: payload.reportType || 'REPORT',
    format,
    jobId: context.job.id,
    sourceJobId: payload.sourceJobId || null,
    metadata: payload.metadata || {},
    sourceJob: payload.sourceJob || null,
  };
}

function renderHtml(document: Record<string, unknown>): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Security Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1f2933; }
    h1 { color: #102a43; }
    pre { background: #f0f4f8; padding: 16px; border-radius: 8px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>Security Report</h1>
  <pre>${JSON.stringify(document, null, 2)}</pre>
</body>
</html>`;
}

async function renderPdf(document: Record<string, unknown>): Promise<Buffer> {
  const pdf = new PDFDocument({
    margin: 48,
  });
  const chunks: Buffer[] = [];

  pdf.on('data', (chunk) => {
    chunks.push(Buffer.from(chunk));
  });

  const completed = new Promise<Buffer>((resolve, reject) => {
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
  });

  pdf.fontSize(20).text('Security Report');
  pdf.moveDown();
  pdf.fontSize(11).text(JSON.stringify(document, null, 2));
  pdf.end();

  return completed;
}

export class ReportGenerationProvider
  implements ReportGenerationProviderContract
{
  async execute(context: RunnerExecutionContext): Promise<ProviderResult> {
    const payload = (context.job.payload || {}) as ReportPayload;
    const format = normalizeFormat(payload.format);
    const reportDocument = buildReportDocument(context, payload, format);
    const fileName = buildFileName(payload, format);

    await context.appendLog('info', 'Generating report artifact', {
      reportType: payload.reportType || 'REPORT',
      format,
    });

    if (format === 'JSON') {
      const body = JSON.stringify(reportDocument, null, 2);
      await context.uploadArtifact({
        artifactType: 'REPORT',
        fileName,
        contentType: 'application/json',
        body,
        metadata: {
          reportType: payload.reportType || 'REPORT',
          format,
        },
      });

      return {
        summary: {
          artifactType: 'REPORT',
          fileName,
          format,
          reportType: payload.reportType || 'REPORT',
        },
      };
    }

    if (format === 'HTML') {
      const body = renderHtml(reportDocument);
      await context.uploadArtifact({
        artifactType: 'REPORT',
        fileName,
        contentType: 'text/html',
        body,
        metadata: {
          reportType: payload.reportType || 'REPORT',
          format,
        },
      });

      return {
        summary: {
          artifactType: 'REPORT',
          fileName,
          format,
          reportType: payload.reportType || 'REPORT',
        },
      };
    }

    const body = await renderPdf(reportDocument);
    await context.uploadArtifact({
      artifactType: 'REPORT',
      fileName,
      contentType: 'application/pdf',
      body,
      metadata: {
        reportType: payload.reportType || 'REPORT',
        format,
      },
    });

    return {
      summary: {
        artifactType: 'REPORT',
        fileName,
        format,
        reportType: payload.reportType || 'REPORT',
      },
    };
  }
}
