import {
  ApplicationError,
  AuthorizationError,
  ValidationError,
  ScopeViolationError,
  ExpiredAuthorizationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
} from '../utils/errors';

describe('Custom Error Classes', () => {
  test('ApplicationError should have correct properties', () => {
    const error = new ApplicationError('Test error', 500, 'TEST_ERROR');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.name).toBe('ApplicationError');
  });

  test('AuthorizationError should have 403 status code', () => {
    const error = new AuthorizationError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('AUTHORIZATION_ERROR');
  });

  test('ValidationError should have 400 status code', () => {
    const error = new ValidationError();
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  test('ScopeViolationError should have 403 status code', () => {
    const error = new ScopeViolationError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('SCOPE_VIOLATION');
  });

  test('ExpiredAuthorizationError should have 403 status code', () => {
    const error = new ExpiredAuthorizationError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('EXPIRED_AUTHORIZATION');
  });

  test('AuthenticationError should have 401 status code', () => {
    const error = new AuthenticationError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('AUTHENTICATION_ERROR');
  });

  test('NotFoundError should have 404 status code', () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
  });

  test('ConflictError should have 409 status code', () => {
    const error = new ConflictError();
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });

  test('Custom error messages should be preserved', () => {
    const customMessage = 'Custom error message';
    const error = new AuthorizationError(customMessage);
    expect(error.message).toBe(customMessage);
  });
});
