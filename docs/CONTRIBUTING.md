# دليل المساهمة - منصة اختبار الاختراق

## مرحباً بك!

شكراً لاهتمامك بالمساهمة في منصة اختبار الاختراق والأمن الهجومي! هذا الدليل سيساعدك على البدء.

## ⚠️ تنبيه مهم

هذا المشروع يتعامل مع أدوات اختبار اختراق حساسة. جميع المساهمات يجب أن:
- تلتزم بالمعايير القانونية والأخلاقية
- تضمن الاستخدام المسؤول للأدوات
- تحافظ على الأمان والخصوصية

## كيفية المساهمة

### 1. إعداد بيئة التطوير

```bash
# استنساخ المستودع
git clone https://github.com/your-org/penetration-testing-platform.git
cd penetration-testing-platform

# تثبيت التبعيات
npm install

# نسخ ملف البيئة
cp .env.example .env

# إعداد قاعدة البيانات
npm run db:setup

# تشغيل الاختبارات
npm test

# تشغيل المنصة
npm run dev
```

### 2. إنشاء فرع جديد

```bash
# إنشاء فرع للميزة الجديدة
git checkout -b feature/your-feature-name

# إنشاء فرع لإصلاح خطأ
git checkout -b fix/bug-description
```

### 3. كتابة الكود

#### معايير الكود

**TypeScript:**
```typescript
// ✅ جيد
export class WebScanner {
  constructor(
    private authManager: AuthorizationManager,
    private crawler: Crawler
  ) {}

  async startScan(target: WebTarget): Promise<ScanSession> {
    // Implementation
  }
}

// ❌ سيء
export class webscanner {
  constructor(authManager, crawler) {
    this.authManager = authManager;
    this.crawler = crawler;
  }
}
```

**التسمية:**
- Classes: PascalCase (`WebScanner`)
- Functions/Methods: camelCase (`startScan`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- Files: kebab-case (`web-scanner.ts`)

**التعليقات:**
```typescript
/**
 * يبدأ عملية فحص جديدة لتطبيق ويب
 * 
 * @param userId - معرف المستخدم
 * @param target - الهدف المراد فحصه
 * @param config - إعدادات الفحص
 * @returns جلسة الفحص
 * @throws {AuthorizationError} إذا لم يكن هناك تصريح صالح
 */
async startScan(
  userId: string,
  target: WebTarget,
  config: ScanConfiguration
): Promise<ScanSession> {
  // Implementation
}
```

### 4. كتابة الاختبارات

**اختبارات الوحدة:**
```typescript
describe('WebScanner', () => {
  let scanner: WebScanner;
  let mockAuthManager: jest.Mocked<AuthorizationManager>;

  beforeEach(() => {
    mockAuthManager = createMockAuthManager();
    scanner = new WebScanner(mockAuthManager, mockCrawler);
  });

  it('should start scan with valid authorization', async () => {
    mockAuthManager.validateAuthorization.mockResolvedValue({
      authorized: true,
      authorizationId: 'auth-123'
    });

    const session = await scanner.startScan(userId, target, config);

    expect(session.status).toBe('RUNNING');
    expect(mockAuthManager.validateAuthorization).toHaveBeenCalledWith(
      userId,
      target,
      'WEB_SCAN'
    );
  });

  it('should reject scan without authorization', async () => {
    mockAuthManager.validateAuthorization.mockResolvedValue({
      authorized: false,
      reason: 'No valid authorization'
    });

    await expect(
      scanner.startScan(userId, target, config)
    ).rejects.toThrow(AuthorizationError);
  });
});
```

**اختبارات الخصائص (Property-Based Tests):**
```typescript
import fc from 'fast-check';

describe('EncryptionService', () => {
  it('should decrypt what it encrypts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }),
        async (plaintext) => {
          const encrypted = await encryptionService.encrypt(plaintext, key);
          const decrypted = await encryptionService.decrypt(encrypted, key);
          expect(decrypted).toBe(plaintext);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 5. تشغيل الاختبارات

```bash
# جميع الاختبارات
npm test

# اختبارات محددة
npm test -- web-scanner.test.ts

# اختبارات مع التغطية
npm run test:coverage

# اختبارات الخصائص
npm run test:pbt
```

### 6. التحقق من جودة الكود

```bash
# Linting
npm run lint

# إصلاح مشاكل Linting تلقائياً
npm run lint:fix

# Type checking
npm run type-check

# Formatting
npm run format
```

### 7. إنشاء Pull Request

```bash
# Commit التغييرات
git add .
git commit -m "feat: add SQL injection detection"

# Push للفرع
git push origin feature/your-feature-name
```

**رسالة Commit:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**أنواع Commit:**
- `feat`: ميزة جديدة
- `fix`: إصلاح خطأ
- `docs`: تحديث الوثائق
- `style`: تنسيق الكود
- `refactor`: إعادة هيكلة الكود
- `test`: إضافة اختبارات
- `chore`: مهام صيانة

**أمثلة:**
```
feat(scanner): add XSS detection

Implement Cross-Site Scripting vulnerability detection
with support for reflected and stored XSS.

Closes #123
```

```
fix(auth): prevent session fixation

Add session regeneration after login to prevent
session fixation attacks.

Fixes #456
```

## إرشادات المساهمة

### الأمان

```
✅ افعل:
- استخدم Prepared Statements لقواعد البيانات
- شفر البيانات الحساسة
- تحقق من جميع المدخلات
- استخدم HTTPS
- طبق مبدأ الصلاحيات الأدنى

❌ لا تفعل:
- تحفظ كلمات مرور بنص واضح
- تبني استعلامات SQL ديناميكياً
- تثق بمدخلات المستخدم
- تكشف معلومات حساسة في الأخطاء
- تتجاهل تحذيرات الأمان
```

### الأداء

```
✅ افعل:
- استخدم التخزين المؤقت عند الإمكان
- قم بتحسين استعلامات قاعدة البيانات
- استخدم العمليات غير المتزامنة
- طبق Rate Limiting
- راقب استخدام الذاكرة

❌ لا تفعل:
- تنفذ عمليات متزامنة ثقيلة
- تحمل بيانات كبيرة في الذاكرة
- تتجاهل تحسين الأداء
- تنسى إغلاق الاتصالات
```

### الاختبار

```
✅ افعل:
- اكتب اختبارات لكل ميزة جديدة
- اختبر حالات الحافة
- استخدم اختبارات الخصائص للمنطق الحرج
- حافظ على تغطية عالية (>80%)
- اختبر معالجة الأخطاء

❌ لا تفعل:
- تتخطى كتابة الاختبارات
- تكتب اختبارات هشة
- تستخدم بيانات حقيقية في الاختبارات
- تتجاهل الاختبارات الفاشلة
```

### التوثيق

```
✅ افعل:
- وثق جميع الواجهات العامة
- أضف أمثلة للاستخدام
- حدّث الوثائق مع التغييرات
- استخدم تعليقات واضحة
- وثق القرارات المعمارية

❌ لا تفعل:
- تترك كود بدون توثيق
- تكتب تعليقات مضللة
- تنسى تحديث الوثائق
- تستخدم تعليقات غامضة
```

## عملية المراجعة

### ما نبحث عنه

1. **الوظيفة:**
   - هل الكود يعمل كما هو متوقع؟
   - هل يحل المشكلة المطلوبة؟

2. **الأمان:**
   - هل هناك ثغرات أمنية؟
   - هل البيانات الحساسة محمية؟

3. **الجودة:**
   - هل الكود واضح وقابل للصيانة؟
   - هل يتبع معايير المشروع؟

4. **الاختبارات:**
   - هل هناك اختبارات كافية؟
   - هل الاختبارات تغطي الحالات المهمة؟

5. **الأداء:**
   - هل هناك مشاكل أداء محتملة؟
   - هل الكود محسّن؟

### الحصول على موافقة

يحتاج Pull Request إلى:
- ✅ موافقة من مراجع واحد على الأقل
- ✅ نجاح جميع الاختبارات
- ✅ عدم وجود تعارضات
- ✅ تغطية اختبارات كافية

## أنواع المساهمات

### 1. إصلاح الأخطاء

```
1. ابحث عن الخطأ في Issues
2. أنشئ فرع fix/
3. أصلح الخطأ
4. أضف اختبار للتحقق من الإصلاح
5. أنشئ Pull Request
```

### 2. ميزات جديدة

```
1. ناقش الميزة في Issue أولاً
2. انتظر الموافقة
3. أنشئ فرع feature/
4. نفذ الميزة
5. أضف اختبارات شاملة
6. حدّث الوثائق
7. أنشئ Pull Request
```

### 3. تحسين الوثائق

```
1. حدد الوثائق التي تحتاج تحسين
2. أنشئ فرع docs/
3. حسّن الوثائق
4. أنشئ Pull Request
```

### 4. تحسين الأداء

```
1. حدد مشكلة الأداء
2. قس الأداء الحالي
3. نفذ التحسين
4. قس الأداء الجديد
5. أضف اختبارات الأداء
6. أنشئ Pull Request مع النتائج
```

## الحصول على المساعدة

### القنوات

- **GitHub Issues:** للأخطاء والميزات
- **GitHub Discussions:** للأسئلة والنقاشات
- **Email:** support@example.com

### الأسئلة الشائعة

**س: كيف أبدأ المساهمة؟**
ج: ابدأ بالأخطاء المصنفة "good first issue"

**س: كم يستغرق مراجعة Pull Request؟**
ج: عادة 2-5 أيام عمل

**س: هل يمكنني العمل على ميزة كبيرة؟**
ج: نعم، لكن ناقشها في Issue أولاً

**س: ماذا لو رُفض Pull Request؟**
ج: لا تقلق! سنشرح السبب ونساعدك على تحسينه

## قواعد السلوك

### توقعاتنا

✅ **افعل:**
- كن محترماً ومهذباً
- قدم نقداً بناءً
- ساعد الآخرين
- احترم وجهات النظر المختلفة

❌ **لا تفعل:**
- تستخدم لغة مسيئة
- تهاجم الآخرين شخصياً
- تنشر معلومات خاصة
- تتصرف بشكل غير مهني

### الإبلاغ عن المشاكل

إذا واجهت سلوكاً غير لائق:
1. راسل conduct@example.com
2. قدم تفاصيل الحادثة
3. سنراجع ونتخذ الإجراء المناسب

## الترخيص

بالمساهمة في هذا المشروع، توافق على أن مساهماتك ستكون مرخصة تحت نفس ترخيص المشروع.

## الشكر

شكراً لمساهمتك في جعل الإنترنت مكاناً أكثر أماناً! 🎉

---

**للمزيد من المعلومات:**
- [دليل البنية المعمارية](./DEVELOPER_GUIDE_ARCHITECTURE.md)
- [وثائق API](./API_DOCUMENTATION.md)
- [دليل البدء السريع](./USER_GUIDE_QUICK_START.md)
