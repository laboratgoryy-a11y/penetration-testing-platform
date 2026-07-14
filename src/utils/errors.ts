/**
 * Custom error classes for the application
 */

export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  SYSTEM = 'SYSTEM',
}

export interface ErrorContext {
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: Date;
  context?: Record<string, any>;
  stackTrace?: string;
  userId?: string;
}

export class ApplicationError extends Error {
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;
  public readonly userId?: string;

  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    category: ErrorCategory = ErrorCategory.SYSTEM,
    context?: Record<string, any>,
    userId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.severity = severity;
    this.category = category;
    this.timestamp = new Date();
    this.context = context;
    this.userId = userId;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * تحويل الخطأ إلى كائن قابل للتسجيل
   */
  toLogObject(): ErrorContext {
    return {
      severity: this.severity,
      category: this.category,
      timestamp: this.timestamp,
      context: this.context,
      stackTrace: this.stack,
      userId: this.userId,
    };
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(
    message: string = 'غير مصرح بهذه العملية',
    public authorizationId?: string,
    context?: Record<string, any>,
    userId?: string
  ) {
    super(
      message,
      403,
      'AUTHORIZATION_ERROR',
      ErrorSeverity.WARNING,
      ErrorCategory.AUTHORIZATION,
      { ...context, authorizationId },
      userId
    );
  }
}

export class ValidationError extends ApplicationError {
  constructor(
    message: string = 'بيانات غير صالحة',
    public field?: string,
    public value?: any,
    context?: Record<string, any>,
    userId?: string
  ) {
    super(
      message,
      400,
      'VALIDATION_ERROR',
      ErrorSeverity.INFO,
      ErrorCategory.VALIDATION,
      { ...context, field, value },
      userId
    );
  }
}

export class ScopeViolationError extends ApplicationError {
  constructor(
    message: string = 'الهدف خارج النطاق المصرح به',
    public target?: string,
    public scope?: any,
    context?: Record<string, any>,
    userId?: string
  ) {
    super(
      message,
      403,
      'SCOPE_VIOLATION',
      ErrorSeverity.CRITICAL,
      ErrorCategory.AUTHORIZATION,
      { ...context, target, scope },
      userId
    );
  }
}

export class ExpiredAuthorizationError extends ApplicationError {
  constructor(
    message: string = 'انتهت صلاحية التصريح',
    public authorizationId?: string,
    public expiredAt?: Date,
    context?: Record<string, any>,
    userId?: string
  ) {
    super(
      message,
      403,
      'EXPIRED_AUTHORIZATION',
      ErrorSeverity.WARNING,
      ErrorCategory.AUTHORIZATION,
      { ...context, authorizationId, expiredAt },
      userId
    );
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(
    message: string = 'فشلت المصادقة',
    context?: Record<string, any>,
    userId?: string
  ) {
    super(
      message,
      401,
      'AUTHENTICATION_ERROR',
      ErrorSeverity.WARNING,
      ErrorCategory.AUTHENTICATION,
      context,
      userId
    );
  }
}

export class NotFoundError extends ApplicationError {
  constructor(
    message: string = 'المورد غير موجود',
    context?: Record<string, any>,
    userId?: string
  ) {
    super(
      message,
      404,
      'NOT_FOUND',
      ErrorSeverity.INFO,
      ErrorCategory.BUSINESS_LOGIC,
      context,
      userId
    );
  }
}

export class ConflictError extends ApplicationError {
  constructor(
    message: string = 'تعارض في البيانات',
    context?: Record<string, any>,
    userId?: string
  ) {
    super(
      message,
      409,
      'CONFLICT',
      ErrorSeverity.WARNING,
      ErrorCategory.BUSINESS_LOGIC,
      context,
      userId
    );
  }
}

export class DatabaseError extends ApplicationError {
  constructor(
    message: string = 'خطأ في قاعدة البيانات',
    context?: Record<string, any>,
    userId?: string
  ) {
    super(
      message,
      500,
      'DATABASE_ERROR',
      ErrorSeverity.CRITICAL,
      ErrorCategory.DATABASE,
      context,
      userId
    );
  }
}

export class ExternalServiceError extends ApplicationError {
  constructor(
    message: string = 'خطأ في خدمة خارجية',
    public serviceName?: string,
    context?: Record<string, any>,
    userId?: string
  ) {
    super(
      message,
      503,
      'EXTERNAL_SERVICE_ERROR',
      ErrorSeverity.ERROR,
      ErrorCategory.EXTERNAL_SERVICE,
      { ...context, serviceName },
      userId
    );
  }
}

export class NetworkError extends ApplicationError {
  constructor(
    message: string = 'خطأ في الشبكة',
    context?: Record<string, any>,
    userId?: string
  ) {
    super(
      message,
      503,
      'NETWORK_ERROR',
      ErrorSeverity.ERROR,
      ErrorCategory.NETWORK,
      context,
      userId
    );
  }
}
