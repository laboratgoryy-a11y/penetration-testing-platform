# منصة اختبار الاختراق والأمن الهجومي

[![CI](https://github.com/your-org/penetration-testing-platform/workflows/CI%20-%20Continuous%20Integration/badge.svg)](https://github.com/your-org/penetration-testing-platform/actions/workflows/ci.yml)
[![CD](https://github.com/your-org/penetration-testing-platform/workflows/CD%20-%20Continuous%20Deployment/badge.svg)](https://github.com/your-org/penetration-testing-platform/actions/workflows/cd.yml)
[![Code Quality](https://github.com/your-org/penetration-testing-platform/workflows/Code%20Quality/badge.svg)](https://github.com/your-org/penetration-testing-platform/actions/workflows/code-quality.yml)
[![codecov](https://codecov.io/gh/your-org/penetration-testing-platform/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/penetration-testing-platform)

منصة شاملة لاختبار الاختراق والأمن الهجومي تتضمن ثلاثة مكونات رئيسية:

1. **ماسح ثغرات تطبيقات الويب** - أداة لفحص النطاقات واكتشاف الثغرات
2. **نظام هجمات التصيد الاحتيالي** - لإرسال رسائل تصيد وتتبع النتائج
3. **محلل الشبكات اللاسلكية** - لاختبار أمان شبكات Wi-Fi

## ⚠️ إخلاء المسؤولية القانونية

هذه المنصة مصممة حصرياً للاستخدام القانوني والأخلاقي في اختبار الاختراق المصرح به. يجب الحصول على تصريح كتابي صريح قبل إجراء أي اختبار. الاستخدام غير المصرح به لهذه الأدوات يعتبر غير قانوني ويخضع للمساءلة الجنائية.

## التقنيات المستخدمة

- **لغة البرمجة**: TypeScript/Node.js
- **قاعدة البيانات**: PostgreSQL
- **التخزين المؤقت**: Redis
- **إطار الاختبار**: Jest + fast-check
- **API**: RESTful مع Express.js

## المتطلبات

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Redis >= 7.x
- npm أو yarn

## التثبيت

### الطريقة 1: باستخدام Docker (موصى به)

#### التطوير
```bash
# استنساخ المشروع
git clone <repository-url>
cd penetration-testing-platform

# تشغيل سكريبت الإعداد
chmod +x scripts/init-development.sh
./scripts/init-development.sh

# أو استخدام Makefile
make dev
```

التطبيق سيكون متاحاً على: http://localhost:3000

#### الإنتاج
```bash
# نسخ وتعديل ملف البيئة
cp .env.example .env
nano .env  # قم بتحديث القيم الإنتاجية

# تشغيل سكريبت الإعداد
chmod +x scripts/init-production.sh
./scripts/init-production.sh

# أو استخدام Makefile
make build
make up
```

للمزيد من التفاصيل، راجع [دليل إعداد Docker](./DOCKER_SETUP.md)

### الطريقة 2: التثبيت المباشر

1. استنساخ المشروع:
```bash
git clone <repository-url>
cd penetration-testing-platform
```

2. تثبيت الحزم:
```bash
npm install
```

3. إعداد متغيرات البيئة:
```bash
cp .env.example .env
# قم بتحرير ملف .env وإضافة القيم المناسبة
```

4. إنشاء قاعدة البيانات:
```bash
createdb penetration_testing_platform
```

5. تشغيل الترحيل:
```bash
npm run db:migrate
```

## الاستخدام

### باستخدام Docker

```bash
# بدء البيئة
make dev              # للتطوير
make up               # للإنتاج

# عرض السجلات
make logs

# إيقاف البيئة
make down

# أوامر أخرى
make help             # عرض جميع الأوامر المتاحة
```

### التشغيل المباشر

#### وضع التطوير
```bash
npm run dev
```

#### البناء للإنتاج
```bash
npm run build
npm start
```

### تشغيل الاختبارات
```bash
# جميع الاختبارات
npm test

# الاختبارات مع التغطية
npm run test:coverage

# وضع المراقبة
npm run test:watch
```

### فحص الكود
```bash
# فحص الأخطاء
npm run lint

# إصلاح الأخطاء تلقائياً
npm run lint:fix

# تنسيق الكود
npm run format
```

## هيكل المشروع

```
penetration-testing-platform/
├── src/
│   ├── __tests__/          # الاختبارات
│   ├── config/             # إعدادات التطبيق
│   ├── database/           # اتصال قاعدة البيانات والترحيل
│   ├── types/              # تعريفات الأنواع
│   ├── services/           # خدمات الأعمال
│   ├── api/                # نقاط نهاية API
│   ├── utils/              # أدوات مساعدة
│   └── index.ts            # نقطة الدخول
├── scripts/                # سكريبتات الإعداد والصيانة
├── nginx/                  # إعدادات Nginx
├── dist/                   # ملفات البناء
├── coverage/               # تقارير تغطية الاختبارات
├── Dockerfile              # صورة Docker للإنتاج
├── Dockerfile.dev          # صورة Docker للتطوير
├── docker-compose.yml      # إعداد Docker للإنتاج
├── docker-compose.dev.yml  # إعداد Docker للتطوير
├── docker-compose.test.yml # إعداد Docker للاختبارات
├── Makefile                # أوامر مختصرة
├── .env.example            # مثال لمتغيرات البيئة
├── package.json
├── tsconfig.json
├── DOCKER_SETUP.md         # دليل إعداد Docker
└── README.md
```

## الأمان

- جميع البيانات الحساسة مشفرة باستخدام AES-256
- المصادقة متعددة العوامل (MFA) مدعومة
- تسجيل شامل لجميع العمليات
- التحقق الإلزامي من التصاريح قبل أي عملية

## CI/CD Pipeline

المشروع يستخدم GitHub Actions لأتمتة عمليات الاختبار والنشر:

### التكامل المستمر (CI)
- ✅ فحص الكود (Linting)
- ✅ اختبارات الوحدة والتكامل
- ✅ فحص الأمان (Snyk, Trivy)
- ✅ تحليل جودة الكود (SonarCloud, CodeQL)
- ✅ بناء Docker images
- ✅ تقارير التغطية

### النشر المستمر (CD)
- 🚀 نشر تلقائي لبيئة Staging عند الدفع إلى `main`
- 🚀 نشر تلقائي لبيئة Production عند إنشاء tag
- 📦 إدارة الإصدارات التلقائية
- 🔄 نسخ احتياطي تلقائي قبل النشر
- ↩️ استرجاع تلقائي عند الفشل

### الميزات الإضافية
- 📊 اختبارات الأداء (k6)
- 🔄 تحديثات تلقائية للتبعيات (Dependabot)
- 📢 إشعارات Slack
- 📈 مراقبة جودة الكود

للمزيد من التفاصيل، راجع [دليل CI/CD](./docs/CI_CD_PIPELINE.md)

## المساهمة

يرجى قراءة دليل المساهمة قبل تقديم أي طلبات سحب.

## الترخيص

هذا المشروع مرخص بموجب رخصة MIT - راجع ملف LICENSE للتفاصيل.

## الدعم

للحصول على الدعم، يرجى فتح issue في مستودع GitHub.
