import { validateRuntimeConfig } from '../../core/runtime/runtimeConfig';

describe('validateRuntimeConfig', () => {
  it('rejects production config with placeholder secrets', () => {
    expect(() =>
      validateRuntimeConfig({
        nodeEnv: 'production',
        jwtSecret: 'placeholder-secret-production',
        encryptionKey: 'placeholder-key-production',
        runnerRegistrationSecret: 'placeholder-runner-secret',
        databaseUrl: 'postgres://localhost/test',
        redisUrl: 'redis://localhost:6379',
        s3Bucket: 'artifacts',
      })
    ).toThrow(/placeholder/i);
  });

  it('rejects non-test config with placeholder secrets', () => {
    expect(() =>
      validateRuntimeConfig({
        nodeEnv: 'development',
        jwtSecret: 'placeholder-secret-development',
        encryptionKey: 'placeholder-key-development',
        runnerRegistrationSecret: 'placeholder-runner-secret',
        databaseUrl: 'postgres://localhost/test',
        redisUrl: 'redis://localhost:6379',
        s3Bucket: 'artifacts',
      })
    ).toThrow(/placeholder/i);
  });

  it('accepts a production config with non-placeholder secrets', () => {
    expect(() =>
      validateRuntimeConfig({
        nodeEnv: 'production',
        jwtSecret: 'super-long-real-secret-value',
        encryptionKey: '12345678901234567890123456789012',
        runnerRegistrationSecret: 'another-real-secret-value',
        databaseUrl: 'postgres://localhost/test',
        redisUrl: 'redis://localhost:6379',
        s3Bucket: 'artifacts',
        emailFromEmail: 'security@corp.redteam',
        phishingLandingUrl: 'https://portal.corp.redteam/phishing',
        phishingTrackingUrl: 'https://portal.corp.redteam/track',
        passwordResetUrl: 'https://portal.corp.redteam/reset-password',
      })
    ).not.toThrow();
  });

  it('rejects production config with placeholder email sender settings', () => {
    expect(() =>
      validateRuntimeConfig({
        nodeEnv: 'production',
        jwtSecret: 'super-long-real-secret-value',
        encryptionKey: '12345678901234567890123456789012',
        runnerRegistrationSecret: 'another-real-secret-value',
        databaseUrl: 'postgres://localhost/test',
        redisUrl: 'redis://localhost:6379',
        s3Bucket: 'artifacts',
        emailFromEmail: 'security@example.com',
        phishingLandingUrl: 'https://portal.corp.redteam/phishing',
        phishingTrackingUrl: 'https://portal.corp.redteam/track',
        passwordResetUrl: 'https://portal.corp.redteam/reset-password',
      })
    ).toThrow(/email_from_email/i);
  });

  it('rejects production config with localhost phishing endpoints', () => {
    expect(() =>
      validateRuntimeConfig({
        nodeEnv: 'production',
        jwtSecret: 'super-long-real-secret-value',
        encryptionKey: '12345678901234567890123456789012',
        runnerRegistrationSecret: 'another-real-secret-value',
        databaseUrl: 'postgres://localhost/test',
        redisUrl: 'redis://localhost:6379',
        s3Bucket: 'artifacts',
        emailFromEmail: 'security@corp.redteam',
        phishingLandingUrl: 'http://localhost:3000',
        phishingTrackingUrl: 'http://127.0.0.1:3000/track',
        passwordResetUrl: 'https://portal.corp.redteam/reset-password',
      })
    ).toThrow(/phishing/i);
  });
});
