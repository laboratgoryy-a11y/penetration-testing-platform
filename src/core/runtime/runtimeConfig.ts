export interface RuntimeConfigInput {
  nodeEnv: string;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  encryptionKey: string;
  runnerRegistrationSecret: string;
  s3Bucket: string;
  emailFromEmail?: string;
  phishingLandingUrl?: string;
  phishingTrackingUrl?: string;
  passwordResetUrl?: string;
}

const PLACEHOLDER_FRAGMENTS = [
  'replace-me',
  'your-secret-key',
  'your_',
  'change_this',
  'changeme',
  'placeholder',
  'example',
];

function isPlaceholderValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return PLACEHOLDER_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function isUnsafeProductionUrl(value: string | undefined): boolean {
  if (!value || !value.trim()) {
    return true;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return (
      url.protocol !== 'https:' ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1'
    );
  } catch {
    return true;
  }
}

export function validateRuntimeConfig(config: RuntimeConfigInput): void {
  const missing: string[] = [];

  if (!config.databaseUrl.trim()) {
    missing.push('DATABASE_URL');
  }
  if (!config.redisUrl.trim()) {
    missing.push('REDIS_URL');
  }
  if (!config.s3Bucket.trim()) {
    missing.push('S3_BUCKET');
  }

  if (missing.length > 0) {
    throw new Error(`Missing required runtime configuration: ${missing.join(', ')}`);
  }

  if (config.nodeEnv !== 'test') {
    const secretEntries = [
      ['JWT_SECRET', config.jwtSecret],
      ['ENCRYPTION_KEY', config.encryptionKey],
      ['RUNNER_REGISTRATION_SECRET', config.runnerRegistrationSecret],
    ];

    for (const [name, value] of secretEntries) {
      if (!value.trim()) {
        throw new Error(`Missing required secret: ${name}`);
      }
      if (isPlaceholderValue(value)) {
        throw new Error(`Placeholder secret detected for ${name}`);
      }
    }

    if (config.encryptionKey.trim().length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters outside test mode');
    }
  }

  if (config.nodeEnv === 'production') {
    if (
      !config.emailFromEmail?.trim() ||
      isPlaceholderValue(config.emailFromEmail)
    ) {
      throw new Error('EMAIL_FROM_EMAIL must be configured with a non-placeholder sender outside test mode');
    }

    if (isUnsafeProductionUrl(config.phishingLandingUrl)) {
      throw new Error('PHISHING_LANDING_URL must be a non-local HTTPS URL outside test mode');
    }

    if (isUnsafeProductionUrl(config.phishingTrackingUrl)) {
      throw new Error('PHISHING_TRACKING_URL must be a non-local HTTPS URL outside test mode');
    }

    if (isUnsafeProductionUrl(config.passwordResetUrl)) {
      throw new Error('PASSWORD_RESET_URL must be a non-local HTTPS URL outside test mode');
    }
  }
}
