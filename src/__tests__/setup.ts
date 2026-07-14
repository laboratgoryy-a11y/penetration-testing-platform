// Test setup file
import { config } from '../config';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'penetration_testing_platform_test';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
export const testConfig = {
  ...config,
  database: {
    ...config.database,
    name: 'penetration_testing_platform_test',
  },
};
