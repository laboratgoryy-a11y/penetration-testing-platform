import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import {
  AuthorizationError,
  ValidationError,
  ScopeViolationError,
  ExpiredAuthorizationError,
} from '../../utils/errors';

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
  requestId: string;
}

/**
 * Global error handling middleware
 * Catches all errors and returns appropriate HTTP responses
 */
export function errorHandlerMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();
  
  // Log the error
  console.error(`[${requestId}] Error:`, error);

  // Handle specific error types
  if (error instanceof AuthorizationError) {
    res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: error.message,
        details: {
          authorizationId: error.authorizationId,
        },
      },
      timestamp: new Date(),
      requestId,
    } as ErrorResponse);
    return;
  }

  if (error instanceof ExpiredAuthorizationError) {
    res.status(403).json({
      success: false,
      error: {
        code: 'AUTHORIZATION_EXPIRED',
        message: error.message,
        details: {
          authorizationId: error.authorizationId,
          expiredAt: error.expiredAt,
        },
      },
      timestamp: new Date(),
      requestId,
    } as ErrorResponse);
    return;
  }

  if (error instanceof ScopeViolationError) {
    res.status(403).json({
      success: false,
      error: {
        code: 'SCOPE_VIOLATION',
        message: error.message,
        details: {
          target: error.target,
          authorizedScope: error.scope,
        },
      },
      timestamp: new Date(),
      requestId,
    } as ErrorResponse);
    return;
  }

  if (error instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: {
          field: error.field,
          value: error.value,
        },
      },
      timestamp: new Date(),
      requestId,
    } as ErrorResponse);
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
      timestamp: new Date(),
      requestId,
    } as ErrorResponse);
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authentication token has expired',
      },
      timestamp: new Date(),
      requestId,
    } as ErrorResponse);
    return;
  }

  // Default error response (don't expose internal details)
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
    timestamp: new Date(),
    requestId,
  } as ErrorResponse);
}

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `req_${randomUUID()}`;
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error middleware
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
