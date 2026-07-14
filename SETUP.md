# دليل الإعداد - منصة اختبار الاختراق

## المتطلبات الأساسية

قبل البدء، تأكد من تثبيت:

1. **Node.js** (الإصدار 18 أو أحدث)
   - تحميل من: https://nodejs.org/
   - تحقق من التثبيت: `node --version`

2. **PostgreSQL** (الإصدار 14 أو أحدث)
   - تحميل من: https://www.postgresql.org/download/
   - تحقق من التثبيت: `psql --version`

3. **Redis** (الإصدار 7 أو أحدث)
   - Windows: https://github.com/microsoftarchive/redis/releases
   - تحقق من التثبيت: `redis-cli --version`

## خطوات الإعداد

### 1. تثبيت الحزم

```bash
npm install
```

### 2. إعداد قاعدة البيانات PostgreSQL

```bash
# إنشاء قاعدة البيانات
createdb penetration_testing_platform

# إنشاء قاعدة بيانات للاختبار
createdb penetration_testing_platform_test
```

### 3. إعداد متغيرات البيئة

```bash
# نسخ ملف المثال
cp .env.example .env

# تحرير الملف وإضافة القيم المناسبة
# استخدم محرر نصوص لتعديل .env
```

**القيم المطلوبة في .env:**

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=penetration_testing_platform
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=generate_a_secure_random_string_here
JWT_EXPIRES_IN=30m

# Encryption
ENCRYPTION_KEY=generate_a_secure_32_byte_key_here
```

### 4. تشغيل الترحيل (Migration)

```bash
npm run db:migrate
```

هذا الأمر سينشئ جميع الجداول والفهارس المطلوبة في قاعدة البيانات.

### 5. تشغيل الاختبارات

```bash
# تشغيل جميع الاختبارات
npm test

# تشغيل الاختبارات مع تغطية الكود
npm run test:coverage
```

### 6. تشغيل التطبيق

```bash
# وضع التطوير (مع إعادة التحميل التلقائي)
npm run dev

# بناء للإنتاج
npm run build

# تشغيل الإنتاج
npm start
```

## التحقق من الإعداد

بعد تشغيل التطبيق، يمكنك التحقق من أنه يعمل بشكل صحيح:

```bash
# فحص صحة التطبيق
curl http://localhost:3000/health

# عرض إخلاء المسؤولية القانونية
curl http://localhost:3000/api/disclaimer
```

## حل المشاكل الشائعة

### مشكلة: فشل الاتصال بقاعدة البيانات

**الحل:**
1. تأكد من تشغيل PostgreSQL: `pg_isready`
2. تحقق من بيانات الاعتماد في ملف `.env`
3. تأكد من وجود قاعدة البيانات: `psql -l`

### مشكلة: فشل الاتصال بـ Redis

**الحل:**
1. تأكد من تشغيل Redis: `redis-cli ping`
2. تحقق من المنفذ في ملف `.env`
3. أعد تشغيل خدمة Redis

### مشكلة: فشل الاختبارات

**الحل:**
1. تأكد من تثبيت جميع الحزم: `npm install`
2. تأكد من إنشاء قاعدة بيانات الاختبار
3. تحقق من متغيرات البيئة

## الخطوات التالية

بعد إكمال الإعداد بنجاح:

1. راجع ملف `tasks.md` في `.kiro/specs/penetration-testing-platform/`
2. ابدأ بتنفيذ المهام حسب الترتيب
3. قم بتشغيل الاختبارات بعد كل مهمة للتحقق من الصحة

## الأدوات المساعدة

### فحص الكود (Linting)

```bash
# فحص الأخطاء
npm run lint

# إصلاح الأخطاء تلقائياً
npm run lint:fix
```

### تنسيق الكود (Formatting)

```bash
# تنسيق جميع الملفات
npm run format

# التحقق من التنسيق
npm run format:check
```

## الدعم

إذا واجهت أي مشاكل:
1. راجع ملف `README.md`
2. تحقق من السجلات (logs)
3. افتح issue في المستودع
