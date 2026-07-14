import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '2m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.05'],   // Error rate should be less than 5%
    errors: ['rate<0.1'],             // Custom error rate should be less than 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testUser = {
  username: 'testuser',
  password: 'testpass123',
};

// Helper function to get auth token
function getAuthToken() {
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    username: testUser.username,
    password: testUser.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return body.accessToken;
  }
  return null;
}

export function setup() {
  // Setup: Create test user if needed
  console.log('Setting up load test...');
  return { token: getAuthToken() };
}

export default function (data) {
  const token = data.token;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Test 1: Health check endpoint
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Get user profile
  if (token) {
    const profileRes = http.get(`${BASE_URL}/api/v1/auth/me`, { headers });
    check(profileRes, {
      'profile status is 200': (r) => r.status === 200,
      'profile has user data': (r) => {
        const body = JSON.parse(r.body);
        return body.username !== undefined;
      },
    }) || errorRate.add(1);

    sleep(1);

    // Test 3: List authorizations
    const authzRes = http.get(`${BASE_URL}/api/v1/authorizations`, { headers });
    check(authzRes, {
      'authorizations status is 200': (r) => r.status === 200,
      'authorizations is array': (r) => {
        const body = JSON.parse(r.body);
        return Array.isArray(body);
      },
    }) || errorRate.add(1);

    sleep(1);

    // Test 4: List scan sessions
    const scansRes = http.get(`${BASE_URL}/api/v1/scans/web`, { headers });
    check(scansRes, {
      'scans status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(1);

    // Test 5: List phishing campaigns
    const campaignsRes = http.get(`${BASE_URL}/api/v1/phishing/campaigns`, { headers });
    check(campaignsRes, {
      'campaigns status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(1);

    // Test 6: List network tests
    const networkRes = http.get(`${BASE_URL}/api/v1/network/tests`, { headers });
    check(networkRes, {
      'network tests status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  }

  sleep(2);
}

export function teardown(data) {
  // Cleanup after tests
  console.log('Tearing down load test...');
}

export function handleSummary(data) {
  return {
    'performance-results.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}Test Summary:\n`;
  summary += `${indent}  Duration: ${data.state.testRunDurationMs}ms\n`;
  summary += `${indent}  Iterations: ${data.metrics.iterations.values.count}\n`;
  summary += `${indent}  VUs: ${data.metrics.vus.values.value}\n`;
  summary += `${indent}  VUs Max: ${data.metrics.vus_max.values.value}\n\n`;

  summary += `${indent}HTTP Metrics:\n`;
  summary += `${indent}  Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += `${indent}  Request Duration (avg): ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Request Duration (p95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  Request Duration (p99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `${indent}  Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n`;

  return summary;
}
