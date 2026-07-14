# هيكل المشروع - منصة اختبار الاختراق

## نظرة عامة على الهيكل

```
penetration-testing-platform/
│
├── .kiro/                              # مجلد إعدادات Kiro
│   └── specs/                          # مواصفات المشروع
│       └── penetration-testing-platform/
│           ├── requirements.md         # وثيقة المتطلبات
│           ├── design.md              # وثيقة التصميم
│           └── tasks.md               # خطة التنفيذ
│
├── src/                               # الكود المصدري
│   ├── __tests__/                     # الاختبارات
│   │   ├── config.test.ts            # اختبارات الإعدادات
│   │   ├── database.test.ts          # اختبارات قاعدة البيانات
│   │   ├── errors.test.ts            # اختبارات الأخطاء المخصصة
│   │   ├── example.property.test.ts  # مثال على PBT
│   │   └── setup.ts                  # إعداد الاختبارات
│   │
│   ├── config/                        # إعدادات التطبيق
│   │   └── index.ts                  # ملف الإعدادات الرئيسي
│   │
│   ├── database/                      # قاعدة البيانات
│   │   ├── connection.ts             # اتصال PostgreSQL و Redis
│   │   ├── migrate.ts                # سكريبت الترحيل
│   │   └── schema.sql                # مخطط قاعدة البيانات
│   │
│   ├── types/                         # تعريفات الأنواع
│   │   └── index.ts                  # الأنواع والواجهات الرئيسية
│   │
│   ├── utils/                         # أدوات مساعدة
│   │   ├── errors.ts                 # أخطاء مخصصة
│   │   └── logger.ts                 # نظام السجلات
│   │
│   └── index.ts                       # نقطة الدخول الرئيسية
│
├── dist/                              # ملفات البناء (يتم إنشاؤها)
├── coverage/                          # تقارير تغطية الاختبارات (يتم إنشاؤها)
├── node_modules/                      # الحزم المثبتة (يتم إنشاؤها)
│
├── .env.example                       # مثال لمتغيرات البيئة
├── .env                              # متغيرات البيئة (غير مضمن في Git)
├── .eslintrc.json                    # إعدادات ESLint
├── .gitignore                        # ملفات مستبعدة من Git
├── .prettierrc.json                  # إعدادات Prettier
├── jest.config.js                    # إعدادات Jest
├── package.json                      # معلومات المشروع والحزم
├── tsconfig.json                     # إعدادات TypeScript
├── README.md                         # الوثائق الرئيسية
├── SETUP.md                          # دليل الإعداد
└── PROJECT_STRUCTURE.md              # هذا الملف
```

## وصف المجلدات والملفات

### المجلدات الرئيسية

#### `src/`
يحتوي على جميع الكود المصدري للتطبيق.

#### `src/__tests__/`
يحتوي على جميع الاختبارات:
- **اختبارات الوحدة (Unit Tests)**: اختبار مكونات فردية
- **اختبارات الخصائص (Property-Based Tests)**: اختبار خصائص عامة باستخدام fast-check
- **اختبارات التكامل (Integration Tests)**: اختبار تفاعل المكونات

#### `src/config/`
إعدادات التطبيق المركزية:
- قراءة متغيرات البيئة
- إعدادات قاعدة البيانات
- إعدادات الأمان
- إعدادات JWT

#### `src/database/`
كل ما يتعلق بقاعدة البيانات:
- **connection.ts**: إدارة اتصالات PostgreSQL و Redis
- **migrate.ts**: سكريبت تشغيل الترحيل
- **schema.sql**: مخطط قاعدة البيانات الكامل

#### `src/types/`
تعريفات TypeScript للأنواع والواجهات المشتركة.

#### `src/utils/`
أدوات مساعدة قابلة لإعادة الاستخدام:
- **errors.ts**: أخطاء مخصصة للتطبيق
- **logger.ts**: نظام السجلات

### الملفات الرئيسية

#### `src/index.ts`
نقطة الدخول الرئيسية للتطبيق:
- إعداد Express server
- تكوين middleware
- بدء الخادم
- معالجة الإيقاف الآمن

#### `package.json`
معلومات المشروع والحزم:
- الاعتماديات (dependencies)
- اعتماديات التطوير (devDependencies)
- السكريبتات (scripts)

#### `tsconfig.json`
إعدادات مترجم TypeScript:
- خيارات الترجمة
- المجلدات المضمنة/المستبعدة
- إعدادات الأمان والصرامة

#### `.eslintrc.json`
قواعد فحص الكود:
- قواعد TypeScript
- قواعد Prettier
- قواعد مخصصة

#### `jest.config.js`
إعدادات إطار الاختبار:
- بيئة الاختبار
- تغطية الكود
- تحويل الملفات

## المجلدات المستقبلية

سيتم إضافة المجلدات التالية أثناء التطوير:

```
src/
├── services/                          # خدمات الأعمال
│   ├── authorization/                # إدارة التصاريح
│   ├── authentication/               # المصادقة والتفويز
│   ├── scanner/                      # ماسح الويب
│   ├── phishing/                     # محرك التصيد
│   ├── network/                      # محلل الشبكات
│   ├── reports/                      # مولد التقارير
│   └── audit/                        # التدقيق والسجلات
│
├── api/                              # نقاط نهاية API
│   ├── routes/                       # المسارات
│   ├── controllers/                  # المتحكمات
│   ├── middleware/                   # Middleware
│   └── validators/                   # التحقق من المدخلات
│
└── models/                           # نماذج البيانات
    ├── User.ts
    ├── Authorization.ts
    ├── ScanSession.ts
    └── ...
```

## اصطلاحات التسمية

### الملفات
- **PascalCase**: للفئات والواجهات (مثل: `AuthorizationManager.ts`)
- **camelCase**: للوظائف والمتغيرات (مثل: `connection.ts`)
- **kebab-case**: لملفات الإعدادات (مثل: `.eslintrc.json`)

### الاختبارات
- **Unit Tests**: `*.test.ts`
- **Property-Based Tests**: `*.property.test.ts`
- **Integration Tests**: `*.integration.test.ts`

### المجلدات
- **camelCase** أو **kebab-case** حسب السياق
- أسماء واضحة ووصفية

## أفضل الممارسات

1. **فصل الاهتمامات**: كل مجلد له مسؤولية واحدة واضحة
2. **قابلية إعادة الاستخدام**: الأدوات المشتركة في `utils/`
3. **الاختبار**: اختبار شامل لكل مكون
4. **التوثيق**: تعليقات واضحة في الكود
5. **الأمان**: التحقق من المدخلات ومعالجة الأخطاء

## الملفات المستبعدة من Git

المحددة في `.gitignore`:
- `node_modules/`
- `dist/`
- `.env`
- `coverage/`
- ملفات IDE
- ملفات مؤقتة

## الموارد

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [fast-check Documentation](https://fast-check.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
