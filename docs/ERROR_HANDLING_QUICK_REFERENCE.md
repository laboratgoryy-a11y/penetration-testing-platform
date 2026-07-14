# دليل مرجعي سريع: معالجة الأخطاء

## رمي الأخطاء

### أخطاء التفويض
```typescript
throw new AuthorizationError('غير مصرح بهذه العملية', authorizationId);
```

### أخطاء التحقق
```typescript
throw new ValidationError('البريد الإلكتروني مطلوب', 'email', inputValue);
```

### أخطاء تجاوز النطاق
```typescript
throw new ScopeViolationError('الهدف خارج النطاق', target, scope);
```

### أخطاء انتهاء الصلاحية
```typescript
throw new ExpiredAuthorizationError('انتهت الصلاحية', authId, expiredDate);
```

### أخطاء الخدمات الخارجية
```typescript
throw new ExternalServiceError('فشل الاتصال', 'EmailService');
```

### أخطاء الشبكة
```typescript
throw new NetworkError('انقطع الاتصال');
```

## معالجة الأخطاء

### في API Routes
```typescript
app.post('/api/scan', async (req, res) => {
  try {
    const result = await webScanner.startScan(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    const errorResponse = await errorHandler.handleError(
      error as Error,
      req.id
    );
    res.status(error.statusCode || 500).json(errorResponse);
  }
});
```

### في Services
```typescript
class MyService {
  async doSomething() {
    try {
      // العملية
    } catch (error) {
      await errorHandler.logError(error as Error);
      throw error;
    }
  }
}
```

## إعادة المحاولة

### استخدام بسيط
```typescript
import { withRetry } from './services/RetryPolicy';

const result = await withRetry(
  async () => await externalService.call(),
  'operation-name'
);
```

### استخدام متقدم
```typescript
import { RetryPolicy } from './services/RetryPolicy';

const policy = new RetryPolicy({
  maxAttempts: 5,
  backoffStrategy: 'EXPONENTIAL',
  initialDelay: 1000,
  maxDelay: 30000,
});

const result = await policy.execute(
  async () => await externalService.call(),
  'operation-name'
);
```

## رموز الحالة

| الخطأ | الرمز |
|------|------|
| ValidationError | 400 |
| AuthenticationError | 401 |
| AuthorizationError | 403 |
| ScopeViolationError | 403 |
| ExpiredAuthorizationError | 403 |
| NotFoundError | 404 |
| ConflictError | 409 |
| ApplicationError | 500 |
| DatabaseError | 500 |
| ExternalServiceError | 503 |
| NetworkError | 503 |

## مستويات الخطورة

- **INFO**: معلومات عامة
- **WARNING**: تحذير يحتاج انتباه
- **ERROR**: خطأ يؤثر على العملية
- **CRITICAL**: خطأ حرج يحتاج تدخل فوري

## فئات الأخطاء

- **AUTHENTICATION**: أخطاء المصادقة
- **AUTHORIZATION**: أخطاء التفويض
- **VALIDATION**: أخطاء التحقق
- **BUSINESS_LOGIC**: أخطاء منطق الأعمال
- **EXTERNAL_SERVICE**: أخطاء الخدمات الخارجية
- **DATABASE**: أخطاء قاعدة البيانات
- **NETWORK**: أخطاء الشبكة
- **SYSTEM**: أخطاء النظام
