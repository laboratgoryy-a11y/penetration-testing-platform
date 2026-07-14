/**
 * أخطاء مخصصة لماسح IP
 */

/**
 * خطأ التصريح
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public target: string,
    public authorizationId?: string
  ) {
    super(message);
    this.name = 'AuthorizationError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * خطأ التحقق من الصحة
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * خطأ تنفيذ Nmap
 */
export class NmapExecutionError extends Error {
  constructor(
    message: string,
    public exitCode: number,
    public stderr: string
  ) {
    super(message);
    this.name = 'NmapExecutionError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * خطأ قاعدة البيانات
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public operation: string,
    public originalError: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * خطأ تحليل النتائج
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public data: string
  ) {
    super(message);
    this.name = 'ParseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * خطأ انتهاء المهلة
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public timeoutSeconds: number
  ) {
    super(message);
    this.name = 'TimeoutError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * خطأ Nmap غير مثبت
 */
export class NmapNotInstalledError extends Error {
  constructor(message: string = 'Nmap is not installed or not found in PATH') {
    super(message);
    this.name = 'NmapNotInstalledError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * خطأ الهدف غير قابل للوصول
 */
export class TargetUnreachableError extends Error {
  constructor(
    message: string,
    public target: string
  ) {
    super(message);
    this.name = 'TargetUnreachableError';
    Error.captureStackTrace(this, this.constructor);
  }
}
