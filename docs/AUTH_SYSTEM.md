# نظام المصادقة والتفويض (Authentication & Authorization System)

## نظرة عامة

تم تنفيذ نظام شامل للمصادقة والتفويض يتضمن:

1. **المصادقة (Authentication)**: التحقق من هوية المستخدم
2. **التفويض (Authorization)**: التحقق من صلاحيات المستخدم
3. **المصادقة متعددة العوامل (MFA)**: طبقة أمان إضافية باستخدام TOTP

## المكونات الرئيسية

### 1. النماذج (Models)

#### User Model
```typescript
import { User } from './models/User';

const user = new User({
  id: '123',
  username: 'testuser',
  email: 'test@example.com',
  mfaEnabled: false,
  accountLocked: false,
});

// Check if account is locked
user.isLocked(); // false

// Check if MFA is enabled
user.hasMFA(); // false

// Get safe user object (without sensitive data)
const safeUser = user.toSafeObject();
```

#### Role Model
```typescript
import { Role } from './models/Role';

const role = new Role({
  id: '123',
  name: 'PENTESTER',
  permissions: [
    { resource: 'scans', actions: ['READ', 'EXECUTE'] }
  ],
});

// Check permission
role.hasPermission('scans', 'READ'); // true
role.hasPermission('scans', 'WRITE'); // false

// Get actions for resource
const actions = role.getResourceActions('scans'); // ['READ', 'EXECUTE']
```

### 2. المستودعات (Repositories)

#### UserRepository
```typescript
import { UserRepository } from './repositories/UserRepository';

const userRepo = new UserRepository(db);

// Create user
const user = await userRepo.create(
  { username: 'testuser', email: 'test@example.com', password: 'pass' },
  passwordHash
);

// Find user
const user = await userRepo.findByUsername('testuser');
const user = await userRepo.findById('user-id');

// Update user
await userRepo.update('user-id', { mfaEnabled: true });

// Get user roles
const roles = await userRepo.getUserRoles('user-id');

// Assign role
await userRepo.assignRole('user-id', 'role-id');

// Lock/unlock account
await userRepo.lockAccount('user-id');
await userRepo.unlockAccount('user-id');
```

#### RoleRepository
```typescript
import { RoleRepository } from './repositories/RoleRepository';

const roleRepo = new RoleRepository(db);

// Create role
const role = await roleRepo.create({
  name: 'CUSTOM_ROLE',
  description: 'Custom role description'
});

// Find role
const role = await roleRepo.findByName('PENTESTER');

// Add permission to role
await roleRepo.addPermission('role-id', 'scans', 'EXECUTE');

// Check permission
const hasPermission = await roleRepo.hasPermission('role-id', 'scans', 'READ');
```

### 3. الخدمات (Services)

#### AuthenticationService
```typescript
import { AuthenticationService } from './services/AuthenticationService';

const authService = new AuthenticationService(db);

// Register new user
const user = await authService.register('username', 'email@example.com', 'password');

// Login
const result = await authService.login({
  username: 'testuser',
  password: 'password123',
  mfaToken: '123456' // Optional, required if MFA is enabled
});

if (result.success) {
  const { accessToken, refreshToken } = result.token;
  // Use tokens for subsequent requests
}

// Validate token
const validation = await authService.validateToken(accessToken);
if (validation.valid) {
  console.log('User ID:', validation.userId);
}

// Refresh token
const newToken = await authService.refreshToken(refreshToken);

// Logout
await authService.logout(accessToken);
```

#### MFAService
```typescript
import { MFAService } from './services/MFAService';

const mfaService = new MFAService(db);

// Setup MFA for user
const setup = await mfaService.setupMFA('user-id', 'user@example.com');
console.log('Secret:', setup.secret);
console.log('QR Code URL:', setup.qrCodeUrl);
console.log('Backup Codes:', setup.backupCodes);

// Enable MFA (verify token first)
const result = await mfaService.enableMFA('user-id', '123456');
if (result.valid) {
  console.log('MFA enabled successfully');
}

// Verify MFA during login
const verification = await mfaService.verifyMFA('user-id', '123456');
if (verification.valid) {
  console.log('MFA token valid');
}

// Disable MFA
await mfaService.disableMFA('user-id', '123456');
```

#### AuthorizationService
```typescript
import { AuthorizationService } from './services/AuthorizationService';

const authzService = new AuthorizationService(db);

// Check permission
const result = await authzService.checkPermission('user-id', 'scans', 'EXECUTE');
if (result.allowed) {
  // User has permission
}

// Check multiple permissions (any)
const result = await authzService.checkAnyPermission('user-id', [
  { resource: 'scans', action: 'EXECUTE' },
  { resource: 'phishing', action: 'EXECUTE' }
]);

// Check multiple permissions (all)
const result = await authzService.checkAllPermissions('user-id', [
  { resource: 'scans', action: 'READ' },
  { resource: 'scans', action: 'EXECUTE' }
]);

// Get user roles
const roles = await authzService.getUserRoles('user-id');

// Get user permissions
const permissions = await authzService.getUserPermissions('user-id');

// Grant/revoke role
await authzService.grantRole('user-id', 'PENTESTER');
await authzService.revokeRole('user-id', 'PENTESTER');

// Check role
const isPentester = await authzService.isPentester('user-id');
const isAdmin = await authzService.isAdmin('user-id');
```

### 4. Middleware

#### Authentication Middleware
```typescript
import express from 'express';
import { authenticate } from './middleware/auth';

const app = express();

// Protect route with authentication
app.get('/api/protected', authenticate(db), (req, res) => {
  // req.userId and req.username are available
  res.json({ userId: req.userId, username: req.username });
});
```

#### Authorization Middleware
```typescript
import { authenticate, authorize } from './middleware/auth';

// Require specific permission
app.post('/api/scans',
  authenticate(db),
  authorize('scans', 'EXECUTE')(db),
  (req, res) => {
    // User has permission to execute scans
  }
);

// Require any of multiple permissions
import { authorizeAny } from './middleware/auth';

app.get('/api/operations',
  authenticate(db),
  authorizeAny([
    { resource: 'scans', action: 'READ' },
    { resource: 'phishing', action: 'READ' }
  ])(db),
  (req, res) => {
    // User has at least one of the permissions
  }
);

// Require specific role
import { requireRole, requireAdmin } from './middleware/auth';

app.get('/api/admin',
  authenticate(db),
  requireAdmin(db),
  (req, res) => {
    // User is admin
  }
);
```

## الأدوار الافتراضية (Default Roles)

تم إنشاء الأدوار التالية في قاعدة البيانات:

1. **ADMIN**: مسؤول النظام - صلاحيات كاملة
2. **AUDITOR**: مدقق - مراقبة ومراجعة العمليات
3. **PENTESTER**: مختبر اختراق - تنفيذ اختبارات الاختراق
4. **ANALYST**: محلل أمني - عرض التقارير والنتائج

## الصلاحيات الافتراضية (Default Permissions)

| Resource | Actions | Description |
|----------|---------|-------------|
| authorizations | READ, WRITE, DELETE | إدارة التصاريح |
| scans | READ, EXECUTE | عمليات الفحص |
| phishing | READ, EXECUTE | حملات التصيد |
| network | READ, EXECUTE | تحليل الشبكات |
| audit | READ | سجلات التدقيق |
| reports | READ | التقارير |
| users | READ, WRITE | إدارة المستخدمين |

## آليات الأمان

### 1. تشفير كلمات المرور
- استخدام bcrypt مع 12 جولة من التشفير
- عدم تخزين كلمات المرور بشكل نصي

### 2. JWT Tokens
- Access Token: صالح لمدة 30 دقيقة
- Refresh Token: صالح لمدة 7 أيام
- يجب تخزين JWT_SECRET في متغيرات البيئة

### 3. قفل الحساب
- يتم قفل الحساب بعد 5 محاولات فاشلة
- يجب على المسؤول فتح الحساب

### 4. المصادقة متعددة العوامل (MFA)
- استخدام TOTP (Time-based One-Time Password)
- دعم Google Authenticator وتطبيقات مشابهة
- توليد رموز احتياطية

## متغيرات البيئة المطلوبة

```env
# JWT Secrets
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

## أمثلة على الاستخدام الكامل

### مثال 1: تسجيل مستخدم جديد وتسجيل الدخول

```typescript
import { Pool } from 'pg';
import { AuthenticationService } from './services/AuthenticationService';
import { AuthorizationService } from './services/AuthorizationService';

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const authService = new AuthenticationService(db);
const authzService = new AuthorizationService(db);

// Register
const user = await authService.register(
  'pentester1',
  'pentester@example.com',
  'SecurePassword123!'
);

// Assign role
await authzService.grantRole(user.id, 'PENTESTER');

// Login
const loginResult = await authService.login({
  username: 'pentester1',
  password: 'SecurePassword123!'
});

if (loginResult.success) {
  console.log('Access Token:', loginResult.token.accessToken);
}
```

### مثال 2: تفعيل MFA

```typescript
import { MFAService } from './services/MFAService';

const mfaService = new MFAService(db);

// Setup MFA
const setup = await mfaService.setupMFA(userId, 'user@example.com');

// Display QR code to user
console.log('Scan this QR code:', setup.qrCodeUrl);
console.log('Or enter this secret:', setup.secret);
console.log('Backup codes:', setup.backupCodes);

// User scans QR code and enters token
const token = '123456'; // From authenticator app

// Enable MFA
const result = await mfaService.enableMFA(userId, token);
if (result.valid) {
  console.log('MFA enabled successfully');
}

// Next login will require MFA token
const loginResult = await authService.login({
  username: 'pentester1',
  password: 'SecurePassword123!',
  mfaToken: '123456'
});
```

### مثال 3: التحقق من الصلاحيات

```typescript
// Check if user can execute scans
const canScan = await authzService.checkPermission(userId, 'scans', 'EXECUTE');

if (canScan.allowed) {
  // Start scan
} else {
  console.log('Permission denied:', canScan.reason);
}

// Check if user is admin
const isAdmin = await authzService.isAdmin(userId);

if (isAdmin) {
  // Admin operations
}
```

## الاختبارات

تم إنشاء اختبارات وحدة في `src/__tests__/auth.test.ts` للتحقق من:

- تشفير والتحقق من كلمات المرور
- توليد والتحقق من رموز MFA
- نماذج المستخدمين والأدوار
- التحقق من الصلاحيات

لتشغيل الاختبارات:
```bash
npm test
```

## الخطوات التالية

1. تنفيذ قائمة سوداء للرموز (Token Blacklist) في Redis
2. إضافة دعم لرموز الاحتياطية في MFA
3. تنفيذ سياسات كلمات المرور (تعقيد، انتهاء صلاحية)
4. إضافة تسجيل شامل لجميع عمليات المصادقة والتفويض
5. تنفيذ إشعارات عند محاولات تسجيل الدخول المشبوهة

## الملاحظات الأمنية

⚠️ **مهم**: 
- يجب تغيير JWT_SECRET و JWT_REFRESH_SECRET في الإنتاج
- يجب استخدام HTTPS في الإنتاج
- يجب تفعيل MFA لجميع الحسابات ذات الامتيازات العالية
- يجب مراجعة سجلات التدقيق بانتظام
