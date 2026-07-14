# دليل استخدام سياسة إعادة المحاولة (Retry Policy)

## نظرة عامة

توفر `RetryPolicy` آلية قوية لإعادة محاولة العمليات الفاشلة تلقائياً، خاصة عند التعامل مع الخدمات الخارجية والشبكات غير المستقرة.

## الاستخدام الأساسي

### 1. استخدام السياسة الافتراضية

```typescript
import { withRetry } from './services/RetryPolicy';

// استخدام السياسة الافتراضية
const result = await withRetry(
  async () => {
    return await externalService.call();
  },
  'external-service-call'
);
```

### 2. إنشاء سياسة مخصصة

```typescript
import { RetryPolicy } from './services/RetryPolicy';

const policy = new RetryPolicy({
  maxAttempts: 5,
  backoffStrategy: 'EXPONENTIAL',
  initialDelay: 1000,
  maxDelay: 30000,
});

const result = await policy.execute(
  async () => {
    return await externalService.call();
  },
  'external-service-call'
);
```

## أمثلة عملية

### إرسال رسائل البريد الإلكتروني

```typescript
import { RetryPolicy } from './services/RetryPolicy';
import { ExternalServiceError } from './utils/errors';

class EmailService {
  private retryPolicy: RetryPolicy;

  constructor() {
    this.retryPolicy = new RetryPolicy({
      maxAttempts: 3,
      backoffStrategy: 'EXPONENTIAL',
      initialDelay: 1000,
      maxDelay: 10000,
    });
  }

  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    return this.retryPolicy.execute(
      async () => {
        try {
          await this.smtpClient.send({ to, subject, body });
        } catch (error) {
          throw new ExternalServiceError(
            'Failed to send email',
            'SMTP',
            { to, subject }
          );
        }
      },
      'send-email'
    );
  }
}
```

### استدعاء API خارجي

```typescript
import { RetryPolicy } from './services/RetryPolicy';
import { NetworkError } from './utils/errors';
import axios from 'axios';

class ExternalAPIClient {
  private retryPolicy: RetryPolicy;

  constructor() {
    this.retryPolicy = new RetryPolicy({
      maxAttempts: 3,
      backoffStrategy: 'EXPONENTIAL',
      initialDelay: 500,
      maxDelay: 5000,
    });
  }

  async fetchData(endpoint: string): Promise<any> {
    return this.retryPolicy.execute(
      async () => {
        try {
          const response = await axios.get(endpoint, {
            timeout: 5000,
          });
          return response.data;
        } catch (error) {
          if (axios.isAxiosError(error)) {
            throw new NetworkError(
              `Failed to fetch data from ${endpoint}`,
              { endpoint, error: error.message }
            );
          }
          throw error;
        }
      },
      `fetch-${endpoint}`
    );
  }
}
```

### الاتصال بقاعدة البيانات

```typescript
import { RetryPolicy } from './services/RetryPolicy';
import { Pool } from 'pg';

class DatabaseService {
  private pool: Pool;
  private retryPolicy: RetryPolicy;

  constructor(pool: Pool) {
    this.pool = pool;
    this.retryPolicy = new RetryPolicy({
      maxAttempts: 3,
      backoffStrategy: 'LINEAR',
      initialDelay: 1000,
      maxDelay: 5000,
    });
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    return this.retryPolicy.execute(
      async () => {
        const result = await this.pool.query(sql, params);
        return result.rows;
      },
      'database-query'
    );
  }
}
```

### إرسال رسائل التصيد الاحتيالي

```typescript
import { RetryPolicy } from './services/RetryPolicy';
import { ExternalServiceError } from './utils/errors';

class PhishingEngine {
  private retryPolicy: RetryPolicy;

  constructor() {
    // سياسة مخصصة لإرسال رسائل التصيد
    this.retryPolicy = new RetryPolicy({
      maxAttempts: 5,
      backoffStrategy: 'EXPONENTIAL',
      initialDelay: 2000,
      maxDelay: 60000,
    });
  }

  async sendPhishingEmail(
    target: EmailTarget,
    template: EmailTemplate
  ): Promise<void> {
    return this.retryPolicy.execute(
      async () => {
        try {
          await this.emailService.send({
            to: target.email,
            subject: template.subject,
            body: template.body,
            from: template.senderEmail,
          });

          // تسجيل الإرسال الناجح
          await this.logInteraction(target.email, 'EMAIL_SENT');
        } catch (error) {
          throw new ExternalServiceError(
            'Failed to send phishing email',
            'EmailService',
            { target: target.email }
          );
        }
      },
      `send-phishing-${target.email}`
    );
  }
}
```

### فحص الشبكات اللاسلكية

```typescript
import { RetryPolicy } from './services/RetryPolicy';
import { NetworkError } from './utils/errors';

class NetworkAnalyzer {
  private retryPolicy: RetryPolicy;

  constructor() {
    this.retryPolicy = new RetryPolicy({
      maxAttempts: 3,
      backoffStrategy: 'LINEAR',
      initialDelay: 3000,
      maxDelay: 10000,
    });
  }

  async discoverAccessPoints(): Promise<AccessPoint[]> {
    return this.retryPolicy.execute(
      async () => {
        try {
          const result = await this.networkScanner.scan();
          return result.accessPoints;
        } catch (error) {
          throw new NetworkError(
            'Failed to discover access points',
            { error: (error as Error).message }
          );
        }
      },
      'discover-access-points'
    );
  }

  async captureHandshake(
    ssid: string,
    bssid: string
  ): Promise<HandshakeData> {
    return this.retryPolicy.execute(
      async () => {
        try {
          return await this.networkTester.captureHandshake(ssid, bssid);
        } catch (error) {
          throw new NetworkError(
            'Failed to capture WPA handshake',
            { ssid, bssid }
          );
        }
      },
      `capture-handshake-${ssid}`
    );
  }
}
```

## استراتيجيات التأخير (Backoff Strategies)

### 1. التأخير الخطي (Linear Backoff)

يزيد وقت الانتظار بشكل خطي مع كل محاولة:

```typescript
const policy = new RetryPolicy({
  backoffStrategy: 'LINEAR',
  initialDelay: 1000, // 1 ثانية
});

// المحاولة 1: فشل -> انتظار 1 ثانية
// المحاولة 2: فشل -> انتظار 2 ثانية
// المحاولة 3: فشل -> انتظار 3 ثانية
```

**متى تستخدمه:**
- عند التعامل مع خدمات مستقرة نسبياً
- عندما تكون المشكلة مؤقتة وقصيرة الأمد

### 2. التأخير الأسي (Exponential Backoff)

يزيد وقت الانتظار بشكل أسي مع كل محاولة:

```typescript
const policy = new RetryPolicy({
  backoffStrategy: 'EXPONENTIAL',
  initialDelay: 1000, // 1 ثانية
});

// المحاولة 1: فشل -> انتظار 1 ثانية
// المحاولة 2: فشل -> انتظار 2 ثانية
// المحاولة 3: فشل -> انتظار 4 ثانية
// المحاولة 4: فشل -> انتظار 8 ثانية
```

**متى تستخدمه:**
- عند التعامل مع خدمات خارجية قد تكون محملة
- لتجنب إغراق الخدمة بالطلبات
- عندما تكون المشكلة قد تستغرق وقتاً للحل

## الأخطاء القابلة لإعادة المحاولة

السياسة تعيد المحاولة تلقائياً للأخطاء التالية:

### أخطاء مخصصة
- `ExternalServiceError`
- `NetworkError`

### أخطاء الشبكة الشائعة
- `ECONNREFUSED` - رفض الاتصال
- `ECONNRESET` - إعادة تعيين الاتصال
- `ETIMEDOUT` - انتهاء المهلة
- `ENOTFOUND` - لم يتم العثور على المضيف
- `ENETUNREACH` - الشبكة غير قابلة للوصول
- `EAI_AGAIN` - خطأ DNS مؤقت
- `socket hang up` - انقطاع الاتصال

### أخطاء لا تعاد محاولتها
- أخطاء المصادقة (`AuthenticationError`)
- أخطاء التفويض (`AuthorizationError`)
- أخطاء التحقق (`ValidationError`)
- أخطاء منطق الأعمال

## الإعدادات المتقدمة

### تحديث الإعدادات ديناميكياً

```typescript
const policy = new RetryPolicy();

// تحديث الإعدادات بناءً على الظروف
if (isHighTrafficPeriod()) {
  policy.updateConfig({
    maxAttempts: 5,
    initialDelay: 2000,
  });
}

const result = await policy.execute(operation);
```

### الحصول على الإعدادات الحالية

```typescript
const policy = new RetryPolicy();
const config = policy.getConfig();

console.log(`Max attempts: ${config.maxAttempts}`);
console.log(`Backoff strategy: ${config.backoffStrategy}`);
```

### إنشاء سياسات متعددة

```typescript
// سياسة للعمليات السريعة
const fastPolicy = new RetryPolicy({
  maxAttempts: 2,
  initialDelay: 500,
  maxDelay: 2000,
});

// سياسة للعمليات البطيئة
const slowPolicy = new RetryPolicy({
  maxAttempts: 5,
  initialDelay: 5000,
  maxDelay: 60000,
});

// استخدام السياسة المناسبة
const quickResult = await fastPolicy.execute(quickOperation);
const slowResult = await slowPolicy.execute(slowOperation);
```

## أفضل الممارسات

### 1. اختيار عدد المحاولات المناسب

```typescript
// للعمليات الحرجة
const criticalPolicy = new RetryPolicy({
  maxAttempts: 5,
});

// للعمليات غير الحرجة
const nonCriticalPolicy = new RetryPolicy({
  maxAttempts: 2,
});
```

### 2. تسمية العمليات بوضوح

```typescript
// جيد
await policy.execute(operation, 'send-phishing-email-user-123');

// سيء
await policy.execute(operation);
```

### 3. معالجة الأخطاء النهائية

```typescript
try {
  const result = await policy.execute(operation, 'critical-operation');
  return result;
} catch (error) {
  // تسجيل الفشل النهائي
  logger.error('Operation failed after all retries', error);
  
  // إشعار المسؤولين
  await notifyAdministrators(error);
  
  // إرجاع قيمة افتراضية أو رمي خطأ مخصص
  throw new ApplicationError('Operation failed permanently');
}
```

### 4. مراقبة الأداء

```typescript
const startTime = Date.now();

try {
  const result = await policy.execute(operation, 'monitored-operation');
  const duration = Date.now() - startTime;
  
  // تسجيل الأداء
  logger.info('Operation completed', {
    duration,
    operation: 'monitored-operation',
  });
  
  return result;
} catch (error) {
  const duration = Date.now() - startTime;
  
  logger.error('Operation failed', {
    duration,
    operation: 'monitored-operation',
    error,
  });
  
  throw error;
}
```

### 5. تجنب إعادة المحاولة للعمليات غير الآمنة

```typescript
// لا تعيد محاولة العمليات التي قد تسبب تكرار (مثل الدفع)
// استخدم idempotency keys بدلاً من ذلك

class PaymentService {
  async processPayment(
    amount: number,
    idempotencyKey: string
  ): Promise<PaymentResult> {
    // لا تستخدم retry policy هنا
    return await this.paymentGateway.charge(amount, idempotencyKey);
  }
}
```

## الخلاصة

سياسة إعادة المحاولة (`RetryPolicy`) هي أداة قوية لتحسين موثوقية التطبيق عند التعامل مع الخدمات الخارجية والشبكات غير المستقرة. استخدمها بحكمة مع مراعاة طبيعة العملية والأخطاء المتوقعة.
