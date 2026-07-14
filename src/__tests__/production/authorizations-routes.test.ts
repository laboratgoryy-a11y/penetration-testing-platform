import express from 'express';
import request from 'supertest';

const createAuthorizationMock = jest.fn();
const putObjectMock = jest.fn();

jest.mock('../../api/middleware/authMiddleware', () => ({
  authenticate:
    () =>
    (req: { user?: { userId: string; username: string; roles: string[] } }, _res: unknown, next: () => void) => {
      req.user = {
        userId: 'user-1',
        username: 'admin',
        roles: ['ADMIN'],
      };
      next();
    },
  authorize: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

jest.mock('../../core/authorizations/AuthorizationDomainService', () => ({
  AuthorizationDomainService: jest.fn().mockImplementation(() => ({
    createAuthorization: createAuthorizationMock,
    listAuthorizations: jest.fn(),
    getAuthorization: jest.fn(),
    validateAuthorization: jest.fn(),
    revokeAuthorization: jest.fn(),
  })),
}));

jest.mock('../../core/storage/ObjectStorageService', () => ({
  ObjectStorageService: jest.fn().mockImplementation(() => ({
    putObject: putObjectMock,
  })),
}));

describe('authorizations routes', () => {
  const router = require('../../api/routes/authorizations.routes').default;
  const { errorHandlerMiddleware } = require('../../api/middleware/errorHandler');
  const app = express();
  app.use(express.json());
  app.use('/authorizations', router);
  app.use(errorHandlerMiddleware);

  beforeEach(() => {
    createAuthorizationMock.mockReset();
    putObjectMock.mockReset();
  });

  it('accepts a multipart authorization document and persists stored metadata', async () => {
    putObjectMock.mockResolvedValue({
      objectKey: 'authorizations/auth-1/document.pdf',
      contentType: 'application/pdf',
      sizeBytes: 11,
    });
    createAuthorizationMock.mockResolvedValue({
      id: 'auth-1',
      organizationName: 'Example Corp',
      status: 'ACTIVE',
    });

    const response = await request(app)
      .post('/authorizations')
      .field('organizationName', 'Example Corp')
      .field(
        'scope',
        JSON.stringify({
          domains: ['example.com'],
        })
      )
      .field('validFrom', '2026-05-08T00:00:00.000Z')
      .field('validUntil', '2026-06-08T00:00:00.000Z')
      .field('signedBy', 'Security Officer')
      .field('digitalSignature', 'signed-data')
      .field('allowedOperations', JSON.stringify(['WEB_SCAN']))
      .attach('document', Buffer.from('hello world'), {
        filename: 'document.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(putObjectMock).toHaveBeenCalledTimes(1);
    expect(createAuthorizationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        organizationName: 'Example Corp',
        document: {
          objectKey: 'authorizations/auth-1/document.pdf',
          fileName: 'document.pdf',
          contentType: 'application/pdf',
          sizeBytes: 11,
        },
      })
    );
  });
});
