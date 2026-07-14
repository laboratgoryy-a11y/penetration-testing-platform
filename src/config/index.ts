import dotenv from 'dotenv';
import { validateRuntimeConfig } from '../core/runtime/runtimeConfig';

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';
const port = parseInt(process.env.PORT || '3000', 10);
const apiVersion = process.env.API_VERSION || 'v1';
const jwtSecret = process.env.JWT_SECRET || (nodeEnv === 'test' ? 'test-jwt-secret' : '');
const encryptionKey =
  process.env.ENCRYPTION_KEY ||
  (nodeEnv === 'test' ? '12345678901234567890123456789012' : '');
const runnerRegistrationSecret =
  process.env.RUNNER_REGISTRATION_SECRET ||
  (nodeEnv === 'test' ? 'test-runner-registration-secret' : '');
const emailFromEmail =
  process.env.EMAIL_FROM_EMAIL || (nodeEnv === 'test' ? 'security@test.local' : '');
const phishingLandingUrl =
  process.env.PHISHING_LANDING_URL ||
  (nodeEnv === 'test' ? 'http://localhost:3000' : '');
const phishingTrackingUrl =
  process.env.PHISHING_TRACKING_URL ||
  (nodeEnv === 'test' ? 'http://localhost:3000/track' : '');
const passwordResetUrl =
  process.env.PASSWORD_RESET_URL ||
  (nodeEnv === 'test' ? 'http://localhost/reset-password' : '');
const requireInternetConnection =
  process.env.REQUIRE_INTERNET_CONNECTION !== 'false' && nodeEnv !== 'test';
const internetCheckHosts = (
  process.env.INTERNET_CHECK_HOSTS ||
  process.env.INTERNET_CHECK_HOST ||
  'cloudflare.com,google.com,microsoft.com'
)
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

const databaseUrl =
  process.env.DATABASE_URL ||
  `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'penetration_testing_platform'}`;

const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_PASSWORD ? `:${process.env.REDIS_PASSWORD}@` : ''}${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;

const s3Bucket = process.env.S3_BUCKET || 'pentest-artifacts';

validateRuntimeConfig({
  nodeEnv,
  jwtSecret,
  encryptionKey,
  runnerRegistrationSecret,
  databaseUrl,
  redisUrl,
  s3Bucket,
  emailFromEmail,
  phishingLandingUrl,
  phishingTrackingUrl,
  passwordResetUrl,
});

export const config = {
  port,
  nodeEnv,
  apiVersion,
  database: {
    url: databaseUrl,
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20', 10),
  },
  redis: {
    url: redisUrl,
  },
  jwt: {
    secret: jwtSecret,
    refreshSecret: process.env.JWT_REFRESH_SECRET || `${jwtSecret}_refresh`,
    expiresIn: process.env.JWT_EXPIRES_IN || '30m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  encryption: {
    key: encryptionKey,
  },
  runner: {
    registrationSecret: runnerRegistrationSecret,
    heartbeatGraceSeconds: parseInt(
      process.env.RUNNER_HEARTBEAT_GRACE_SECONDS || '90',
      10
    ),
  },
  objectStorage: {
    bucket: s3Bucket,
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  },
  security: {
    mfaIssuer: process.env.MFA_ISSUER || 'PenetrationTestingPlatform',
    failedLoginAttemptsLimit: parseInt(
      process.env.FAILED_LOGIN_ATTEMPTS_LIMIT || '5',
      10
    ),
    passwordMinLength: parseInt(
      process.env.PASSWORD_MIN_LENGTH || '12',
      10
    ),
    passwordMaxLength: parseInt(
      process.env.PASSWORD_MAX_LENGTH || '128',
      10
    ),
    passwordResetUrl,
    passwordResetTtlMinutes: parseInt(
      process.env.PASSWORD_RESET_TTL_MINUTES || '60',
      10
    ),
    passwordResetCooldownMinutes: parseInt(
      process.env.PASSWORD_RESET_COOLDOWN_MINUTES || '15',
      10
    ),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    loginWindowMs: parseInt(
      process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000',
      10
    ),
    loginMaxRequests: parseInt(
      process.env.LOGIN_RATE_LIMIT_MAX_REQUESTS || '5',
      10
    ),
    refreshWindowMs: parseInt(
      process.env.REFRESH_RATE_LIMIT_WINDOW_MS || '900000',
      10
    ),
    refreshMaxRequests: parseInt(
      process.env.REFRESH_RATE_LIMIT_MAX_REQUESTS || '10',
      10
    ),
    passwordResetRequestWindowMs: parseInt(
      process.env.PASSWORD_RESET_REQUEST_RATE_LIMIT_WINDOW_MS || '1800000',
      10
    ),
    passwordResetRequestMaxRequests: parseInt(
      process.env.PASSWORD_RESET_REQUEST_RATE_LIMIT_MAX_REQUESTS || '3',
      10
    ),
    passwordResetConfirmWindowMs: parseInt(
      process.env.PASSWORD_RESET_CONFIRM_RATE_LIMIT_WINDOW_MS || '1800000',
      10
    ),
    passwordResetConfirmMaxRequests: parseInt(
      process.env.PASSWORD_RESET_CONFIRM_RATE_LIMIT_MAX_REQUESTS || '5',
      10
    ),
    passwordChangeWindowMs: parseInt(
      process.env.PASSWORD_CHANGE_RATE_LIMIT_WINDOW_MS || '1800000',
      10
    ),
    passwordChangeMaxRequests: parseInt(
      process.env.PASSWORD_CHANGE_RATE_LIMIT_MAX_REQUESTS || '5',
      10
    ),
    authorizationWriteWindowMs: parseInt(
      process.env.AUTHORIZATION_WRITE_RATE_LIMIT_WINDOW_MS || '1800000',
      10
    ),
    authorizationWriteMaxRequests: parseInt(
      process.env.AUTHORIZATION_WRITE_RATE_LIMIT_MAX_REQUESTS || '20',
      10
    ),
    authorizationValidationWindowMs: parseInt(
      process.env.AUTHORIZATION_VALIDATION_RATE_LIMIT_WINDOW_MS || '900000',
      10
    ),
    authorizationValidationMaxRequests: parseInt(
      process.env.AUTHORIZATION_VALIDATION_RATE_LIMIT_MAX_REQUESTS || '60',
      10
    ),
    reportGenerationWindowMs: parseInt(
      process.env.REPORT_GENERATION_RATE_LIMIT_WINDOW_MS || '1800000',
      10
    ),
    reportGenerationMaxRequests: parseInt(
      process.env.REPORT_GENERATION_RATE_LIMIT_MAX_REQUESTS || '10',
      10
    ),
    jobCancellationWindowMs: parseInt(
      process.env.JOB_CANCELLATION_RATE_LIMIT_WINDOW_MS || '900000',
      10
    ),
    jobCancellationMaxRequests: parseInt(
      process.env.JOB_CANCELLATION_RATE_LIMIT_MAX_REQUESTS || '20',
      10
    ),
    mfaWindowMs: parseInt(
      process.env.MFA_RATE_LIMIT_WINDOW_MS || '900000',
      10
    ),
    mfaMaxRequests: parseInt(
      process.env.MFA_RATE_LIMIT_MAX_REQUESTS || '10',
      10
    ),
    scanWindowMs: parseInt(
      process.env.SCAN_RATE_LIMIT_WINDOW_MS || '3600000',
      10
    ),
    scanMaxRequests: parseInt(
      process.env.SCAN_RATE_LIMIT_MAX_REQUESTS || '10',
      10
    ),
    runnerRegistrationWindowMs: parseInt(
      process.env.RUNNER_REGISTRATION_RATE_LIMIT_WINDOW_MS || '900000',
      10
    ),
    runnerRegistrationMaxRequests: parseInt(
      process.env.RUNNER_REGISTRATION_RATE_LIMIT_MAX_REQUESTS || '10',
      10
    ),
    runnerHeartbeatWindowMs: parseInt(
      process.env.RUNNER_HEARTBEAT_RATE_LIMIT_WINDOW_MS || '60000',
      10
    ),
    runnerHeartbeatMaxRequests: parseInt(
      process.env.RUNNER_HEARTBEAT_RATE_LIMIT_MAX_REQUESTS || '120',
      10
    ),
    runnerClaimWindowMs: parseInt(
      process.env.RUNNER_CLAIM_RATE_LIMIT_WINDOW_MS || '60000',
      10
    ),
    runnerClaimMaxRequests: parseInt(
      process.env.RUNNER_CLAIM_RATE_LIMIT_MAX_REQUESTS || '120',
      10
    ),
    runnerLogWindowMs: parseInt(
      process.env.RUNNER_LOG_RATE_LIMIT_WINDOW_MS || '60000',
      10
    ),
    runnerLogMaxRequests: parseInt(
      process.env.RUNNER_LOG_RATE_LIMIT_MAX_REQUESTS || '300',
      10
    ),
    runnerArtifactUploadWindowMs: parseInt(
      process.env.RUNNER_ARTIFACT_UPLOAD_RATE_LIMIT_WINDOW_MS || '60000',
      10
    ),
    runnerArtifactUploadMaxRequests: parseInt(
      process.env.RUNNER_ARTIFACT_UPLOAD_RATE_LIMIT_MAX_REQUESTS || '60',
      10
    ),
    runnerStatusUpdateWindowMs: parseInt(
      process.env.RUNNER_STATUS_UPDATE_RATE_LIMIT_WINDOW_MS || '60000',
      10
    ),
    runnerStatusUpdateMaxRequests: parseInt(
      process.env.RUNNER_STATUS_UPDATE_RATE_LIMIT_MAX_REQUESTS || '180',
      10
    ),
    runnerCompletionWindowMs: parseInt(
      process.env.RUNNER_COMPLETION_RATE_LIMIT_WINDOW_MS || '60000',
      10
    ),
    runnerCompletionMaxRequests: parseInt(
      process.env.RUNNER_COMPLETION_RATE_LIMIT_MAX_REQUESTS || '120',
      10
    ),
  },
  phishing: {
    landingUrl: phishingLandingUrl,
    trackingUrl: phishingTrackingUrl,
  },
  connectivity: {
    requireInternet: requireInternetConnection,
    checkHosts: internetCheckHosts,
    timeoutMs: parseInt(process.env.INTERNET_CHECK_TIMEOUT_MS || '3000', 10),
    cacheTtlMs: parseInt(process.env.INTERNET_CHECK_CACHE_TTL_MS || '30000', 10),
  },
  email: {
    provider: (process.env.EMAIL_PROVIDER || 'smtp') as
      | 'smtp'
      | 'sendgrid'
      | 'ses'
      | 'mailgun',
    smtp: {
      host: process.env.SMTP_HOST || (nodeEnv === 'test' ? 'localhost' : ''),
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY || '',
    },
    ses: {
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    mailgun: {
      apiKey: process.env.MAILGUN_API_KEY || '',
      domain: process.env.MAILGUN_DOMAIN || '',
    },
    defaultFrom: {
      name: process.env.EMAIL_FROM_NAME || 'Security Team',
      email: emailFromEmail,
    },
  },
};
