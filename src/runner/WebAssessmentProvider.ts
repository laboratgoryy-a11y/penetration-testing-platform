import { load } from 'cheerio';
import { fetch } from 'undici';
import { FindingEvidence, UnsupportedCapabilityError } from '../core/types';
import {
  ProviderResult,
  RunnerExecutionContext,
  WebAssessmentProvider as WebAssessmentProviderContract,
} from './providers';

interface WebScanPayload {
  target?: {
    url?: string;
  };
  config?: {
    maxDepth?: number;
    maxRequests?: number;
    requestTimeoutMs?: number;
    vulnerabilityTypes?: string[];
  };
}

interface CrawledPage {
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  contentType: string;
  formsCount: number;
  linksCount: number;
  responseTimeMs: number;
}

interface PageError {
  url: string;
  depth: number;
  error: string;
}

interface WebFinding {
  type: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: 'high' | 'medium' | 'low';
  description: string;
  location: string;
  evidence: FindingEvidence[];
}

function normalizeHeaderName(name: string): string {
  return name.toLowerCase();
}

function resolveTargetUrl(payload: WebScanPayload): URL {
  const targetUrl = payload.target?.url;
  if (typeof targetUrl !== 'string' || targetUrl.trim().length === 0) {
    throw new UnsupportedCapabilityError('WEB_SCAN payload must include a target.url');
  }

  return new URL(targetUrl);
}

function toAbsoluteSameOriginUrl(baseUrl: URL, currentUrl: URL, href: string): string | null {
  try {
    const resolved = new URL(href, currentUrl);
    if (resolved.origin !== baseUrl.origin) {
      return null;
    }
    if (!['http:', 'https:'].includes(resolved.protocol)) {
      return null;
    }

    resolved.hash = '';
    return resolved.toString();
  } catch {
    return null;
  }
}

function buildMissingHeaderFinding(
  pageUrl: string,
  headerName: string,
  statusCode: number
): WebFinding {
  return {
    type: 'MISSING_SECURITY_HEADER',
    title: `Missing ${headerName}`,
    severity: 'medium',
    confidence: 'high',
    description: `The response for ${pageUrl} does not include the ${headerName} security header.`,
    location: pageUrl,
    evidence: [
      {
        type: 'http_response',
        description: `HTTP ${statusCode} response for ${pageUrl} did not include ${headerName}.`,
      },
    ],
  };
}

function buildCsrfFinding(pageUrl: string, formAction: string, formIndex: number): WebFinding {
  return {
    type: 'CSRF',
    title: 'POST form appears to lack anti-CSRF token',
    severity: 'medium',
    confidence: 'medium',
    description:
      'A POST form was discovered without an obvious anti-CSRF token field. This is a passive indication and should be verified manually.',
    location: pageUrl,
    evidence: [
      {
        type: 'observation',
        description: `Form #${formIndex + 1} action=${formAction || pageUrl} did not include a recognized CSRF token field.`,
      },
    ],
  };
}

function buildReflectedInputFinding(
  pageUrl: string,
  parameterName: string,
  parameterValue: string
): WebFinding {
  return {
    type: 'XSS',
    title: 'Reflected input detected in HTML response',
    severity: 'low',
    confidence: 'low',
    description:
      'A user-supplied query parameter value was reflected in the HTML response. Reflection alone is not proof of XSS, but it deserves manual verification.',
    location: pageUrl,
    evidence: [
      {
        type: 'response_fragment',
        description: `Query parameter "${parameterName}" value was reflected in the response body.`,
        value: parameterValue,
      },
    ],
  };
}

function buildCookieFinding(
  pageUrl: string,
  cookieName: string,
  issue: 'MISSING_SECURE' | 'MISSING_SAMESITE'
): WebFinding {
  const issueText =
    issue === 'MISSING_SECURE'
      ? 'does not declare the Secure attribute'
      : 'does not declare a SameSite attribute';

  return {
    type: 'SECURITY_MISCONFIGURATION',
    title: `Cookie ${cookieName} ${issueText}`,
    severity: issue === 'MISSING_SECURE' ? 'medium' : 'low',
    confidence: 'medium',
    description: `The cookie "${cookieName}" ${issueText}. This may increase exposure to session leakage or cross-site request risks.`,
    location: pageUrl,
    evidence: [
      {
        type: 'http_response',
        description: `Observed Set-Cookie for "${cookieName}" without the expected attribute.`,
      },
    ],
  };
}

function buildDirectoryListingFinding(pageUrl: string): WebFinding {
  return {
    type: 'SECURITY_MISCONFIGURATION',
    title: 'Directory listing signature detected',
    severity: 'medium',
    confidence: 'medium',
    description:
      'The response body matched a common directory listing signature. Verify that directory browsing is intentionally enabled.',
    location: pageUrl,
    evidence: [
      {
        type: 'response_fragment',
        description: 'Detected "Index of /" style content in the HTML response.',
      },
    ],
  };
}

function isTextualContentType(contentType: string): boolean {
  return (
    contentType.includes('text/html') ||
    contentType.includes('application/xhtml+xml') ||
    contentType.includes('text/plain') ||
    contentType.includes('application/json')
  );
}

function normalizeSeverity(severity: string): 'low' | 'medium' | 'high' | 'critical' {
  if (severity === 'critical' || severity === 'high' || severity === 'medium') {
    return severity;
  }

  return 'low';
}

function deduplicateFindings(findings: WebFinding[]): WebFinding[] {
  const seen = new Set<string>();
  const output: WebFinding[] = [];

  for (const finding of findings) {
    const key = `${finding.type}:${finding.location}:${finding.title}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push({
      ...finding,
      severity: normalizeSeverity(finding.severity),
    });
  }

  return output;
}

export class WebAssessmentProvider implements WebAssessmentProviderContract {
  async execute(context: RunnerExecutionContext): Promise<ProviderResult> {
    const payload = (context.job.payload || {}) as WebScanPayload;
    const baseUrl = resolveTargetUrl(payload);
    const maxDepth = Math.max(Number(payload.config?.maxDepth || 1), 0);
    const maxRequests = Math.max(Number(payload.config?.maxRequests || 10), 1);
    const requestTimeoutMs = Math.min(
      Math.max(Number(payload.config?.requestTimeoutMs || 15000), 3000),
      30000
    );
    const requestedChecks = Array.isArray(payload.config?.vulnerabilityTypes)
      ? payload.config?.vulnerabilityTypes || []
      : [
          'MISSING_SECURITY_HEADER',
          'CSRF',
          'XSS',
          'SECURITY_MISCONFIGURATION',
          'INSECURE_TRANSPORT',
        ];

    const queue: Array<{ url: string; depth: number }> = [{ url: baseUrl.toString(), depth: 0 }];
    const queuedUrls = new Set<string>([baseUrl.toString()]);
    const visited = new Set<string>();
    const pages: CrawledPage[] = [];
    const findings: WebFinding[] = [];
    const pageErrors: PageError[] = [];

    const publishProgress = async (
      progress: number,
      statusMessage: string,
      extraSummary: Record<string, unknown> = {}
    ) => {
      const summary = {
        targetUrl: baseUrl.toString(),
        progress,
        statusMessage,
        urlsScanned: pages.length,
        totalRequests: visited.size,
        totalVulnerabilities: findings.length,
        pageErrors,
        requestedChecks,
        maxDepth,
        maxRequests,
        queueDepth: queue.length,
        ...extraSummary,
      };

      if (context.updateStatus) {
        await context.updateStatus('running', { resultSummary: summary });
      }
    };

    await context.appendLog('info', 'Starting web assessment', {
      targetUrl: baseUrl.toString(),
      maxDepth,
      maxRequests,
      requestTimeoutMs,
      requestedChecks,
    });
    await publishProgress(5, 'تهيئة فحص الويب');

    while (queue.length > 0 && visited.size < maxRequests) {
      const next = queue.shift();
      if (!next || visited.has(next.url)) {
        continue;
      }

      queuedUrls.delete(next.url);
      visited.add(next.url);

      const requestStartedAt = Date.now();

      try {
        await context.appendLog('info', 'Fetching page', {
          url: next.url,
          depth: next.depth,
          pageIndex: visited.size,
          remainingQueue: queue.length,
        });

        const response = await fetch(next.url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(requestTimeoutMs),
        });

        const responseTimeMs = Date.now() - requestStartedAt;
        const headers = Object.fromEntries(
          Array.from(response.headers.entries()).map(([name, value]) => [
            normalizeHeaderName(name),
            value,
          ])
        );
        const contentType = headers['content-type'] || 'application/octet-stream';
        const responseBody = isTextualContentType(contentType)
          ? await response.text()
          : await response.text();

        const page: CrawledPage = {
          url: next.url,
          statusCode: response.status,
          headers,
          contentType,
          formsCount: 0,
          linksCount: 0,
          responseTimeMs,
        };

        if (contentType.includes('text/html') || contentType.includes('application/xhtml+xml')) {
          const $ = load(responseBody);
          const links = $('a[href]')
            .map((_index, element) => $(element).attr('href'))
            .get()
            .filter((href): href is string => typeof href === 'string' && href.length > 0);
          const forms = $('form').toArray();
          page.formsCount = forms.length;
          page.linksCount = links.length;

          if (next.depth < maxDepth) {
            for (const href of links) {
              const resolved = toAbsoluteSameOriginUrl(baseUrl, new URL(next.url), href);
              if (resolved && !visited.has(resolved) && !queuedUrls.has(resolved)) {
                queue.push({ url: resolved, depth: next.depth + 1 });
                queuedUrls.add(resolved);
              }
            }
          }

          forms.forEach((element, index) => {
            const form = $(element);
            const method = (form.attr('method') || 'get').toLowerCase();
            if (method !== 'post') {
              return;
            }

            const hasCsrfToken =
              form.find('input[type="hidden"]').toArray().some((inputElement) => {
                const name = ($(inputElement).attr('name') || '').toLowerCase();
                return (
                  name.includes('csrf') ||
                  name.includes('_token') ||
                  name.includes('token') ||
                  name.includes('authenticity')
                );
              });

            if (!hasCsrfToken) {
              findings.push(
                buildCsrfFinding(next.url, form.attr('action') || next.url, index)
              );
            }
          });

          if (
            responseBody.includes('Index of /') ||
            responseBody.includes('<title>Index of ')
          ) {
            findings.push(buildDirectoryListingFinding(next.url));
          }

          const currentUrl = new URL(next.url);
          currentUrl.searchParams.forEach((value, key) => {
            if (value && responseBody.includes(value)) {
              findings.push(buildReflectedInputFinding(next.url, key, value));
            }
          });
        }

        pages.push(page);

        const requiredHeaders = [
          'content-security-policy',
          'x-frame-options',
          'x-content-type-options',
        ];

        for (const requiredHeader of requiredHeaders) {
          if (!headers[requiredHeader]) {
            findings.push(
              buildMissingHeaderFinding(next.url, requiredHeader, response.status)
            );
          }
        }

        const setCookieHeader = response.headers.getSetCookie();
        for (const cookieValue of setCookieHeader) {
          const cookieName = cookieValue.split('=')[0]?.trim() || 'cookie';
          if (baseUrl.protocol === 'https:' && !/;\s*secure/i.test(cookieValue)) {
            findings.push(buildCookieFinding(next.url, cookieName, 'MISSING_SECURE'));
          }
          if (!/;\s*samesite=/i.test(cookieValue)) {
            findings.push(buildCookieFinding(next.url, cookieName, 'MISSING_SAMESITE'));
          }
        }

        if (baseUrl.protocol === 'http:') {
          findings.push({
            type: 'INSECURE_TRANSPORT',
            title: 'Target served over HTTP',
            severity: 'medium',
            confidence: 'high',
            description: `The target ${baseUrl.toString()} is served over HTTP without transport encryption.`,
            location: next.url,
            evidence: [
              {
                type: 'request',
                description: `The scan target uses the ${baseUrl.protocol} protocol.`,
                value: baseUrl.toString(),
              },
            ],
          });
        }

        const progress = Math.min(
          90,
          Math.max(10, Math.round((visited.size / maxRequests) * 80) + 10)
        );

        await context.appendLog('info', 'Fetched page successfully', {
          url: next.url,
          statusCode: response.status,
          contentType,
          responseTimeMs,
          formsCount: page.formsCount,
          linksCount: page.linksCount,
          queuedPages: queue.length,
          findingsSoFar: findings.length,
        });

        await publishProgress(progress, `تم فحص ${pages.length} صفحة حتى الآن`, {
          currentUrl: next.url,
          lastStatusCode: response.status,
          averageResponseTimeMs:
            pages.length > 0
              ? Math.round(
                  pages.reduce((total, pageItem) => total + pageItem.responseTimeMs, 0) /
                    pages.length
                )
              : 0,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown fetch failure';
        pageErrors.push({
          url: next.url,
          depth: next.depth,
          error: message,
        });

        await context.appendLog('warning', 'Failed to fetch page', {
          url: next.url,
          depth: next.depth,
          error: message,
        });

        const progress = Math.min(
          90,
          Math.max(10, Math.round((visited.size / maxRequests) * 80) + 10)
        );

        await publishProgress(progress, `تعذر الوصول إلى ${next.url}`, {
          currentUrl: next.url,
          lastError: message,
        });
      }
    }

    const finalFindings = deduplicateFindings(findings);
    const averageResponseTimeMs =
      pages.length > 0
        ? Math.round(
            pages.reduce((total, page) => total + page.responseTimeMs, 0) / pages.length
          )
        : null;
    const completedChecks = [
      'فحص ترويسات الحماية',
      'تحليل النماذج وحقول POST',
      'رصد الانعكاس في الاستجابة',
      'مراجعة ملفات تعريف الارتباط',
      'رصد مؤشرات إعدادات غير آمنة',
    ];
    const limitations = [
      'النتائج الحالية مبنية على الفحص غير التداخلي للصفحات المتاحة دون تسجيل دخول إضافي.',
      'الثغرات التي تتطلب جلسة مصادق عليها أو تدفقات أعمال عميقة قد لا تظهر بدون بيانات دخول واختبارات مخصصة.',
    ];

    await publishProgress(95, 'جاري إنهاء الفحص وتجميع النتائج', {
      averageResponseTimeMs,
      totalVulnerabilities: finalFindings.length,
    });

    await context.uploadArtifact({
      artifactType: 'SCAN_RESULTS',
      fileName: `web-scan-${context.job.id}.json`,
      contentType: 'application/json',
      body: JSON.stringify(
        {
          scannedAt: new Date().toISOString(),
          target: baseUrl.toString(),
          pages,
          pageErrors,
          findings: finalFindings,
          requestedChecks,
          completedChecks,
          limitations,
          averageResponseTimeMs,
        },
        null,
        2
      ),
      metadata: {
        urlsScanned: pages.length,
        totalFindings: finalFindings.length,
        pageErrors: pageErrors.length,
      },
    });

    await context.appendLog('info', 'Completed web assessment', {
      urlsScanned: pages.length,
      totalFindings: finalFindings.length,
      pageErrors: pageErrors.length,
      averageResponseTimeMs,
    });

    return {
      summary: {
        progress: 100,
        statusMessage: 'اكتمل فحص الويب',
        targetUrl: baseUrl.toString(),
        urlsScanned: pages.length,
        totalRequests: visited.size,
        totalVulnerabilities: finalFindings.length,
        findings: finalFindings,
        pageErrors,
        requestedChecks,
        completedChecks,
        limitations,
        averageResponseTimeMs,
      },
    };
  }
}
