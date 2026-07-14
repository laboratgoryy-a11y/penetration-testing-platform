# Security and Encryption Implementation Guide

## Overview

This document provides a comprehensive guide to the security and encryption services implemented in the Penetration Testing Platform. All services follow industry best practices and security standards.

## Implemented Services

### 1. EncryptionService

**Location:** `src/services/EncryptionService.ts`

**Purpose:** Provides AES-256-GCM encryption for sensitive data storage.

**Features:**
- AES-256-GCM encryption algorithm
- Secure key derivation using scrypt
- Random salt and IV generation for each encryption
- Authentication tags for data integrity
- Support for encrypting strings, buffers, and objects

**Usage Example:**
```typescript
import { EncryptionService } from './services';

const encryptionService = new EncryptionService();

// Encrypt sensitive data
const encrypted = await encryptionService.encrypt('sensitive-data');

// Decrypt data
const decrypted = await encryptionService.decrypt(encrypted);

// Encrypt objects (e.g., credentials)
const credentials = { username: 'user', password: 'pass' };
const encryptedObj = await encryptionService.encryptObject(credentials);
const decryptedObj = await encryptionService.decryptObject(encryptedObj);
```

**Environment Variables:**
- `ENCRYPTION_MASTER_KEY`: Master encryption key (minimum 32 characters)

---

### 2. SessionManager

**Location:** `src/services/SessionManager.ts`

**Purpose:** Manages user sessions with automatic expiration and activity tracking.

**Features:**
- Session creation with configurable expiration
- Inactivity timeout (default: 30 minutes)
- Maximum session duration (default: 8 hours)
- Session validation and refresh
- Automatic cleanup of expired sessions
- Support for invalidating all user sessions (e.g., on password change)

**Usage Example:**
```typescript
import { SessionManager } from './services';
import { Pool } from 'pg';

const db = new Pool({ /* config */ });
const sessionManager = new SessionManager(db, {
  inactivityTimeout: 30 * 60 * 1000, // 30 minutes
  maxSessionDuration: 8 * 60 * 60 * 1000, // 8 hours
});

// Create session
const session = await sessionManager.createSession(
  'user-id',
  '192.168.1.1',
  'Mozilla/5.0...'
);

// Validate session
const isValid = await sessionManager.validateSession(session.id);

// Invalidate session (logout)
await sessionManager.invalidateSession(session.id);

// Cleanup expired sessions (run periodically)
const deletedCount = await sessionManager.cleanupExpiredSessions();
```

**Database Table:**
```sql
CREATE TABLE sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address INET NOT NULL,
  user_agent TEXT NOT NULL,
  last_activity TIMESTAMP NOT NULL
);
```

---

### 3. RateLimiter

**Location:** `src/services/RateLimiter.ts`

**Purpose:** Implements distributed rate limiting using Redis with sliding window algorithm.

**Features:**
- Sliding window algorithm for accurate rate limiting
- Redis-based for distributed systems
- Predefined rate limit presets
- Support for multiple rate limits per identifier
- Automatic cleanup of old entries

**Usage Example:**
```typescript
import { RateLimiter, RateLimitPresets } from './services';

const rateLimiter = new RateLimiter();
await rateLimiter.connect();

// Check rate limit
const result = await rateLimiter.checkLimit(
  'user-123',
  RateLimitPresets.API.limit,
  RateLimitPresets.API.window
);

if (!result.allowed) {
  console.log(`Rate limit exceeded. Reset at: ${result.resetAt}`);
}

// Reset limit for a user
await rateLimiter.resetLimit('user-123');
```

**Predefined Presets:**
- `AUTH`: 5 requests per 15 minutes
- `API`: 100 requests per 15 minutes
- `SCAN`: 10 requests per hour
- `PHISHING`: 5 requests per hour
- `NETWORK`: 5 requests per hour
- `REPORT`: 20 requests per hour

**Environment Variables:**
- `REDIS_URL`: Redis connection URL (default: `redis://localhost:6379`)

---

### 4. CSRFProtection

**Location:** `src/services/CSRFProtection.ts`

**Purpose:** Provides CSRF protection using double-submit cookie pattern with HMAC validation.

**Features:**
- HMAC-based token generation
- Token expiration (default: 24 hours)
- Origin and Referer header validation
- Express middleware support
- Session-based token validation

**Usage Example:**
```typescript
import { CSRFProtection } from './services';
import express from 'express';

const app = express();
const csrf = new CSRFProtection();

// Apply CSRF middleware
app.use(csrf.middleware());

// Generate token for a session
app.get('/csrf-token', async (req, res) => {
  const token = await csrf.setTokenCookie(req, res);
  res.json({ csrfToken: token });
});

// Protected endpoint (automatically validated by middleware)
app.post('/api/protected', (req, res) => {
  res.json({ success: true });
});
```

**Client-Side Usage:**
```javascript
// Include CSRF token in request headers
fetch('/api/protected', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

**Environment Variables:**
- `CSRF_SECRET`: CSRF secret key (minimum 32 characters)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins

---

### 5. ContentSecurityPolicy

**Location:** `src/services/ContentSecurityPolicy.ts`

**Purpose:** Implements Content Security Policy headers for XSS protection.

**Features:**
- Configurable CSP directives
- Nonce generation for inline scripts/styles
- Predefined security presets (Strict, Moderate, Relaxed)
- Report-only mode for testing
- Additional security headers (X-Frame-Options, X-Content-Type-Options, etc.)

**Usage Example:**
```typescript
import { ContentSecurityPolicy, CSPPresets, securityHeadersMiddleware } from './services';
import express from 'express';

const app = express();

// Use strict CSP for production
const csp = new ContentSecurityPolicy(CSPPresets.STRICT);
app.use(csp.middleware());

// Add additional security headers
app.use(securityHeadersMiddleware());

// Access nonce in templates
app.get('/', (req, res) => {
  const nonce = res.locals.cspNonce;
  res.send(`<script nonce="${nonce}">console.log('Safe script');</script>`);
});
```

**CSP Presets:**
- `STRICT`: Maximum security for production
- `MODERATE`: Balanced security for development
- `RELAXED`: Minimal restrictions for testing

---

### 6. TLSConfiguration

**Location:** `src/services/TLSConfiguration.ts`

**Purpose:** Provides secure TLS/HTTPS configuration with HSTS support.

**Features:**
- TLS 1.3 enforcement
- Secure cipher suite configuration
- HSTS (HTTP Strict Transport Security) support
- HTTPS redirect middleware
- Certificate validation
- Self-signed certificate instructions for development

**Usage Example:**
```typescript
import { TLSConfiguration, createSecurityMiddleware } from './services';
import express from 'express';

const app = express();

// Production configuration
const tlsConfig = TLSConfiguration.getProductionConfig(
  '/path/to/cert.pem',
  '/path/to/key.pem'
);

const tls = new TLSConfiguration(tlsConfig);

// Create HTTPS server
const httpsServer = tls.createHTTPSServer(app);

// Apply security middleware
app.use(...createSecurityMiddleware(tlsConfig));

httpsServer.listen(443, () => {
  console.log('HTTPS server running on port 443');
});
```

**Environment Variables:**
- `TLS_CERT_PATH`: Path to TLS certificate
- `TLS_KEY_PATH`: Path to TLS private key
- `TLS_CA_PATH`: Path to CA certificate (optional)

---

### 7. KeyManagementService

**Location:** `src/services/KeyManagementService.ts`

**Purpose:** Manages encryption keys with rotation and lifecycle management.

**Features:**
- Secure key generation and storage
- Envelope encryption (keys encrypted with master key)
- Automatic key rotation based on policy
- Key versioning
- Key revocation
- Integration instructions for AWS KMS, HashiCorp Vault, Azure Key Vault

**Usage Example:**
```typescript
import { KeyManagementService } from './services';
import { Pool } from 'pg';

const db = new Pool({ /* config */ });
const kms = new KeyManagementService(db);

// Initialize tables
await kms.initialize();

// Generate new key
const keyId = await kms.generateKey('phishing-key', 'phishing-credentials');

// Encrypt data with key
const encrypted = await kms.encryptWithKey(keyId, 'sensitive-data');

// Decrypt data with key
const decrypted = await kms.decryptWithKey(keyId, encrypted);

// Rotate key (create new version)
const newKeyId = await kms.rotateKey(keyId);

// Auto-rotate keys based on policy (run periodically)
const rotatedCount = await kms.autoRotateKeys();
```

**Environment Variables:**
- `MASTER_ENCRYPTION_KEY`: Master key for envelope encryption (minimum 32 characters)

**Key Rotation Policy:**
- Default rotation period: 90 days
- Keep last 3 versions of rotated keys
- Automatic rotation enabled by default

---

### 8. SecureDataDeletion

**Location:** `src/services/SecureDataDeletion.ts`

**Purpose:** Implements secure data deletion with overwriting to prevent recovery.

**Features:**
- Multi-pass overwrite (DoD 5220.22-M standard)
- Database record overwriting before deletion
- Secure file deletion
- Automatic cleanup of expired data
- Data retention policy enforcement

**Usage Example:**
```typescript
import { SecureDataDeletion, DataRetentionPolicies } from './services';
import { Pool } from 'pg';

const db = new Pool({ /* config */ });
const secureDelete = new SecureDataDeletion(db);

// Securely delete a record
const result = await secureDelete.secureDeleteRecord('users', 'user-id');

// Securely delete a file
await secureDelete.secureDeleteFile('/path/to/sensitive-file.txt');

// Delete all sensitive data for a user
await secureDelete.secureDeleteSensitiveData('user-id');

// Delete expired phishing data (30 days old)
await secureDelete.deleteExpiredPhishingData(30);

// Scheduled cleanup (run as cron job)
await secureDelete.scheduledCleanup();
```

**Data Retention Policies:**
- Phishing credentials: 30 days
- Network test data: Immediate deletion after report
- Audit logs: 7 years
- Scan results: 1 year
- Reports: 2 years

---

## Security Best Practices

### 1. Environment Variables

Always use environment variables for sensitive configuration:

```bash
# Encryption
ENCRYPTION_MASTER_KEY=your-secure-master-key-minimum-32-chars
MASTER_ENCRYPTION_KEY=your-secure-master-key-minimum-32-chars

# CSRF Protection
CSRF_SECRET=your-csrf-secret-minimum-32-chars
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# TLS/HTTPS
TLS_CERT_PATH=/path/to/cert.pem
TLS_KEY_PATH=/path/to/key.pem

# Redis
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### 2. Production Checklist

- [ ] Use TLS 1.3 for all connections
- [ ] Enable HSTS with preload
- [ ] Implement strict CSP
- [ ] Enable rate limiting on all endpoints
- [ ] Use CSRF protection for state-changing operations
- [ ] Rotate encryption keys every 90 days
- [ ] Enable audit logging for all sensitive operations
- [ ] Implement secure session management
- [ ] Use secure data deletion for sensitive information
- [ ] Regular security audits and penetration testing

### 3. Key Management

For production environments, consider using external key management services:

- **AWS KMS**: Managed key service with automatic rotation
- **HashiCorp Vault**: Enterprise-grade secrets management
- **Azure Key Vault**: Cloud-based key and secret management
- **Google Cloud KMS**: Managed encryption keys

### 4. Monitoring and Alerting

Implement monitoring for:
- Failed authentication attempts
- Rate limit violations
- CSRF token validation failures
- Session anomalies
- Key rotation events
- Data deletion operations

---

## Testing

Run the security and encryption tests:

```bash
npm test -- security-encryption.test.ts
```

---

## Compliance

This implementation follows:
- OWASP Top 10 security guidelines
- NIST encryption standards
- DoD 5220.22-M data sanitization standard
- GDPR data protection requirements
- PCI DSS security standards

---

## Support and Maintenance

### Regular Maintenance Tasks

1. **Daily:**
   - Monitor rate limit violations
   - Check for failed authentication attempts

2. **Weekly:**
   - Review audit logs
   - Clean up expired sessions

3. **Monthly:**
   - Review and update security policies
   - Check for security updates

4. **Quarterly:**
   - Rotate encryption keys
   - Security audit
   - Penetration testing

### Troubleshooting

**Issue: Encryption/Decryption Failures**
- Verify `ENCRYPTION_MASTER_KEY` is set correctly
- Check key length (minimum 32 characters)
- Ensure consistent key across all instances

**Issue: Rate Limiting Not Working**
- Verify Redis connection
- Check `REDIS_URL` environment variable
- Ensure Redis is running and accessible

**Issue: CSRF Token Validation Failures**
- Verify `CSRF_SECRET` is set
- Check Origin/Referer headers
- Ensure token is included in requests

**Issue: Session Expiration Issues**
- Check session configuration
- Verify database connectivity
- Review session cleanup schedule

---

## Additional Resources

- [OWASP Security Guidelines](https://owasp.org/)
- [NIST Cryptographic Standards](https://csrc.nist.gov/)
- [TLS Best Practices](https://wiki.mozilla.org/Security/Server_Side_TLS)
- [Content Security Policy Reference](https://content-security-policy.com/)

---

## License

This implementation is part of the Penetration Testing Platform and follows the project's license terms.
