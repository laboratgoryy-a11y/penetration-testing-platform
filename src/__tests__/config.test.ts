import { config } from '../config';

describe('Configuration', () => {
  test('should load configuration values', () => {
    expect(config).toBeDefined();
    expect(config.port).toBeDefined();
    expect(config.database).toBeDefined();
    expect(config.redis).toBeDefined();
    expect(config.jwt).toBeDefined();
  });

  test('should have database configuration', () => {
    expect(config.database.host).toBeDefined();
    expect(config.database.port).toBeDefined();
    expect(config.database.name).toBeDefined();
  });

  test('should have security configuration', () => {
    expect(config.security.mfaIssuer).toBeDefined();
    expect(config.security.failedLoginAttemptsLimit).toBeGreaterThan(0);
  });

  test('should have data retention policies', () => {
    expect(config.dataRetention.phishingDataDays).toBeGreaterThan(0);
    expect(config.dataRetention.auditLogYears).toBeGreaterThan(0);
  });
});
