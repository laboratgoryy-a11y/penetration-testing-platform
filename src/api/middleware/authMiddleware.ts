import { NextFunction, Request, Response } from 'express';
import { pgPool } from '../../database/connection';
import { sendError } from '../../core/http/responses';
import { AccessControlService } from '../../core/auth/AccessControlService';
import { AuthService } from '../../core/auth/AuthService';
import { Action } from '../../core/types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        roles: string[];
      };
    }
  }
}

export function authenticate() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        sendError(res, 401, 'MISSING_TOKEN', 'Authentication token is required');
        return;
      }

      const token = authHeader.slice(7);
      const authService = new AuthService(pgPool);
      const validation = await authService.validateToken(token);

      if (!validation.valid || !validation.userId || !validation.username) {
        sendError(res, 401, 'INVALID_TOKEN', 'Invalid or expired authentication token');
        return;
      }

      req.user = {
        userId: validation.userId,
        username: validation.username,
        roles: validation.roles || [],
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function authorize(resource: string, action: Action) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      const accessControlService = new AccessControlService(pgPool);
      const hasPermission = await accessControlService.checkPermission(
        req.user.userId,
        resource,
        action
      );

      if (!hasPermission) {
        sendError(res, 403, 'FORBIDDEN', 'You do not have permission to perform this action');
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(...roleNames: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
        return;
      }

      const accessControlService = new AccessControlService(pgPool);
      const hasRole = await accessControlService.hasRole(req.user.userId, roleNames);

      if (!hasRole) {
        sendError(
          res,
          403,
          'FORBIDDEN',
          `Required role: ${roleNames.join(' or ')}`
        );
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
