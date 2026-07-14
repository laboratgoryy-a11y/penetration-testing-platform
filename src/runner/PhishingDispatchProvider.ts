import nodemailer from 'nodemailer';
import { UnsupportedCapabilityError } from '../core/types';
import {
  PhishingDispatchProvider as PhishingDispatchProviderContract,
  ProviderResult,
  RunnerExecutionContext,
} from './providers';

interface CampaignTarget {
  email: string;
  name?: string;
}

interface EmailTemplate {
  subject?: string;
  html?: string;
  text?: string;
}

interface PhishingPayload {
  campaignId?: string;
  targets?: CampaignTarget[];
  emailTemplate?: EmailTemplate;
}

function requireMailConfiguration(): {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromEmail: string;
  fromName: string;
} {
  const host = process.env.SMTP_HOST?.trim();
  const fromEmail = process.env.EMAIL_FROM_EMAIL?.trim();

  if (!host || !fromEmail) {
    throw new UnsupportedCapabilityError(
      'PHISHING_DISPATCH requires SMTP_HOST and EMAIL_FROM_EMAIL to be configured'
    );
  }

  return {
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER?.trim() || undefined,
    pass: process.env.SMTP_PASSWORD?.trim() || undefined,
    fromEmail,
    fromName: process.env.EMAIL_FROM_NAME?.trim() || 'Security Team',
  };
}

function renderTemplate(template: string | undefined, target: CampaignTarget): string {
  const source = template || '';
  return source
    .replace(/\{\{name\}\}/g, target.name || target.email)
    .replace(/\{\{email\}\}/g, target.email);
}

export class PhishingDispatchProvider
  implements PhishingDispatchProviderContract
{
  async execute(context: RunnerExecutionContext): Promise<ProviderResult> {
    const payload = (context.job.payload || {}) as PhishingPayload;
    const targets = Array.isArray(payload.targets) ? payload.targets : [];
    if (targets.length === 0) {
      throw new UnsupportedCapabilityError(
        'PHISHING_DISPATCH payload must include at least one target'
      );
    }

    const config = requireMailConfiguration();
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth:
        config.user && config.pass
          ? {
              user: config.user,
              pass: config.pass,
            }
          : undefined,
    });

    const deliveries: Array<Record<string, unknown>> = [];

    await context.appendLog('info', 'Starting phishing dispatch', {
      campaignId: payload.campaignId || null,
      totalTargets: targets.length,
    });

    for (const target of targets) {
      const subject = renderTemplate(
        payload.emailTemplate?.subject || 'Security Awareness Check',
        target
      );
      const html = renderTemplate(payload.emailTemplate?.html, target);
      const text = renderTemplate(payload.emailTemplate?.text, target);

      const result = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: target.email,
        subject,
        html: html || undefined,
        text: text || undefined,
      });

      deliveries.push({
        email: target.email,
        accepted: result.accepted,
        rejected: result.rejected,
        messageId: result.messageId,
      });
    }

    const totalSent = deliveries.filter(
      (delivery) =>
        Array.isArray(delivery.accepted) && delivery.accepted.length > 0
    ).length;
    const totalFailed = deliveries.length - totalSent;

    await context.uploadArtifact({
      artifactType: 'PHISHING_DISPATCH_LOG',
      fileName: `phishing-dispatch-${context.job.id}.json`,
      contentType: 'application/json',
      body: JSON.stringify(
        {
          dispatchedAt: new Date().toISOString(),
          campaignId: payload.campaignId || null,
          deliveries,
        },
        null,
        2
      ),
      metadata: {
        totalTargets: targets.length,
        totalSent,
        totalFailed,
      },
    });

    await context.appendLog('info', 'Completed phishing dispatch', {
      campaignId: payload.campaignId || null,
      totalTargets: targets.length,
      totalSent,
      totalFailed,
    });

    return {
      summary: {
        campaignId: payload.campaignId || null,
        totalTargets: targets.length,
        totalSent,
        totalFailed,
        deliveries,
        interactions: [],
      },
    };
  }
}
