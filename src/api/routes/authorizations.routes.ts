import { Request, Response, Router } from 'express';
import multer from 'multer';
import { AuthorizationDomainService } from '../../core/authorizations/AuthorizationDomainService';
import { sendError, sendSuccess } from '../../core/http/responses';
import { ObjectStorageService } from '../../core/storage/ObjectStorageService';
import { AuthorizationScope, OperationType } from '../../core/types';
import { pgPool } from '../../database/connection';
import { ValidationError } from '../../utils/errors';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, authorize } from '../middleware/authMiddleware';
import { InputValidator } from '../middleware/inputValidator';
import {
  authorizationValidationLimiter,
  authorizationWriteLimiter,
} from '../middleware/rateLimiter';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`Missing required field: ${field}`, field, value);
  }

  return value.trim();
}

function parseJsonField<T>(value: unknown, field: string): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      throw new ValidationError(`Invalid JSON field: ${field}`, field, value);
    }
  }

  if (value === undefined || value === null) {
    throw new ValidationError(`Missing required field: ${field}`, field, value);
  }

  return value as T;
}

router.post(
  '/',
  authenticate(),
  authorize('authorizations', 'WRITE'),
  authorizationWriteLimiter,
  upload.single('document'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const organizationName = requireString(req.body.organizationName, 'organizationName');
    const validFromRaw = requireString(req.body.validFrom, 'validFrom');
    const validUntilRaw = requireString(req.body.validUntil, 'validUntil');
    const signedBy = requireString(req.body.signedBy, 'signedBy');
    const digitalSignature = requireString(
      req.body.digitalSignature,
      'digitalSignature'
    );
    const scope = parseJsonField<AuthorizationScope>(req.body.scope, 'scope');
    const allowedOperations = parseJsonField<OperationType[]>(
      req.body.allowedOperations,
      'allowedOperations'
    );

    if (!Array.isArray(allowedOperations) || allowedOperations.length === 0) {
      throw new ValidationError(
        'allowedOperations must be a non-empty array',
        'allowedOperations',
        req.body.allowedOperations
      );
    }

    const validFrom = new Date(validFromRaw);
    const validUntil = new Date(validUntilRaw);
    if (Number.isNaN(validFrom.getTime())) {
      throw new ValidationError('Invalid validFrom timestamp', 'validFrom', validFromRaw);
    }
    if (Number.isNaN(validUntil.getTime())) {
      throw new ValidationError('Invalid validUntil timestamp', 'validUntil', validUntilRaw);
    }

    let document:
      | {
          fileName: string;
          contentType: string;
          sizeBytes: number;
          objectKey: string;
        }
      | undefined;

    if (req.file) {
      const storage = new ObjectStorageService();
      const storedObject = await storage.putObject({
        prefix: 'authorizations',
        fileName: req.file.originalname,
        contentType: req.file.mimetype || 'application/octet-stream',
        body: req.file.buffer,
        sizeBytes: req.file.size,
        metadata: {
          uploadedBy: req.user.userId,
          documentType: 'authorization',
        },
      });

      document = {
        objectKey: storedObject.objectKey,
        fileName: req.file.originalname,
        contentType: storedObject.contentType,
        sizeBytes: storedObject.sizeBytes,
      };
    }

    const service = new AuthorizationDomainService(pgPool);
    const record = await service.createAuthorization({
      userId: req.user.userId,
      organizationName,
      scope,
      validFrom,
      validUntil,
      signedBy,
      digitalSignature,
      allowedOperations,
      document,
    });

    sendSuccess(res, { authorization: record }, 201);
  })
);

router.get(
  '/',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const service = new AuthorizationDomainService(pgPool);
    const authorizations = await service.listAuthorizations(req.user.userId);
    sendSuccess(res, { authorizations });
  })
);

router.get(
  '/:id',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    if (!InputValidator.validateUuid(req.params.id).valid) {
      sendError(res, 400, 'INVALID_ID', 'Invalid authorization ID format');
      return;
    }
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const service = new AuthorizationDomainService(pgPool);
    const authorizationRecord = await service.getAuthorization(
      req.params.id,
      req.user.userId
    );
    if (!authorizationRecord) {
      sendError(res, 404, 'NOT_FOUND', 'Authorization not found');
      return;
    }

    sendSuccess(res, { authorization: authorizationRecord });
  })
);

router.post(
  '/:id/validate',
  authenticate(),
  authorizationValidationLimiter,
  InputValidator.validateRequired(['target', 'operationType']),
  asyncHandler(async (req: Request, res: Response) => {
    if (!InputValidator.validateUuid(req.params.id).valid) {
      sendError(res, 400, 'INVALID_ID', 'Invalid authorization ID format');
      return;
    }

    const service = new AuthorizationDomainService(pgPool);
    const validation = await service.validateAuthorization(
      req.params.id,
      req.body.operationType as OperationType,
      req.body.target
    );

    if (!validation.valid) {
      sendError(res, 403, 'INVALID_AUTHORIZATION', validation.reason || 'Authorization rejected');
      return;
    }

    sendSuccess(res, {
      valid: true,
      authorizationId: req.params.id,
      operationType: req.body.operationType,
      target: req.body.target,
    });
  })
);

router.post(
  '/:id/revoke',
  authenticate(),
  authorize('authorizations', 'WRITE'),
  authorizationWriteLimiter,
  InputValidator.validateRequired(['reason']),
  asyncHandler(async (req: Request, res: Response) => {
    if (!InputValidator.validateUuid(req.params.id).valid) {
      sendError(res, 400, 'INVALID_ID', 'Invalid authorization ID format');
      return;
    }

    const service = new AuthorizationDomainService(pgPool);
    const revoked = await service.revokeAuthorization(req.params.id, req.body.reason);
    if (!revoked) {
      sendError(res, 404, 'NOT_FOUND', 'Authorization not found');
      return;
    }

    sendSuccess(res, {
      authorizationId: req.params.id,
      message: 'Authorization revoked successfully',
    });
  })
);

router.delete(
  '/:id',
  authenticate(),
  authorize('authorizations', 'DELETE'),
  authorizationWriteLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    if (!InputValidator.validateUuid(req.params.id).valid) {
      sendError(res, 400, 'INVALID_ID', 'Invalid authorization ID format');
      return;
    }

    const service = new AuthorizationDomainService(pgPool);
    const revoked = await service.revokeAuthorization(
      req.params.id,
      req.body?.reason || 'Deleted by user'
    );
    if (!revoked) {
      sendError(res, 404, 'NOT_FOUND', 'Authorization not found');
      return;
    }

    sendSuccess(res, { message: 'Authorization deleted successfully' });
  })
);

export default router;
