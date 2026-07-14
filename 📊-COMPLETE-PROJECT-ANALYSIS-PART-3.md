# 📊 تحليل شامل للمشروع - الجزء الثالث
# Complete Project Analysis - Part 3

## 🔌 API Endpoints | نقاط نهاية API

### Base URL
```
http://localhost:3001/api/v1
```

### 1. Authentication Endpoints | نقاط المصادقة

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
POST   /api/v1/auth/mfa/enable
POST   /api/v1/auth/mfa/verify
POST   /api/v1/auth/refresh
```

**مثال: تسجيل الدخول**
```javascript
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "123456",
  "mfaToken": "123456" // اختياري
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "role": "ADMIN"
    }
  }
}
```

### 2. Dashboard Endpoints | نقاط لوحة التحكم

```
GET    /api/v1/dashboard/stats
GET    /api/v1/dashboard/vulnerability-distribution
GET    /api/v1/dashboard/recent-activity
```

**مثال: إحصائيات لوحة التحكم**
```javascript
GET /api/v1/dashboard/stats
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "totalUsers": 3,
    "totalScans": 15,
    "totalVulnerabilities": 42,
    "totalCampaigns": 5,
    "totalNetworkTests": 8,
    "activeSessions": 2
  }
}
```

### 3. Authorization Endpoints | نقاط التصاريح

```
GET    /api/v1/authorizations
POST   /api/v1/authorizations
GET    /api/v1/authorizations/:id
PUT    /api/v1/authorizations/:id
DELETE /api/v1/authorizations/:id
POST   /api/v1/authorizations/:id/validate
POST   /api/v1/authorizations/:id/revoke
```

**مثال: إنشاء تصريح**
```javascript
POST /api/v1/authorizations
Authorization: Bearer <token>
Content-Type: application/json

{
  "organizationName": "شركة الاختبار",
  "contactPerson": "أحمد محمد",
  "contactEmail": "ahmad@test.com",
  "contactPhone": "+966501234567",
  "targetScope": "192.168.1.0/24, example.com",
  "allowedOperations": ["WEB_SCAN", "NETWORK_TEST"],
  "validFrom": "2024-01-01T00:00:00Z",
  "validUntil": "2024-12-31T23:59:59Z"
}

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "تم إنشاء التصريح بنجاح"
  }
}
```

### 4. Web Scanning Endpoints | نقاط فحص الويب

```
GET    /api/v1/scans/web
POST   /api/v1/scans/web
GET    /api/v1/scans/web/:id
GET    /api/v1/scans/web/:id/status
GET    /api/v1/scans/web/:id/vulnerabilities
POST   /api/v1/scans/web/:id/stop
GET    /api/v1/scans/web/:id/report
```

**مثال: بدء فحص ويب**
```javascript
POST /api/v1/scans/web
Authorization: Bearer <token>
Content-Type: application/json

{
  "target": {
    "url": "https://example.com",
    "authorizationId": "uuid"
  },
  "config": {
    "maxDepth": 3,
    "maxRequests": 100,
    "vulnerabilityTypes": [
      "SQL_INJECTION",
      "XSS",
      "CSRF"
    ],
    "respectRobotsTxt": true,
    "customHeaders": {}
  }
}

Response:
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "status": "RUNNING"
  }
}
```

### 5. Phishing Campaign Endpoints | نقاط حملات التصيد

```
GET    /api/v1/phishing/campaigns
POST   /api/v1/phishing/campaigns
GET    /api/v1/phishing/campaigns/:id
PUT    /api/v1/phishing/campaigns/:id
DELETE /api/v1/phishing/campaigns/:id
POST   /api/v1/phishing/campaigns/:id/launch
POST   /api/v1/phishing/campaigns/:id/stop
GET    /api/v1/phishing/campaigns/:id/results
GET    /api/v1/phishing/campaigns/:id/interactions
GET    /api/v1/phishing/campaigns/:id/targets
GET    /api/v1/phishing/campaigns/:id/report
```

**مثال: إنشاء حملة تصيد**
```javascript
POST /api/v1/phishing/campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "authorizationId": "uuid",
  "name": "حملة التوعية Q1",
  "emailTemplate": "password-reset",
  "landingPage": "office365",
  "targets": [
    "user1@example.com",
    "user2@example.com"
  ]
}

Response:
{
  "success": true,
  "data": {
    "campaignId": "uuid",
    "message": "تم إنشاء الحملة بنجاح"
  }
}
```


### 6. Network Analysis Endpoints | نقاط تحليل الشبكات

```
GET    /api/v1/network/tests
POST   /api/v1/network/tests
GET    /api/v1/network/tests/:id
GET    /api/v1/network/tests/:id/status
GET    /api/v1/network/tests/:id/results
POST   /api/v1/network/tests/:id/stop
GET    /api/v1/network/tests/:id/report
POST   /api/v1/network/discover
```

**مثال: بدء تحليل شبكة**
```javascript
POST /api/v1/network/tests
Authorization: Bearer <token>
Content-Type: application/json

{
  "target": {
    "ssid": "faraa net",
    "bssid": "4a:1f:4c:46:18:2b",
    "authorizationId": "uuid"
  },
  "config": {
    "testTypes": [
      "WEP_CRACK",
      "WPA_HANDSHAKE",
      "WPS_ATTACK"
    ],
    "maxAttempts": 100,
    "passwordDictionary": "rockyou.txt"
  }
}

Response:
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "status": "RUNNING",
    "message": "تم بدء تحليل الشبكة بنجاح"
  }
}
```

### 7. IP Scanner Endpoints | نقاط فحص IP

```
GET    /api/v1/ip-scanner/scans
POST   /api/v1/ip-scanner/scan
GET    /api/v1/ip-scanner/scans/:id
GET    /api/v1/ip-scanner/scans/:id/results
POST   /api/v1/ip-scanner/scans/:id/stop
GET    /api/v1/ip-scanner/schedules
POST   /api/v1/ip-scanner/schedules
DELETE /api/v1/ip-scanner/schedules/:id
GET    /api/v1/ip-scanner/comparisons
POST   /api/v1/ip-scanner/comparisons
```

### 8. Reports Endpoints | نقاط التقارير

```
GET    /api/v1/reports
POST   /api/v1/reports
GET    /api/v1/reports/:id
DELETE /api/v1/reports/:id
GET    /api/v1/reports/:id/download
POST   /api/v1/reports/compliance
```

**مثال: توليد تقرير**
```javascript
POST /api/v1/reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "SCAN",
  "format": "PDF",
  "sessionId": "uuid",
  "includeEvidence": true,
  "includeRemediation": true
}

Response:
{
  "success": true,
  "data": {
    "reportId": "uuid",
    "downloadUrl": "/api/v1/reports/uuid/download"
  }
}
```

### 9. Audit Logs Endpoints | نقاط سجلات التدقيق

```
GET    /api/v1/audit/logs
GET    /api/v1/audit/logs/:id
GET    /api/v1/audit/logs/export
```

### 10. CVE Endpoints | نقاط CVE

```
GET    /api/v1/cve/search
GET    /api/v1/cve/:id
```

---

## 🔐 نظام الأمان | Security System

### 1. المصادقة | Authentication

#### JWT Token Structure
```javascript
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "uuid",
    "username": "admin",
    "role": "ADMIN",
    "iat": 1234567890,
    "exp": 1234569690
  }
}
```

#### Token Expiration
- **Access Token**: 30 دقيقة
- **Refresh Token**: 7 أيام

#### MFA (Multi-Factor Authentication)
- **Algorithm**: TOTP (Time-based One-Time Password)
- **Library**: speakeasy
- **QR Code**: يتم توليده عند التفعيل

### 2. التفويض | Authorization

#### Role-Based Access Control (RBAC)
```javascript
// مثال: التحقق من الصلاحيات
async function checkPermission(userId, resource, action) {
  // 1. الحصول على أدوار المستخدم
  const roles = await getUserRoles(userId);
  
  // 2. الحصول على صلاحيات الأدوار
  const permissions = await getRolePermissions(roles);
  
  // 3. التحقق من وجود الصلاحية
  return permissions.some(p => 
    p.resource === resource && p.action === action
  );
}
```

#### Authorization Validation
```javascript
// التحقق من صلاحية التصريح
async function validateAuthorization(authId, target, operation) {
  const auth = await getAuthorization(authId);
  
  // 1. التحقق من الحالة
  if (auth.status !== 'ACTIVE') return false;
  
  // 2. التحقق من التاريخ
  const now = new Date();
  if (now < auth.validFrom || now > auth.validUntil) return false;
  
  // 3. التحقق من النطاق
  if (!isInScope(target, auth.scopes)) return false;
  
  // 4. التحقق من العملية
  if (!auth.operations.includes(operation)) return false;
  
  return true;
}
```

### 3. التشفير | Encryption

#### Data Encryption
```javascript
// AES-256-GCM
const algorithm = 'aes-256-gcm';
const keyLength = 32; // 256 bits

// تشفير البيانات الحساسة
function encrypt(data, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}
```

#### Password Hashing
```javascript
// bcrypt with salt rounds = 12
const saltRounds = 12;

async function hashPassword(password) {
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
```

### 4. Rate Limiting | تحديد المعدل

```javascript
// إعدادات Rate Limiting
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 دقيقة
  max: 100, // 100 طلب كحد أقصى
  message: 'تم تجاوز الحد الأقصى للطلبات',
  standardHeaders: true,
  legacyHeaders: false
};

// Rate limits مختلفة حسب النقطة
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 محاولات تسجيل دخول
  skipSuccessfulRequests: true
});
```

### 5. Input Validation | التحقق من المدخلات

```javascript
// مثال: التحقق من URL
function validateUrl(url) {
  try {
    const parsed = new URL(url);
    
    // التحقق من البروتوكول
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('بروتوكول غير مدعوم');
    }
    
    // التحقق من عدم وجود IP محلي
    if (isPrivateIP(parsed.hostname)) {
      throw new Error('لا يمكن فحص عناوين IP المحلية');
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
```

### 6. Session Management | إدارة الجلسات

```javascript
// إعدادات الجلسة
const sessionConfig = {
  timeout: 30 * 60 * 1000, // 30 دقيقة
  maxDuration: 8 * 60 * 60 * 1000, // 8 ساعات
  renewalThreshold: 5 * 60 * 1000 // 5 دقائق
};

// تنظيف الجلسات المنتهية
async function cleanExpiredSessions() {
  await db.query(`
    DELETE FROM sessions 
    WHERE expires_at < NOW()
  `);
}
```

### 7. Audit Logging | تسجيل التدقيق

```javascript
// تسجيل جميع العمليات
async function logAudit(event) {
  await db.query(`
    INSERT INTO audit_logs (
      user_id, event_type, resource, 
      action, result, details, 
      ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    event.userId,
    event.eventType,
    event.resource,
    event.action,
    event.result,
    JSON.stringify(event.details),
    event.ipAddress,
    event.userAgent
  ]);
}
```

