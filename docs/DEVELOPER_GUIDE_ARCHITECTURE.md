# دليل البنية المعمارية - منصة اختبار الاختراق

## نظرة عامة

هذا الدليل يوفر فهماً شاملاً للبنية المعمارية لمنصة اختبار الاختراق والأمن الهجومي. يستهدف المطورين الذين يرغبون في المساهمة في المشروع أو فهم كيفية عمل المنصة.

## المبادئ المعمارية

### 1. الفصل بين الطبقات (Separation of Concerns)
كل طبقة لها مسؤولية محددة ولا تعتمد مباشرة على تفاصيل الطبقات الأخرى.

### 2. قابلية التوسع (Scalability)
البنية مصممة للتوسع الأفقي والعمودي.

### 3. الأمان أولاً (Security First)
جميع المكونات مصممة مع وضع الأمان في الاعتبار.

### 4. القابلية للاختبار (Testability)
المكونات مصممة لتكون قابلة للاختبار بسهولة.

### 5. المرونة (Flexibility)
سهولة إضافة مكونات جديدة أو تعديل الموجودة.

## البنية متعددة الطبقات

### الطبقة 1: طبقة العرض (Presentation Layer)

**المسؤولية:** التفاعل مع المستخدمين والأنظمة الخارجية

**المكونات:**
- Web UI (React/Vue.js)
- REST API (Express.js)
- CLI Tool (Commander.js)
- WebSocket Server (للتحديثات الفورية)

**التقنيات:**
```typescript
// Express.js API
import express from 'express';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

const app = express();
app.use(express.json());
app.use(authMiddleware);
app.use('/api/v1', routes);
app.use(errorHandler);
```

### الطبقة 2: طبقة منطق الأعمال (Business Logic Layer)

**المسؤولية:** تنفيذ قواعد العمل والمنطق الأساسي

**المكونات:**
- Authorization Manager
- Web Scanner
- Phishing Engine
- Network Analyzer
- Report Generator
- Audit Logger

**نمط التصميم:** Service Layer Pattern

```typescript
// مثال: WebScanner Service
export class WebScanner {
  constructor(
    private authManager: AuthorizationManager,
    private crawler: Crawler,
    private vulnTester: VulnerabilityTester,
    private auditLogger: AuditLogger
  ) {}

  async startScan(
    userId: string,
    target: WebTarget,
    config: ScanConfiguration
  ): Promise<ScanSession> {
    // 1. التحقق من التصريح
    const authResult = await this.authManager.validateAuthorization(
      userId,
      target,
      'WEB_SCAN'
    );
    
    if (!authResult.authorized) {
      throw new AuthorizationError(authResult.reason);
    }

    // 2. إنشاء جلسة فحص
    const session = await this.createSession(userId, target, config);

    // 3. بدء الفحص بشكل غير متزامن
    this.executeScan(session).catch(error => {
      this.handleScanError(session, error);
    });

    // 4. تسجيل الحدث
    await this.auditLogger.logEvent({
      userId,
      eventType: 'SCAN_STARTED',
      resource: target.url,
      action: 'START_SCAN',
      result: 'SUCCESS'
    });

    return session;
  }
}
```

### الطبقة 3: طبقة الوصول للبيانات (Data Access Layer)

**المسؤولية:** التفاعل مع قاعدة البيانات والتخزين

**المكونات:**
- Repositories (نمط Repository)
- Database Connection Pool
- Query Builders
- Migrations

**نمط التصميم:** Repository Pattern

```typescript
// مثال: ScanSessionRepository
export class ScanSessionRepository {
  constructor(private db: Database) {}

  async create(session: ScanSession): Promise<string> {
    const query = `
      INSERT INTO scan_sessions 
      (user_id, authorization_id, target_url, status, config)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    
    const result = await this.db.query(query, [
      session.userId,
      session.authorizationId,
      session.targetUrl,
      session.status,
      JSON.stringify(session.config)
    ]);
    
    return result.rows[0].id;
  }

  async findById(id: string): Promise<ScanSession | null> {
    const query = `
      SELECT * FROM scan_sessions WHERE id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }
}
```

### الطبقة 4: طبقة البيانات (Data Layer)

**المسؤولية:** تخزين البيانات

**المكونات:**
- PostgreSQL (قاعدة البيانات الرئيسية)
- Redis (التخزين المؤقت والجلسات)
- File System (التقارير والوثائق)

## المكونات الرئيسية

### 1. Authorization Manager

**الغرض:** إدارة التصاريح والتحقق من الامتثال القانوني

**المسؤوليات:**
- التحقق من صحة التصاريح
- التحقق من نطاق العمل
- مراقبة انتهاء الصلاحية
- اكتشاف محاولات التجاوز

**التفاعلات:**
```
User Request → API → Authorization Manager → Database
                ↓
         Audit Logger
```

**الواجهات الرئيسية:**
```typescript
interface AuthorizationManager {
  validateAuthorization(
    userId: string,
    target: Target,
    operationType: OperationType
  ): Promise<AuthorizationResult>;
  
  uploadAuthorization(
    userId: string,
    document: AuthorizationDocument
  ): Promise<AuthorizationId>;
  
  isTargetInScope(
    authorizationId: string,
    target: Target
  ): Promise<boolean>;
}
```

### 2. Web Scanner

**الغرض:** فحص تطبيقات الويب واكتشاف الثغرات

**المسؤوليات:**
- الزحف واكتشاف الصفحات
- اختبار الثغرات
- تسجيل النتائج
- احترام robots.txt

**البنية الداخلية:**
```
WebScanner
├── Crawler (اكتشاف الصفحات)
├── VulnerabilityTester (اختبار الثغرات)
│   ├── SQLInjectionTester
│   ├── XSSTester
│   ├── CSRFTester
│   ├── DirectoryTraversalTester
│   └── CommandInjectionTester
└── ResultsManager (إدارة النتائج)
```

**تدفق العمل:**
```
1. التحقق من التصريح
2. بدء الزحف
3. لكل صفحة مكتشفة:
   a. اختبار الثغرات
   b. تسجيل النتائج
   c. التحقق من النطاق
4. توليد التقرير
```

### 3. Phishing Engine

**الغرض:** إدارة حملات التصيد الاحتيالي التدريبية

**المسؤوليات:**
- إنشاء وإدارة الحملات
- إرسال رسائل البريد الإلكتروني
- تتبع التفاعلات
- تشفير البيانات الحساسة

**البنية الداخلية:**
```
PhishingEngine
├── CampaignManager (إدارة الحملات)
├── EmailSender (إرسال الرسائل)
├── TrackingServer (تتبع التفاعلات)
├── LandingPageServer (صفحات الهبوط)
└── DataEncryption (تشفير البيانات)
```

### 4. Network Analyzer

**الغرض:** اختبار أمان الشبكات اللاسلكية

**المسؤوليات:**
- اكتشاف نقاط الوصول
- اختبار قوة التشفير
- تحليل حركة المرور
- اكتشاف الثغرات

**البنية الداخلية:**
```
NetworkAnalyzer
├── AccessPointDiscovery (اكتشاف نقاط الوصول)
├── NetworkTester (اختبار الشبكات)
│   ├── WEPCracker
│   ├── WPAHandshakeCapture
│   ├── WPSAttacker
│   └── TrafficAnalyzer
└── DeviceDiscovery (اكتشاف الأجهزة)
```

## أنماط التصميم المستخدمة

### 1. Repository Pattern
فصل منطق الوصول للبيانات عن منطق الأعمال.

```typescript
// Repository Interface
interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(entity: T): Promise<string>;
  update(id: string, entity: Partial<T>): Promise<void>;
  delete(id: string): Promise<void>;
}

// Implementation
class UserRepository implements IRepository<User> {
  // Implementation details
}
```

### 2. Service Layer Pattern
تجميع منطق الأعمال في خدمات قابلة لإعادة الاستخدام.

```typescript
class AuthenticationService {
  constructor(
    private userRepo: UserRepository,
    private sessionManager: SessionManager,
    private auditLogger: AuditLogger
  ) {}

  async login(username: string, password: string): Promise<AuthToken> {
    // Business logic
  }
}
```

### 3. Factory Pattern
إنشاء كائنات معقدة بطريقة مرنة.

```typescript
class VulnerabilityTesterFactory {
  createTester(type: VulnerabilityType): IVulnerabilityTester {
    switch (type) {
      case 'SQL_INJECTION':
        return new SQLInjectionTester();
      case 'XSS':
        return new XSSTester();
      // ...
    }
  }
}
```

### 4. Strategy Pattern
تبديل الخوارزميات ديناميكياً.

```typescript
interface EncryptionStrategy {
  encrypt(data: string): Promise<string>;
  decrypt(data: string): Promise<string>;
}

class AES256Strategy implements EncryptionStrategy {
  // Implementation
}

class RSAStrategy implements EncryptionStrategy {
  // Implementation
}
```

### 5. Observer Pattern
إشعار المكونات بالأحداث.

```typescript
class ScanSession extends EventEmitter {
  async executeScan() {
    this.emit('scan:started');
    // Scan logic
    this.emit('vulnerability:found', vulnerability);
    // More logic
    this.emit('scan:completed');
  }
}

// Usage
session.on('vulnerability:found', (vuln) => {
  console.log('Found vulnerability:', vuln);
});
```

## تدفق البيانات

### مثال: فحص تطبيق ويب

```
1. User → Web UI: "بدء فحص"
2. Web UI → API: POST /api/v1/scans/web
3. API → AuthMiddleware: التحقق من JWT
4. AuthMiddleware → API: مصادق ✓
5. API → WebScanner: startScan()
6. WebScanner → AuthorizationManager: validateAuthorization()
7. AuthorizationManager → Database: التحقق من التصريح
8. Database → AuthorizationManager: تصريح صالح ✓
9. AuthorizationManager → WebScanner: authorized = true
10. WebScanner → Database: إنشاء جلسة فحص
11. WebScanner → Crawler: بدء الزحف
12. Crawler → VulnerabilityTester: اختبار كل صفحة
13. VulnerabilityTester → Database: حفظ الثغرات
14. WebScanner → AuditLogger: تسجيل الحدث
15. WebScanner → API: ScanSession
16. API → Web UI: استجابة JSON
17. Web UI → User: "الفحص بدأ"
```

## إدارة الحالة

### الحالات المحتملة لجلسة الفحص

```typescript
type ScanStatus = 
  | 'PENDING'    // في الانتظار
  | 'RUNNING'    // قيد التنفيذ
  | 'COMPLETED'  // مكتمل
  | 'FAILED'     // فشل
  | 'STOPPED';   // متوقف

// State Machine
class ScanStateMachine {
  private state: ScanStatus = 'PENDING';

  transition(newState: ScanStatus): void {
    const validTransitions = {
      'PENDING': ['RUNNING', 'FAILED'],
      'RUNNING': ['COMPLETED', 'FAILED', 'STOPPED'],
      'COMPLETED': [],
      'FAILED': [],
      'STOPPED': []
    };

    if (!validTransitions[this.state].includes(newState)) {
      throw new Error(`Invalid transition: ${this.state} → ${newState}`);
    }

    this.state = newState;
  }
}
```

## معالجة الأخطاء

### هرمية الأخطاء

```typescript
// Base Error
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific Errors
class AuthorizationError extends AppError {
  constructor(message: string) {
    super(message, 403, true);
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, true);
  }
}

class ScopeViolationError extends AppError {
  constructor(message: string) {
    super(message, 403, true);
  }
}
```

### معالج الأخطاء المركزي

```typescript
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    // Operational error
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Programming error
  console.error('ERROR 💥', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong'
  });
};
```

## الأمان

### التشفير

```typescript
// Encryption Service
class EncryptionService {
  private algorithm = 'aes-256-gcm';

  async encrypt(data: string, key: string): Promise<Buffer> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(key, 'hex'),
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]);
  }

  async decrypt(encryptedData: Buffer, key: string): Promise<string> {
    const iv = encryptedData.slice(0, 16);
    const authTag = encryptedData.slice(16, 32);
    const encrypted = encryptedData.slice(32);

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(key, 'hex'),
      iv
    );

    decipher.setAuthTag(authTag);

    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
```

### المصادقة والتفويض

```typescript
// JWT Middleware
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AuthenticationError('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    
    next();
  } catch (error) {
    next(new AuthenticationError('Invalid token'));
  }
};

// Permission Middleware
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const hasPermission = await authService.checkPermission(
      req.user.id,
      permission
    );

    if (!hasPermission) {
      throw new AuthorizationError('Insufficient permissions');
    }

    next();
  };
};
```

## الأداء والتحسين

### التخزين المؤقت (Caching)

```typescript
// Redis Cache
class CacheService {
  private redis: Redis;

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### تجميع الاستعلامات (Query Batching)

```typescript
// DataLoader for batching
const userLoader = new DataLoader(async (userIds: string[]) => {
  const users = await userRepository.findByIds(userIds);
  return userIds.map(id => users.find(u => u.id === id));
});

// Usage
const user1 = await userLoader.load('user-1');
const user2 = await userLoader.load('user-2');
// Both queries batched into one
```

## المراقبة والتسجيل

### التسجيل المنظم (Structured Logging)

```typescript
// Logger
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Usage
logger.info('Scan started', {
  userId: 'user-123',
  target: 'example.com',
  sessionId: 'scan-456'
});
```

### المقاييس (Metrics)

```typescript
// Prometheus metrics
import { Counter, Histogram } from 'prom-client';

const scanCounter = new Counter({
  name: 'scans_total',
  help: 'Total number of scans',
  labelNames: ['status']
});

const scanDuration = new Histogram({
  name: 'scan_duration_seconds',
  help: 'Scan duration in seconds',
  buckets: [60, 300, 600, 1800, 3600]
});

// Usage
scanCounter.inc({ status: 'completed' });
const end = scanDuration.startTimer();
// ... scan logic
end();
```

## الاختبار

### هرمية الاختبارات

```
Unit Tests (70%)
├── Services
├── Repositories
├── Utilities
└── Validators

Integration Tests (20%)
├── API Endpoints
├── Database Operations
└── External Services

Property-Based Tests (5%)
├── Authorization Logic
├── Encryption/Decryption
└── Input Validation

End-to-End Tests (5%)
└── Complete Workflows
```

### مثال على اختبار وحدة

```typescript
describe('AuthorizationManager', () => {
  let authManager: AuthorizationManager;
  let mockRepo: jest.Mocked<AuthorizationRepository>;

  beforeEach(() => {
    mockRepo = createMockRepository();
    authManager = new AuthorizationManager(mockRepo);
  });

  it('should reject operation without valid authorization', async () => {
    mockRepo.findByUserId.mockResolvedValue([]);

    await expect(
      authManager.validateAuthorization('user-1', target, 'WEB_SCAN')
    ).rejects.toThrow(AuthorizationError);
  });
});
```

## النشر

### البيئات

```
Development → Staging → Production

Development:
- Local development
- Hot reload
- Debug mode

Staging:
- Production-like environment
- Integration testing
- Performance testing

Production:
- High availability
- Load balancing
- Monitoring
```

### Docker

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## الخلاصة

البنية المعمارية للمنصة مصممة لتكون:
- ✅ قابلة للتوسع
- ✅ آمنة
- ✅ قابلة للصيانة
- ✅ قابلة للاختبار
- ✅ مرنة

---

**للمزيد من المعلومات:**
- [وثائق API](./API_DOCUMENTATION.md)
- [دليل المساهمة](./CONTRIBUTING.md)
