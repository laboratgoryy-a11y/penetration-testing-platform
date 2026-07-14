import { config } from '../../config';

const COMMON_PASSWORD_PATTERNS = [
  'password',
  'qwerty',
  'letmein',
  'welcome',
  'admin',
  '123456',
];

export interface PasswordPolicyContext {
  username?: string;
  email?: string;
}

export interface PasswordPolicyResult {
  valid: boolean;
  reasons: string[];
}

function normalizeForComparison(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function validatePasswordStrength(
  password: string,
  context: PasswordPolicyContext = {}
): PasswordPolicyResult {
  const reasons: string[] = [];
  const minLength = config.security.passwordMinLength;
  const maxLength = config.security.passwordMaxLength;

  if (password.length < minLength) {
    reasons.push(`Password must be at least ${minLength} characters long`);
  }

  if (password.length > maxLength) {
    reasons.push(`Password must be at most ${maxLength} characters long`);
  }

  if (!/[a-z]/.test(password)) {
    reasons.push('Password must include a lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    reasons.push('Password must include an uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    reasons.push('Password must include a number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    reasons.push('Password must include a symbol');
  }

  if (/[\u0000-\u001F\u007F]/.test(password)) {
    reasons.push('Password must not contain control characters');
  }

  const normalizedPassword = normalizeForComparison(password);
  if (
    normalizedPassword &&
    COMMON_PASSWORD_PATTERNS.some((pattern) =>
      normalizedPassword.includes(pattern)
    )
  ) {
    reasons.push('Password must not contain common or banned patterns');
  }

  const contextualIdentifiers = [
    context.username?.trim(),
    context.email?.split('@')[0]?.trim(),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeForComparison)
    .filter((value) => value.length >= 3);

  if (
    normalizedPassword &&
    contextualIdentifiers.some((identifier) =>
      normalizedPassword.includes(identifier)
    )
  ) {
    reasons.push('Password must not contain your username or email name');
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}
