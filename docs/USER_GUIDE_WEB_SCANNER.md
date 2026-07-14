# دليل استخدام ماسح ثغرات تطبيقات الويب

## نظرة عامة

ماسح ثغرات تطبيقات الويب هو أداة متقدمة لاكتشاف الثغرات الأمنية في تطبيقات الويب. يدعم الماسح اكتشاف مجموعة واسعة من الثغرات الشائعة ويوفر تقارير مفصلة مع توصيات الإصلاح.

## ⚠️ تحذير قانوني

**يجب الحصول على تصريح كتابي صريح قبل فحص أي تطبيق ويب.** الفحص بدون تصريح يعتبر غير قانوني.

## أنواع الثغرات المدعومة

### 1. SQL Injection
حقن أوامر SQL في المدخلات للوصول غير المصرح به لقاعدة البيانات.

**الخطورة:** حرجة
**التأثير:** سرقة البيانات، تعديل البيانات، حذف البيانات

### 2. Cross-Site Scripting (XSS)
حقن سكريبتات ضارة في صفحات الويب.

**الخطورة:** عالية
**التأثير:** سرقة الجلسات، تشويه المحتوى، هجمات التصيد

### 3. Cross-Site Request Forgery (CSRF)
إجبار المستخدمين على تنفيذ إجراءات غير مرغوبة.

**الخطورة:** متوسطة
**التأثير:** تنفيذ إجراءات غير مصرح بها

### 4. Directory Traversal
الوصول إلى ملفات خارج الدليل المخصص.

**الخطورة:** عالية
**التأثير:** قراءة ملفات حساسة، كشف معلومات النظام

### 5. Command Injection
حقن أوامر نظام التشغيل.

**الخطورة:** حرجة
**التأثير:** السيطرة الكاملة على الخادم

### 6. XML External Entity (XXE)
استغلال معالجات XML لقراءة ملفات أو تنفيذ طلبات.

**الخطورة:** عالية
**التأثير:** قراءة ملفات، هجمات SSRF

### 7. Server-Side Request Forgery (SSRF)
إجبار الخادم على إجراء طلبات غير مصرح بها.

**الخطورة:** عالية
**التأثير:** الوصول لخدمات داخلية، تجاوز جدران الحماية

## بدء فحص جديد

### الطريقة 1: واجهة الويب

#### الخطوة 1: الوصول إلى صفحة الفحص

1. سجل الدخول إلى المنصة
2. انتقل إلى **الفحص** > **فحص جديد**

#### الخطوة 2: إعداد الهدف

```
عنوان URL: https://example.com
التصريح: اختر من القائمة
الوصف (اختياري): فحص أمني ربع سنوي
```

**ملاحظات مهمة:**
- يجب أن يكون URL كاملاً (يبدأ بـ http:// أو https://)
- تأكد من أن الهدف ضمن نطاق التصريح
- استخدم HTTPS عندما يكون متاحاً

#### الخطوة 3: اختيار أنواع الثغرات

حدد الثغرات المراد اختبارها:

```
☑ SQL Injection
☑ Cross-Site Scripting (XSS)
☑ CSRF
☑ Directory Traversal
☑ Command Injection
☑ XXE
☑ SSRF
```

**نصيحة:** ابدأ بفحص شامل، ثم قم بفحوصات مستهدفة لاحقاً.

#### الخطوة 4: تكوين الإعدادات

##### إعدادات الزحف (Crawling)

```
العمق الأقصى: 3
  - المستوى 1: الصفحة الرئيسية
  - المستوى 2: الصفحات المرتبطة مباشرة
  - المستوى 3: الصفحات المرتبطة من المستوى 2

الطلبات القصوى: 1000
  - حد أقصى لعدد الطلبات لتجنب الحمل الزائد

احترام robots.txt: ☑ نعم
  - يُنصح بشدة بتفعيل هذا الخيار
```

##### إعدادات المصادقة (اختياري)

إذا كان التطبيق يتطلب مصادقة:

```
نوع المصادقة: 
  ○ Basic Auth
  ○ Form-based
  ● Cookie-based
  ○ OAuth 2.0

ملف تعريف الارتباط (Cookie):
session_id=abc123xyz789
```

##### رؤوس مخصصة (اختياري)

أضف رؤوس HTTP مخصصة:

```
User-Agent: PenTest-Scanner/1.0
X-API-Key: your-api-key-here
Authorization: Bearer token123
```

#### الخطوة 5: بدء الفحص

راجع جميع الإعدادات ثم اضغط على **بدء الفحص**.

### الطريقة 2: واجهة سطر الأوامر (CLI)

#### فحص أساسي

```bash
npm run cli scan \
  --url https://example.com \
  --auth-id AUTH-2024-001 \
  --types sql,xss,csrf
```

#### فحص متقدم

```bash
npm run cli scan \
  --url https://example.com \
  --auth-id AUTH-2024-001 \
  --types all \
  --max-depth 5 \
  --max-requests 2000 \
  --respect-robots true \
  --headers "User-Agent: Custom Scanner" \
  --output json
```

#### معاملات CLI

```
--url              عنوان URL المستهدف (مطلوب)
--auth-id          معرف التصريح (مطلوب)
--types            أنواع الثغرات (sql,xss,csrf,traversal,command,xxe,ssrf,all)
--max-depth        العمق الأقصى للزحف (افتراضي: 3)
--max-requests     الطلبات القصوى (افتراضي: 1000)
--respect-robots   احترام robots.txt (true/false، افتراضي: true)
--headers          رؤوس HTTP مخصصة
--cookies          ملفات تعريف الارتباط
--output           تنسيق الإخراج (json/table، افتراضي: table)
```

### الطريقة 3: واجهة برمجة التطبيقات (API)

```bash
POST /api/v1/scans/web
Content-Type: application/json
Authorization: Bearer <your-token>

{
  "target": {
    "url": "https://example.com",
    "authorizationId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "config": {
    "vulnerabilityTypes": [
      "SQL_INJECTION",
      "XSS",
      "CSRF",
      "DIRECTORY_TRAVERSAL",
      "COMMAND_INJECTION"
    ],
    "maxDepth": 3,
    "maxRequests": 1000,
    "respectRobotsTxt": true,
    "customHeaders": {
      "User-Agent": "PenTest-Scanner/1.0"
    }
  }
}
```

**الاستجابة:**

```json
{
  "sessionId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "RUNNING",
  "startedAt": "2024-01-15T10:30:00Z",
  "estimatedCompletion": "2024-01-15T11:00:00Z"
}
```

## مراقبة الفحص

### عرض حالة الفحص

#### واجهة الويب

1. انتقل إلى **الفحص** > **السجل**
2. اضغط على الفحص لعرض التفاصيل

**المعلومات المعروضة:**
```
الحالة: قيد التنفيذ
التقدم: 45% (450/1000 طلب)
الوقت المنقضي: 15 دقيقة
الوقت المتبقي المقدر: 18 دقيقة
الثغرات المكتشفة: 7
  - حرجة: 2
  - عالية: 3
  - متوسطة: 2
  - منخفضة: 0
```

#### CLI

```bash
# عرض حالة الفحص
npm run cli scan:status --session-id <session-id>

# مراقبة مستمرة (تحديث كل 5 ثوانٍ)
npm run cli scan:watch --session-id <session-id>
```

#### API

```bash
GET /api/v1/scans/web/:sessionId/status
Authorization: Bearer <your-token>
```

**الاستجابة:**

```json
{
  "sessionId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "RUNNING",
  "progress": {
    "percentage": 45,
    "requestsSent": 450,
    "totalRequests": 1000
  },
  "vulnerabilitiesFound": {
    "critical": 2,
    "high": 3,
    "medium": 2,
    "low": 0
  },
  "elapsedTime": "15m",
  "estimatedTimeRemaining": "18m"
}
```

### إيقاف الفحص

إذا احتجت لإيقاف الفحص:

#### واجهة الويب
1. افتح تفاصيل الفحص
2. اضغط على **إيقاف الفحص**
3. أكد الإيقاف

#### CLI
```bash
npm run cli scan:stop --session-id <session-id>
```

#### API
```bash
POST /api/v1/scans/web/:sessionId/stop
Authorization: Bearer <your-token>
```

**ملاحظة:** سيتم حفظ النتائج المكتشفة حتى نقطة الإيقاف.

## عرض النتائج

### قائمة الثغرات

بعد اكتمال الفحص، يمكنك عرض الثغرات المكتشفة:

#### واجهة الويب

انتقل إلى **الفحص** > **السجل** > اختر الفحص > **النتائج**

**عرض الثغرات:**

```
┌─────────────────────────────────────────────────────────────┐
│ SQL Injection - حرج                                         │
├─────────────────────────────────────────────────────────────┤
│ الموقع: /api/users?id=1                                     │
│ المعامل: id                                                 │
│ الحمولة: 1' OR '1'='1                                       │
│ الدليل: تم إرجاع جميع السجلات                              │
│ CVSS: 9.8                                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Cross-Site Scripting (XSS) - عالي                           │
├─────────────────────────────────────────────────────────────┤
│ الموقع: /search?q=test                                      │
│ المعامل: q                                                  │
│ الحمولة: <script>alert('XSS')</script>                      │
│ الدليل: تم تنفيذ السكريبت في الاستجابة                     │
│ CVSS: 7.3                                                   │
└─────────────────────────────────────────────────────────────┘
```

#### CLI

```bash
# عرض جميع الثغرات
npm run cli scan:results --session-id <session-id>

# تصفية حسب الخطورة
npm run cli scan:results --session-id <session-id> --severity critical

# تصفية حسب النوع
npm run cli scan:results --session-id <session-id> --type sql

# تصدير النتائج
npm run cli scan:results --session-id <session-id> --export json > results.json
```

#### API

```bash
GET /api/v1/scans/web/:sessionId/results
Authorization: Bearer <your-token>
```

### تفاصيل الثغرة

لكل ثغرة، يمكنك عرض:

#### 1. المعلومات الأساسية
```
النوع: SQL Injection
الخطورة: حرجة
CVSS Score: 9.8
CWE: CWE-89
```

#### 2. الموقع والسياق
```
URL: https://example.com/api/users
المعامل: id
الطريقة: GET
الموقع: Query Parameter
```

#### 3. الدليل
```
الطلب:
GET /api/users?id=1' OR '1'='1 HTTP/1.1
Host: example.com

الاستجابة:
HTTP/1.1 200 OK
Content-Type: application/json

[
  {"id": 1, "username": "admin", "email": "admin@example.com"},
  {"id": 2, "username": "user1", "email": "user1@example.com"},
  ...
]
```

#### 4. خطوات إعادة الإنتاج
```
1. افتح المتصفح وانتقل إلى: https://example.com/api/users
2. أضف المعامل: ?id=1' OR '1'='1
3. لاحظ إرجاع جميع السجلات بدلاً من سجل واحد
```

#### 5. التأثير
```
- الوصول غير المصرح به لجميع بيانات المستخدمين
- إمكانية تعديل أو حذف البيانات
- إمكانية تنفيذ أوامر على قاعدة البيانات
- خطر سرقة بيانات حساسة
```

#### 6. توصيات الإصلاح
```
1. استخدم Prepared Statements أو Parameterized Queries
2. لا تبني استعلامات SQL ديناميكياً من مدخلات المستخدم
3. استخدم ORM مع معاملات آمنة
4. طبق التحقق من صحة المدخلات
5. استخدم مبدأ الصلاحيات الأدنى لحساب قاعدة البيانات

مثال على الكود الآمن (Node.js):
```javascript
// ❌ غير آمن
const query = `SELECT * FROM users WHERE id = ${req.query.id}`;

// ✅ آمن
const query = 'SELECT * FROM users WHERE id = $1';
const result = await db.query(query, [req.query.id]);
```
```

#### 7. المراجع
```
- OWASP Top 10: A03:2021 – Injection
- CWE-89: SQL Injection
- CVSS Calculator: https://nvd.nist.gov/vuln-metrics/cvss/v3-calculator
```

## توليد التقارير

### أنواع التقارير

#### 1. تقرير فني مفصل
يحتوي على جميع التفاصيل الفنية للثغرات.

**مناسب لـ:** فرق التطوير والأمن

#### 2. ملخص تنفيذي
نظرة عامة عالية المستوى مع الإحصائيات.

**مناسب لـ:** الإدارة وصناع القرار

#### 3. تقرير الامتثال
يركز على معايير الامتثال (PCI DSS، ISO 27001، إلخ).

**مناسب لـ:** المدققين والجهات التنظيمية

### توليد تقرير

#### واجهة الويب

1. افتح نتائج الفحص
2. اضغط على **توليد تقرير**
3. اختر نوع التقرير
4. اختر التنسيق (PDF/HTML/JSON/CSV)
5. حدد الأقسام المراد تضمينها
6. اضغط على **توليد وتنزيل**

#### CLI

```bash
# تقرير PDF
npm run cli report:generate \
  --session-id <session-id> \
  --type technical \
  --format pdf \
  --output report.pdf

# تقرير HTML
npm run cli report:generate \
  --session-id <session-id> \
  --type executive \
  --format html \
  --output report.html

# تقرير JSON
npm run cli report:generate \
  --session-id <session-id> \
  --type compliance \
  --format json \
  --output report.json
```

#### API

```bash
GET /api/v1/scans/web/:sessionId/report?format=pdf&type=technical
Authorization: Bearer <your-token>
```

### محتوى التقرير

#### الملخص التنفيذي
```
- نظرة عامة على الفحص
- الإحصائيات الرئيسية
- أهم الثغرات
- التوصيات العامة
- مستوى المخاطر الإجمالي
```

#### التفاصيل الفنية
```
- قائمة كاملة بالثغرات
- تفاصيل كل ثغرة
- خطوات إعادة الإنتاج
- الأدلة (لقطات شاشة، طلبات/استجابات)
- توصيات الإصلاح المفصلة
```

#### الإحصائيات والرسوم البيانية
```
- توزيع الثغرات حسب الخطورة
- توزيع الثغرات حسب النوع
- الصفحات الأكثر عرضة للثغرات
- خط زمني للاكتشافات
```

#### الملاحق
```
- منهجية الفحص
- الأدوات المستخدمة
- نطاق العمل
- معلومات التصريح
- المراجع والموارد
```

## الإعدادات المتقدمة

### تخصيص الحمولات (Payloads)

يمكنك إضافة حمولات مخصصة للاختبار:

```javascript
// ملف: custom-payloads.json
{
  "sql_injection": [
    "' OR '1'='1",
    "1' UNION SELECT NULL--",
    "admin'--"
  ],
  "xss": [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "javascript:alert('XSS')"
  ]
}
```

**استخدام الحمولات المخصصة:**

```bash
npm run cli scan \
  --url https://example.com \
  --auth-id AUTH-2024-001 \
  --payloads custom-payloads.json
```

### استبعاد مسارات

استبعد مسارات معينة من الفحص:

```javascript
// ملف: exclusions.json
{
  "paths": [
    "/admin/logout",
    "/api/delete/*",
    "/payment/process"
  ],
  "parameters": [
    "csrf_token",
    "session_id"
  ]
}
```

**استخدام الاستبعادات:**

```bash
npm run cli scan \
  --url https://example.com \
  --auth-id AUTH-2024-001 \
  --exclude exclusions.json
```

### التحكم في معدل الطلبات

لتجنب إرهاق الخادم:

```javascript
{
  "rateLimit": {
    "requestsPerSecond": 10,
    "delayBetweenRequests": 100,
    "maxConcurrentRequests": 5
  }
}
```

### إعادة المحاولة التلقائية

للتعامل مع الأخطاء المؤقتة:

```javascript
{
  "retry": {
    "maxAttempts": 3,
    "backoffMultiplier": 2,
    "initialDelay": 1000
  }
}
```

## أفضل الممارسات

### 1. التخطيط للفحص

```
✅ افعل:
- حدد نطاق الفحص بوضوح
- أبلغ فريق التطوير قبل الفحص
- اختر وقتاً مناسباً (خارج ساعات الذروة)
- احتفظ بنسخة احتياطية قبل الفحص

❌ لا تفعل:
- تفحص بيئة الإنتاج دون تنسيق
- تفحص خلال ساعات الذروة
- تستخدم حمولات عدوانية جداً
- تتجاهل تحذيرات النظام
```

### 2. أثناء الفحص

```
✅ افعل:
- راقب حالة الخادم
- راقب السجلات للأخطاء
- أوقف الفحص إذا ظهرت مشاكل
- احترم robots.txt

❌ لا تفعل:
- تترك الفحص دون مراقبة
- تتجاهل رسائل الخطأ
- تستمر إذا كان الخادم يتباطأ
- تتجاوز حدود المعدل
```

### 3. بعد الفحص

```
✅ افعل:
- راجع جميع النتائج بعناية
- تحقق من الإيجابيات الكاذبة
- صنف الثغرات حسب الأولوية
- شارك النتائج مع الفريق المناسب
- تابع الإصلاحات

❌ لا تفعل:
- تفترض أن جميع النتائج صحيحة
- تشارك النتائج مع أطراف غير مصرح لها
- تتجاهل الثغرات "المنخفضة"
- تنسى التحقق من الإصلاحات
```

### 4. الأمان والخصوصية

```
✅ افعل:
- احفظ النتائج في مكان آمن
- شفر التقارير الحساسة
- احذف البيانات القديمة
- استخدم قنوات اتصال آمنة

❌ لا تفعل:
- تحفظ النتائج في أماكن غير آمنة
- ترسل التقارير عبر بريد غير مشفر
- تحتفظ بالبيانات أطول من اللازم
- تشارك بيانات الاعتماد المكتشفة
```

## استكشاف الأخطاء

### "فشل الاتصال بالهدف"

**الأسباب:**
- الهدف غير متاح
- مشاكل في الشبكة
- جدار حماية يحظر الطلبات

**الحلول:**
```bash
# التحقق من إمكانية الوصول
curl -I https://example.com

# التحقق من DNS
nslookup example.com

# التحقق من الاتصال
ping example.com
```

### "تم حظر عنوان IP"

**الأسباب:**
- WAF اكتشف نشاط الفحص
- تجاوز حدود المعدل
- عنوان IP في القائمة السوداء

**الحلول:**
```bash
# تقليل معدل الطلبات
npm run cli scan \
  --url https://example.com \
  --auth-id AUTH-2024-001 \
  --rate-limit 5

# استخدام User-Agent مخصص
npm run cli scan \
  --url https://example.com \
  --auth-id AUTH-2024-001 \
  --headers "User-Agent: Mozilla/5.0"
```

### "إيجابيات كاذبة كثيرة"

**الحلول:**
1. راجع النتائج يدوياً
2. تحقق من الأدلة
3. أعد الاختبار يدوياً
4. اضبط حساسية الماسح

```bash
# تقليل الإيجابيات الكاذبة
npm run cli scan \
  --url https://example.com \
  --auth-id AUTH-2024-001 \
  --confidence high
```

## الخلاصة

ماسح ثغرات تطبيقات الويب هو أداة قوية لاكتشاف الثغرات الأمنية. تذكر دائماً:

1. ✅ احصل على تصريح قبل الفحص
2. ✅ خطط للفحص بعناية
3. ✅ راقب الفحص باستمرار
4. ✅ راجع النتائج بدقة
5. ✅ تابع الإصلاحات

**الفحص المسؤول يحمي الجميع!**

---

**للمزيد من المعلومات:**
- [دليل البدء السريع](./USER_GUIDE_QUICK_START.md)
- [دليل إدارة التصاريح](./USER_GUIDE_AUTHORIZATION.md)
- [وثائق API](./API_DOCUMENTATION.md)
