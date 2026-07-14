import { Request, Response, Router } from 'express';
import { pgPool } from '../../database/connection';
import { sendError, sendSuccess } from '../../core/http/responses';
import { AuthService } from '../../core/auth/AuthService';
import { MfaService } from '../../core/auth/MfaService';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/authMiddleware';
import {
  loginLimiter,
  mfaLimiter,
  passwordChangeLimiter,
  passwordResetConfirmLimiter,
  passwordResetRequestLimiter,
  refreshLimiter,
} from '../middleware/rateLimiter';
import { InputValidator } from '../middleware/inputValidator';

const router = Router();

function sendPasswordOperationFailure(
  res: Response,
  result: {
    errorCode?: string;
    error?: string;
    details?: unknown;
  },
  fallbackCode: string,
  fallbackMessage: string
): void {
  sendError(
    res,
    400,
    result.errorCode || fallbackCode,
    result.error || fallbackMessage,
    result.details
  );
}

router.post(
  '/login',
  loginLimiter,
  InputValidator.validateRequired(['username', 'password']),
  asyncHandler(async (req: Request, res: Response) => {
    const { username, password, mfaToken } = req.body;
    const authService = new AuthService(pgPool);
    const result = await authService.login({ username, password, mfaToken });

    if (!result.success) {
      sendError(
        res,
        401,
        result.requiresMFA ? 'MFA_REQUIRED' : 'LOGIN_FAILED',
        result.error || 'Login failed',
        result.requiresMFA ? { requiresMFA: true } : undefined
      );
      return;
    }

    sendSuccess(
      res,
      {
        token: result.token,
        refreshToken: result.refreshToken,
        user: result.user,
        session: result.session,
      },
      200
    );
  })
);

router.post(
  '/logout',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.slice(7);
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;

    if (accessToken) {
      const authService = new AuthService(pgPool);
      await authService.logout(accessToken, refreshToken);
    }

    sendSuccess(res, { message: 'Logged out successfully' });
  })
);

router.post(
  '/refresh',
  refreshLimiter,
  InputValidator.validateRequired(['refreshToken']),
  asyncHandler(async (req: Request, res: Response) => {
    const authService = new AuthService(pgPool);
    const refreshed = await authService.refreshAccessToken(req.body.refreshToken);

    if (!refreshed || !refreshed.success) {
      sendError(res, 401, 'REFRESH_FAILED', 'Invalid or expired refresh token');
      return;
    }

    sendSuccess(res, {
      token: refreshed.token,
      refreshToken: refreshed.refreshToken,
      user: refreshed.user,
      session: refreshed.session,
    });
  })
);

router.post(
  '/password/reset/request',
  passwordResetRequestLimiter,
  InputValidator.validateRequired(['email']),
  asyncHandler(async (req: Request, res: Response) => {
    const authService = new AuthService(pgPool);
    await authService.requestPasswordReset(req.body.email);

    sendSuccess(
      res,
      {
        message:
          'If the account exists, a password reset email has been sent.',
      },
      202
    );
  })
);

router.post(
  '/password/reset/confirm',
  passwordResetConfirmLimiter,
  InputValidator.validateRequired(['token', 'newPassword']),
  asyncHandler(async (req: Request, res: Response) => {
    const authService = new AuthService(pgPool);
    const result = await authService.completePasswordReset(
      req.body.token,
      req.body.newPassword
    );

    if (!result.success) {
      sendPasswordOperationFailure(
        res,
        result,
        'PASSWORD_RESET_FAILED',
        'Password reset token is invalid or has expired'
      );
      return;
    }

    sendSuccess(res, { message: 'Password reset successfully' });
  })
);

router.get(
  '/me',
  authenticate(),
  asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.slice(7);
    if (!token) {
      sendError(res, 401, 'MISSING_TOKEN', 'Authentication token is required');
      return;
    }

    const authService = new AuthService(pgPool);
    const user = await authService.getUserByToken(token);
    if (!user) {
      sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    sendSuccess(res, { user });
  })
);

router.post(
  '/mfa/setup',
  authenticate(),
  mfaLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const authService = new AuthService(pgPool);
    const user = await authService.getUserById(req.user.userId);
    if (!user) {
      sendError(res, 404, 'USER_NOT_FOUND', 'User not found');
      return;
    }

    const mfaService = new MfaService(pgPool);
    const setup = await mfaService.setup(user.id, user.email);
    sendSuccess(res, setup, 200);
  })
);

router.post(
  '/mfa/verify',
  authenticate(),
  mfaLimiter,
  InputValidator.validateRequired(['token']),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const mfaService = new MfaService(pgPool);
    const result = await mfaService.enable(req.user.userId, req.body.token);
    if (!result.valid) {
      sendError(res, 400, 'MFA_VERIFICATION_FAILED', result.error || 'Invalid MFA token');
      return;
    }

    sendSuccess(res, { message: 'MFA enabled successfully' });
  })
);

router.post(
  '/mfa/disable',
  authenticate(),
  mfaLimiter,
  InputValidator.validateRequired(['token']),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const mfaService = new MfaService(pgPool);
    const result = await mfaService.disable(req.user.userId, req.body.token);
    if (!result.valid) {
      sendError(res, 400, 'MFA_DISABLE_FAILED', result.error || 'Invalid MFA token');
      return;
    }

    sendSuccess(res, { message: 'MFA disabled successfully' });
  })
);

router.post(
  '/mfa/recovery',
  authenticate(),
  mfaLimiter,
  InputValidator.validateRequired(['code']),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const mfaService = new MfaService(pgPool);
    const result = await mfaService.verify(req.user.userId, req.body.code);
    if (!result.valid) {
      sendError(res, 400, 'RECOVERY_CODE_INVALID', result.error || 'Invalid recovery code');
      return;
    }

    sendSuccess(res, { valid: true, usedRecoveryCode: result.usedRecoveryCode || false });
  })
);

router.post(
  '/password/change',
  authenticate(),
  passwordChangeLimiter,
  InputValidator.validateRequired(['currentPassword', 'newPassword']),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentication required');
      return;
    }

    const authService = new AuthService(pgPool);
    const result = await authService.changePassword(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword
    );

    if (!result.success) {
      sendPasswordOperationFailure(
        res,
        result,
        'PASSWORD_CHANGE_FAILED',
        'Current password is invalid'
      );
      return;
    }

    sendSuccess(res, { message: 'Password changed successfully' });
  })
);

export default router;
