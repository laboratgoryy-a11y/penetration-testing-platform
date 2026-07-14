import { createHash, randomUUID } from 'crypto';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { config } from '../../config';
import { getRedisClient } from '../../database/connection';

interface RateLimiterOptions {
  keyPrefix: string;
  maxRequests: number;
  windowMs: number;
  code: string;
  message: string;
  resolveSubject?: (req: Request) => string | undefined;
}

const SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now_ms = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])
local member_id = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now_ms - window_ms)

local current = redis.call('ZCARD', key)
if current >= max_requests then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local oldest_score = now_ms
  if oldest[2] ~= nil then
    oldest_score = tonumber(oldest[2])
  end

  local retry_after_ms = math.max((oldest_score + window_ms) - now_ms, 1)
  return {0, 0, retry_after_ms}
end

redis.call('ZADD', key, now_ms, member_id)
redis.call('PEXPIRE', key, window_ms)

local remaining = max_requests - current - 1
return {1, remaining, window_ms}
`;

function normalizeValue(value: string | undefined): string {
  return value?.trim().toLowerCase() || '';
}

function getBearerToken(req: Request): string | undefined {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return undefined;
  }

  return authorization.slice(7).trim();
}

function getClientAddress(req: Request): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

function buildRateLimitKey(req: Request, options: RateLimiterOptions): string {
  const identityParts = [normalizeValue(getClientAddress(req))];
  const subject = normalizeValue(options.resolveSubject?.(req));
  if (subject) {
    identityParts.push(subject);
  }

  const hashedIdentity = createHash('sha256')
    .update(identityParts.join('|'))
    .digest('hex');

  return `rate-limit:${options.keyPrefix}:${hashedIdentity}`;
}

function setRateLimitHeaders(
  res: Response,
  options: RateLimiterOptions,
  remaining: number,
  retryAfterMs: number
): void {
  res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(remaining, 0)));
  res.setHeader(
    'X-RateLimit-Reset',
    String(Math.ceil((Date.now() + retryAfterMs) / 1000))
  );
  res.setHeader(
    'X-RateLimit-Policy',
    `${options.maxRequests};w=${Math.ceil(options.windowMs / 1000)}`
  );
}

function createRedisRateLimiter(options: RateLimiterOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    if (
      config.nodeEnv === 'test' &&
      process.env.ENABLE_RATE_LIMITS_IN_TEST !== 'true'
    ) {
      next();
      return;
    }

    void (async () => {
      const redis = await getRedisClient();
      const rateLimitKey = buildRateLimitKey(req, options);
      const nowMs = Date.now();
      const result = (await redis.eval(SLIDING_WINDOW_SCRIPT, {
        keys: [rateLimitKey],
        arguments: [
          String(nowMs),
          String(options.windowMs),
          String(options.maxRequests),
          `${nowMs}:${randomUUID()}`,
        ],
      })) as [number, number, number];

      const [allowed, remaining, retryAfterMs] = result;
      setRateLimitHeaders(res, options, remaining, retryAfterMs);

      if (allowed === 1) {
        next();
        return;
      }

      res.setHeader(
        'Retry-After',
        String(Math.max(1, Math.ceil(retryAfterMs / 1000)))
      );
      res.status(429).json({
        success: false,
        error: {
          code: options.code,
          message: options.message,
        },
        meta: {
          retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
        },
        timestamp: new Date().toISOString(),
      });
    })().catch(next);
  };
}

/**
 * General API rate limiter
 */
export const apiLimiter = createRedisRateLimiter({
  keyPrefix: 'api',
  maxRequests: config.rateLimit.maxRequests,
  windowMs: config.rateLimit.windowMs,
  code: 'RATE_LIMIT_EXCEEDED',
  message: 'Too many requests, please try again later',
});

/**
 * Login limiter
 */
export const loginLimiter = createRedisRateLimiter({
  keyPrefix: 'auth:login',
  maxRequests: config.rateLimit.loginMaxRequests,
  windowMs: config.rateLimit.loginWindowMs,
  code: 'LOGIN_RATE_LIMIT_EXCEEDED',
  message: 'Too many login attempts, please try again later',
  resolveSubject: (req) => {
    const username = req.body?.username;
    return typeof username === 'string' ? username : undefined;
  },
});

/**
 * Refresh token limiter
 */
export const refreshLimiter = createRedisRateLimiter({
  keyPrefix: 'auth:refresh',
  maxRequests: config.rateLimit.refreshMaxRequests,
  windowMs: config.rateLimit.refreshWindowMs,
  code: 'REFRESH_RATE_LIMIT_EXCEEDED',
  message: 'Too many token refresh attempts, please try again later',
});

/**
 * Password reset request limiter
 */
export const passwordResetRequestLimiter = createRedisRateLimiter({
  keyPrefix: 'auth:password-reset-request',
  maxRequests: config.rateLimit.passwordResetRequestMaxRequests,
  windowMs: config.rateLimit.passwordResetRequestWindowMs,
  code: 'PASSWORD_RESET_REQUEST_RATE_LIMIT_EXCEEDED',
  message: 'Too many password reset requests, please try again later',
  resolveSubject: (req) => {
    const email = req.body?.email;
    return typeof email === 'string' ? email : undefined;
  },
});

/**
 * Password reset confirmation limiter
 */
export const passwordResetConfirmLimiter = createRedisRateLimiter({
  keyPrefix: 'auth:password-reset-confirm',
  maxRequests: config.rateLimit.passwordResetConfirmMaxRequests,
  windowMs: config.rateLimit.passwordResetConfirmWindowMs,
  code: 'PASSWORD_RESET_CONFIRM_RATE_LIMIT_EXCEEDED',
  message: 'Too many password reset confirmation attempts, please try again later',
});

/**
 * MFA actions limiter
 */
export const mfaLimiter = createRedisRateLimiter({
  keyPrefix: 'auth:mfa',
  maxRequests: config.rateLimit.mfaMaxRequests,
  windowMs: config.rateLimit.mfaWindowMs,
  code: 'MFA_RATE_LIMIT_EXCEEDED',
  message: 'Too many MFA attempts, please try again later',
  resolveSubject: (req) => req.user?.userId,
});

/**
 * Password change limiter
 */
export const passwordChangeLimiter = createRedisRateLimiter({
  keyPrefix: 'auth:password-change',
  maxRequests: config.rateLimit.passwordChangeMaxRequests,
  windowMs: config.rateLimit.passwordChangeWindowMs,
  code: 'PASSWORD_CHANGE_RATE_LIMIT_EXCEEDED',
  message: 'Too many password change attempts, please try again later',
  resolveSubject: (req) => req.user?.userId,
});

/**
 * Authorization write limiter
 */
export const authorizationWriteLimiter = createRedisRateLimiter({
  keyPrefix: 'authorizations:write',
  maxRequests: config.rateLimit.authorizationWriteMaxRequests,
  windowMs: config.rateLimit.authorizationWriteWindowMs,
  code: 'AUTHORIZATION_WRITE_RATE_LIMIT_EXCEEDED',
  message: 'Too many authorization write operations, please try again later',
  resolveSubject: (req) => req.user?.userId,
});

/**
 * Authorization validation limiter
 */
export const authorizationValidationLimiter = createRedisRateLimiter({
  keyPrefix: 'authorizations:validate',
  maxRequests: config.rateLimit.authorizationValidationMaxRequests,
  windowMs: config.rateLimit.authorizationValidationWindowMs,
  code: 'AUTHORIZATION_VALIDATION_RATE_LIMIT_EXCEEDED',
  message: 'Too many authorization validation requests, please try again later',
  resolveSubject: (req) => req.user?.userId,
});

/**
 * Report generation limiter
 */
export const reportGenerationLimiter = createRedisRateLimiter({
  keyPrefix: 'reports:generation',
  maxRequests: config.rateLimit.reportGenerationMaxRequests,
  windowMs: config.rateLimit.reportGenerationWindowMs,
  code: 'REPORT_GENERATION_RATE_LIMIT_EXCEEDED',
  message: 'Too many report generation requests, please try again later',
  resolveSubject: (req) => req.user?.userId,
});

/**
 * Job cancellation limiter
 */
export const jobCancellationLimiter = createRedisRateLimiter({
  keyPrefix: 'jobs:cancel',
  maxRequests: config.rateLimit.jobCancellationMaxRequests,
  windowMs: config.rateLimit.jobCancellationWindowMs,
  code: 'JOB_CANCELLATION_RATE_LIMIT_EXCEEDED',
  message: 'Too many job cancellation requests, please try again later',
  resolveSubject: (req) => req.user?.userId,
});

/**
 * Runner registration limiter
 */
export const runnerRegistrationLimiter = createRedisRateLimiter({
  keyPrefix: 'runners:register',
  maxRequests: config.rateLimit.runnerRegistrationMaxRequests,
  windowMs: config.rateLimit.runnerRegistrationWindowMs,
  code: 'RUNNER_REGISTRATION_RATE_LIMIT_EXCEEDED',
  message: 'Too many runner registration attempts, please try again later',
  resolveSubject: (req) => {
    const manifest = req.body?.manifest;
    if (typeof manifest === 'string') {
      return manifest;
    }
    if (manifest && typeof manifest === 'object') {
      const typedManifest = manifest as Record<string, unknown>;
      if (typeof typedManifest.runnerName === 'string') {
        return typedManifest.runnerName;
      }
      if (typeof typedManifest.hostname === 'string') {
        return typedManifest.hostname;
      }
    }
    return undefined;
  },
});

/**
 * Runner heartbeat limiter
 */
export const runnerHeartbeatLimiter = createRedisRateLimiter({
  keyPrefix: 'runners:heartbeat',
  maxRequests: config.rateLimit.runnerHeartbeatMaxRequests,
  windowMs: config.rateLimit.runnerHeartbeatWindowMs,
  code: 'RUNNER_HEARTBEAT_RATE_LIMIT_EXCEEDED',
  message: 'Too many runner heartbeat updates, please try again later',
  resolveSubject: (req) => getBearerToken(req),
});

/**
 * Runner claim limiter
 */
export const runnerClaimLimiter = createRedisRateLimiter({
  keyPrefix: 'runners:claim',
  maxRequests: config.rateLimit.runnerClaimMaxRequests,
  windowMs: config.rateLimit.runnerClaimWindowMs,
  code: 'RUNNER_JOB_CLAIM_RATE_LIMIT_EXCEEDED',
  message: 'Too many runner job claim attempts, please try again later',
  resolveSubject: (req) => getBearerToken(req),
});

/**
 * Runner log limiter
 */
export const runnerLogLimiter = createRedisRateLimiter({
  keyPrefix: 'runners:logs',
  maxRequests: config.rateLimit.runnerLogMaxRequests,
  windowMs: config.rateLimit.runnerLogWindowMs,
  code: 'RUNNER_JOB_LOG_RATE_LIMIT_EXCEEDED',
  message: 'Too many runner job log updates, please try again later',
  resolveSubject: (req) => getBearerToken(req),
});

/**
 * Runner artifact upload limiter
 */
export const runnerArtifactUploadLimiter = createRedisRateLimiter({
  keyPrefix: 'runners:artifacts',
  maxRequests: config.rateLimit.runnerArtifactUploadMaxRequests,
  windowMs: config.rateLimit.runnerArtifactUploadWindowMs,
  code: 'RUNNER_ARTIFACT_UPLOAD_RATE_LIMIT_EXCEEDED',
  message: 'Too many runner artifact uploads, please try again later',
  resolveSubject: (req) => getBearerToken(req),
});

/**
 * Runner status limiter
 */
export const runnerStatusUpdateLimiter = createRedisRateLimiter({
  keyPrefix: 'runners:status',
  maxRequests: config.rateLimit.runnerStatusUpdateMaxRequests,
  windowMs: config.rateLimit.runnerStatusUpdateWindowMs,
  code: 'RUNNER_STATUS_UPDATE_RATE_LIMIT_EXCEEDED',
  message: 'Too many runner status updates, please try again later',
  resolveSubject: (req) => getBearerToken(req),
});

/**
 * Runner completion limiter
 */
export const runnerCompletionLimiter = createRedisRateLimiter({
  keyPrefix: 'runners:complete',
  maxRequests: config.rateLimit.runnerCompletionMaxRequests,
  windowMs: config.rateLimit.runnerCompletionWindowMs,
  code: 'RUNNER_JOB_COMPLETION_RATE_LIMIT_EXCEEDED',
  message: 'Too many runner completion updates, please try again later',
  resolveSubject: (req) => getBearerToken(req),
});

/**
 * Scan operation limiter
 */
export const scanLimiter = createRedisRateLimiter({
  keyPrefix: 'scan',
  maxRequests: config.rateLimit.scanMaxRequests,
  windowMs: config.rateLimit.scanWindowMs,
  code: 'SCAN_RATE_LIMIT_EXCEEDED',
  message: 'Too many scan requests, please try again later',
  resolveSubject: (req) => req.user?.userId,
});
