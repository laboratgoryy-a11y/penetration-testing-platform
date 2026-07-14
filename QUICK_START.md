# دليل البدء السريع

## التثبيت السريع

```bash
# 1. تثبيت الحزم
npm install

# 2. إعداد البيئة
cp .env.example .env
# عدّل ملف .env بالقيم المناسبة

# 3. إنشاء قاعدة البيانات
createdb penetration_testing_platform

# 4. تشغيل الترحيل
npm run db:migrate

# 5. تشغيل التطبيق
npm run dev
```

## الأوامر الأساسية

### التطوير
```bash
npm run dev          # تشغيل وضع التطوير مع إعادة التحميل التلقائي
npm run build        # بناء المشروع للإنتاج
npm start            # تشغيل النسخة المبنية
```

### الاختبار
```bash
npm test                # تشغيل جميع الاختبارات
npm run test:watch      # تشغيل الاختبارات في وضع المراقبة
npm run test:coverage   # تشغيل الاختبارات مع تقرير التغطية
```

### فحص الكود
```bash
npm run lint            # فحص الأخطاء
npm run lint:fix        # إصلاح الأخطاء تلقائياً
npm run format          # تنسيق الكود
npm run format:check    # التحقق من التنسيق
```

### قاعدة البيانات
```bash
npm run db:migrate      # تشغيل الترحيل
```

## هيكل المشروع المختصر

```
src/
├── __tests__/      # الاختبارات
├── config/         # الإعدادات
├── database/       # قاعدة البيانات
├── types/          # تعريفات الأنواع
├── utils/          # أدوات مساعدة
└── index.ts        # نقطة الدخول
```

## متغيرات البيئة الأساسية

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=penetration_testing_platform
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your_secret_key
ENCRYPTION_KEY=your_encryption_key
```

## نقاط النهاية الأساسية

```bash
# فحص الصحة
GET http://localhost:3000/health

# إخلاء المسؤولية
GET http://localhost:3000/api/disclaimer
```

## الخطوات التالية

1. ✅ إعداد البنية التحتية (المهمة 1)
2. ⏭️ تنفيذ نظام المصادقة والتفويض (المهمة 2)
3. ⏭️ تنفيذ نظام إدارة التصاريح (المهمة 3)

راجع ملف `tasks.md` للحصول على قائمة كاملة بالمهام.

## الموارد المفيدة

- 📖 [README.md](README.md) - الوثائق الكاملة
- 🔧 [SETUP.md](SETUP.md) - دليل الإعداد التفصيلي
- 📁 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - هيكل المشروع
- 📋 [tasks.md](.kiro/specs/penetration-testing-platform/tasks.md) - خطة التنفيذ

## المساعدة

إذا واجهت مشاكل:
1. تحقق من تشغيل PostgreSQL و Redis
2. تأكد من صحة متغيرات البيئة في `.env`
3. راجع السجلات (logs) للحصول على تفاصيل الأخطاء
4. راجع ملف SETUP.md لحل المشاكل الشائعة
