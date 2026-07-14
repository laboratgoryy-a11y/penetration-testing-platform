import * as fc from 'fast-check';
import request from 'supertest';
import express, { Express } from 'express';
import { authenticate } from '../api/middleware/authMiddleware';

/**
 * Feature: penetration-testing-platform
 * Property 24: المصادقة الإلزامية للوصول
 * 
 * **يتحقق من: المتطلبات 7.1**
 * 
 * لأي محاولة وصول إلى النظام، يجب رفض الوصول إذا لم يتم تقديم بيانات اعتماد صالحة
 * 
 * This property verifies that:
 * 1. Any request without authentication token is rejected with 401
 * 2. Any request with invalid token is rejected with 401
 * 3. Any request with malformed token is rejected with 401
 * 4. The system never allows unauthenticated access to protected resources
 */

describe('Property 24: Mandatory Authentication for Access', () => {
  let app: Express;

  beforeEach(() => {
    // Create a minimal Express app with authentication middleware
    app = express();
    app.use(express.json());

    // Protected endpoint that requires authentication
    app.get('/api/protected', authenticate(), (req, res) => {
      res.json({ success: true, message: 'Access granted' });
    });

    // Another protected endpoint
    app.post('/api/scans/web', authenticate(), (req, res) => {
      res.json({ success: true, sessionId: 'test-session' });
    });

    // Yet another protected endpoint
    app.get('/api/reports', authenticate(), (req, res) => {
      res.json({ success: true, reports: [] });
    });
  });

  /**
   * Property: Requests without authentication token are always rejected
   */
  test('property: requests without token are rejected with 401', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom(
            '/api/protected',
            '/api/scans/web',
            '/api/reports',
            '/api/phishing/campaigns',
            '/api/network/tests'
          ),
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
          body: fc.option(
            fc.record({
              data: fc.string(),
              value: fc.integer(),
            }),
            { nil: undefined }
          ),
        }),
        async ({ endpoint, method, body }) => {
          // Make request without Authorization header
          let response;
          
          switch (method) {
            case 'GET':
              response = await request(app).get(endpoint);
              break;
            case 'POST':
              response = await request(app).post(endpoint).send(body || {});
              break;
            case 'PUT':
              response = await request(app).put(endpoint).send(body || {});
              break;
            case 'DELETE':
              response = await request(app).delete(endpoint);
              break;
            default:
              response = await request(app).get(endpoint);
          }

          // Property: Must return 401 Unauthorized
          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
          expect(response.body.error.code).toBe('MISSING_TOKEN');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Requests with malformed tokens are always rejected
   */
  test('property: requests with malformed tokens are rejected with 401', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom(
            '/api/protected',
            '/api/scans/web',
            '/api/reports'
          ),
          token: fc.oneof(
            fc.string({ minLength: 1, maxLength: 50 }), // Random string
            fc.hexaString({ minLength: 10, maxLength: 100 }), // Random hex
            fc.base64String({ minLength: 10, maxLength: 100 }), // Random base64
            fc.constant('invalid.token.here'),
            fc.constant('Bearer'),
            fc.constant(''),
            fc.constant('null'),
            fc.constant('undefined')
          ),
        }),
        async ({ endpoint, token }) => {
          // Make request with malformed token
          const response = await request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${token}`);

          // Property: Must return 401 Unauthorized
          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
          expect(response.body.error.code).toMatch(/INVALID_TOKEN|MISSING_TOKEN/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Requests with missing 'Bearer' prefix are rejected
   */
  test('property: requests without Bearer prefix are rejected', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom(
            '/api/protected',
            '/api/scans/web',
            '/api/reports'
          ),
          token: fc.string({ minLength: 10, maxLength: 100 }),
        }),
        async ({ endpoint, token }) => {
          // Make request with token but without 'Bearer ' prefix
          const response = await request(app)
            .get(endpoint)
            .set('Authorization', token); // Missing 'Bearer ' prefix

          // Property: Must return 401 Unauthorized
          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
          expect(response.body.error.code).toBe('MISSING_TOKEN');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Requests with expired tokens are rejected
   * (Simulated by using tokens with invalid signatures)
   */
  test('property: requests with invalid signature tokens are rejected', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom(
            '/api/protected',
            '/api/scans/web',
            '/api/reports'
          ),
          // Generate JWT-like structure but with invalid signature
          header: fc.base64String({ minLength: 20, maxLength: 50 }),
          payload: fc.base64String({ minLength: 20, maxLength: 100 }),
          signature: fc.base64String({ minLength: 20, maxLength: 50 }),
        }),
        async ({ endpoint, header, payload, signature }) => {
          // Create a JWT-like token with invalid signature
          const fakeToken = `${header}.${payload}.${signature}`;

          const response = await request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${fakeToken}`);

          // Property: Must return 401 Unauthorized
          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
          expect(response.body.error.code).toBe('INVALID_TOKEN');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty or whitespace-only Authorization headers are rejected
   */
  test('property: empty or whitespace authorization headers are rejected', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom(
            '/api/protected',
            '/api/scans/web',
            '/api/reports'
          ),
          authHeader: fc.oneof(
            fc.constant(''),
            fc.constant(' '),
            fc.constant('  '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.constant('Bearer '),
            fc.constant('Bearer  '),
            fc.constant('Bearer \t')
          ),
        }),
        async ({ endpoint, authHeader }) => {
          const response = await request(app)
            .get(endpoint)
            .set('Authorization', authHeader);

          // Property: Must return 401 Unauthorized
          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Case variations of 'Bearer' are rejected
   * (Only 'Bearer ' with capital B is valid)
   */
  test('property: case-sensitive Bearer prefix enforcement', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom('/api/protected', '/api/scans/web'),
          prefix: fc.constantFrom(
            'bearer ',
            'BEARER ',
            'BeArEr ',
            'bearer',
            'BEARER'
          ),
          token: fc.string({ minLength: 20, maxLength: 100 }),
        }),
        async ({ endpoint, prefix, token }) => {
          const response = await request(app)
            .get(endpoint)
            .set('Authorization', `${prefix}${token}`);

          // Property: Must return 401 Unauthorized (case-sensitive)
          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
          expect(response.body.error).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Multiple Authorization headers are handled correctly
   */
  test('property: multiple authorization headers are rejected', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom('/api/protected'),
          token1: fc.string({ minLength: 10, maxLength: 50 }),
          token2: fc.string({ minLength: 10, maxLength: 50 }),
        }),
        async ({ endpoint, token1, token2 }) => {
          // Attempt to send multiple Authorization headers
          const response = await request(app)
            .get(endpoint)
            .set('Authorization', `Bearer ${token1}`)
            .set('Authorization', `Bearer ${token2}`); // Second one overwrites

          // Property: Must return 401 Unauthorized
          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Authentication is required regardless of HTTP method
   */
  test('property: authentication required for all HTTP methods', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
          endpoint: fc.constantFrom('/api/protected'),
        }),
        async ({ method, endpoint }) => {
          let response;

          switch (method) {
            case 'GET':
              response = await request(app).get(endpoint);
              break;
            case 'POST':
              response = await request(app).post(endpoint).send({});
              break;
            case 'PUT':
              response = await request(app).put(endpoint).send({});
              break;
            case 'DELETE':
              response = await request(app).delete(endpoint);
              break;
            case 'PATCH':
              response = await request(app).patch(endpoint).send({});
              break;
            default:
              response = await request(app).get(endpoint);
          }

          // Property: All methods require authentication
          expect(response.status).toBe(401);
          expect(response.body.success).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Response always includes proper error structure
   */
  test('property: error responses have consistent structure', () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          endpoint: fc.constantFrom(
            '/api/protected',
            '/api/scans/web',
            '/api/reports'
          ),
          invalidAuth: fc.oneof(
            fc.constant(undefined), // No auth header
            fc.constant(''), // Empty
            fc.string({ minLength: 1, maxLength: 50 }) // Invalid token
          ),
        }),
        async ({ endpoint, invalidAuth }) => {
          const req = request(app).get(endpoint);

          if (invalidAuth !== undefined) {
            req.set('Authorization', `Bearer ${invalidAuth}`);
          }

          const response = await req;

          // Property: Response structure is consistent
          expect(response.status).toBe(401);
          expect(response.body).toHaveProperty('success');
          expect(response.body.success).toBe(false);
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error).toHaveProperty('message');
          expect(response.body).toHaveProperty('timestamp');
          
          // Verify timestamp is a valid date
          expect(new Date(response.body.timestamp).toString()).not.toBe('Invalid Date');
        }
      ),
      { numRuns: 100 }
    );
  });
});
