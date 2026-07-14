# دليل اختبار قسم فحص الويب

## التغييرات التي تم إجراؤها

### 1. إصلاح API Client (`public/js/api.js`)
- تم تحديث دالة `createScan` لإرسال البيانات بالصيغة الصحيحة:
  ```javascript
  {
    target: {
      url: "https://example.com",
      authorizationId: "uuid"
    },
    config: {
      maxDepth: 3,
      maxRequests: 100,
      vulnerabilityTypes: ['SQL_INJECTION', 'XSS', 'CSRF', ...],
      respectRobotsTxt: true,
      customHeaders: {}
    }
  }
  ```

### 2. إصلاح Operations Manager (`public/js/operations-manager.js`)
- تم تحديث `handleWebScanSubmit` لتحميل التصاريح النشطة تلقائياً
- تم إرسال البيانات بالصيغة الصحيحة للـ backend

### 3. إصلاح Backend Routes (`src/api/routes/scans.routes.ts`)
- تم إضافة `AuthorizationManager` للـ WebScanner
- تم إصلاح endpoint `/scans/web` لجلب قائمة الفحوصات من قاعدة البيانات
- تم إصلاح endpoint `/scans/web/:id` لجلب تفاصيل الفحص
- تم إضافة endpoint `/scans/web/:id/vulnerabilities` لجلب الثغرات
- تم إصلاح أسماء الأعمدة لتتطابق مع schema قاعدة البيانات

### 4. إصلاح ScanSession Model (`src/models/ScanSession.ts`)
- تم إصلاح دالة `update` لاستخدام placeholders صحيحة (`$1, $2, ...`)

## خطوات الاختبار

### 1. تشغيل الخادم
```bash
npm run dev
```

### 2. تسجيل الدخول
- افتح المتصفح على `http://localhost:3000`
- سجل الدخول بحساب مستخدم

### 3. إنشاء فحص جديد
1. اضغط على زر "بدء عملية جديدة"
2. اختر "فحص الويب"
3. أدخل URL (مثل: `http://testphp.vulnweb.com`)
4. اختر "فحص عميق" إذا أردت
5. اضغط "بدء الفحص"

### 4. مراقبة الفحص
- سيتم توجيهك تلقائياً إلى صفحة "فحص الويب"
- يجب أن ترى بطاقة الفحص مع حالة "قيد التشغيل"
- سيتم تحديث الحالة تلقائياً كل 10 ثوان

### 5. عرض النتائج
- عند اكتمال الفحص، اضغط "عرض التفاصيل"
- يجب أن ترى:
  - معلومات الفحص (URL، الحالة، التاريخ)
  - عدد الثغرات المكتشفة
  - جدول الثغرات مع التفاصيل

### 6. تحميل التقرير
- اضغط "تحميل التقرير" لتحميل تقرير PDF

## ملاحظات مهمة

### التصاريح
- النظام يحاول تلقائياً إيجاد تصريح نشط للمستخدم
- إذا لم يكن هناك تصريح، قد يفشل الفحص
- يمكنك إنشاء تصريح من قسم "التصاريح"

### الفحص الحقيقي
- الفحص الآن يعمل بشكل حقيقي باستخدام:
  - `Crawler`: للزحف إلى الصفحات
  - `VulnerabilityTester`: لاختبار الثغرات
- الفحص يحترم `robots.txt` افتراضياً
- الفحص يتوقف تلقائياً إذا خرج عن النطاق المصرح به

### أنواع الثغرات المدعومة
1. SQL Injection
2. XSS (Cross-Site Scripting)
3. CSRF (Cross-Site Request Forgery)
4. Directory Traversal
5. Command Injection

## استكشاف الأخطاء

### الفحص لا يبدأ
- تحقق من وجود تصريح نشط
- تحقق من صحة URL المدخل
- افتح Console في المتصفح لرؤية الأخطاء

### الفحص يتوقف فوراً
- قد يكون الهدف خارج النطاق المصرح به
- تحقق من سجلات الخادم

### لا تظهر الثغرات
- قد لا يحتوي الموقع على ثغرات
- جرب موقع اختبار مثل: `http://testphp.vulnweb.com`

## مواقع اختبار موصى بها
1. http://testphp.vulnweb.com - موقع اختبار ثغرات PHP
2. http://testaspnet.vulnweb.com - موقع اختبار ثغرات ASP.NET
3. http://testasp.vulnweb.com - موقع اختبار ثغرات ASP

**تحذير**: لا تستخدم هذه الأداة على مواقع حقيقية بدون تصريح كتابي!
