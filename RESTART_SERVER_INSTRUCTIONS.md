# تعليمات إعادة تشغيل الخادم

## الحالة الحالية ✅

تم إصلاح جميع المشاكل وتشغيل الخادم بنجاح!

## الخادم يعمل الآن

- **العنوان**: http://localhost:3000
- **الواجهة الرئيسية**: http://localhost:3000/index.html
- **تسجيل الدخول**: http://localhost:3000/login.html
- **قاعدة البيانات**: SQLite (penetration_testing.db)

## بيانات الاختبار

```
Username: admin
Password: password
```

## الإصلاحات التي تمت

### 1. إصلاح Redirect Loop ✅
- تم إضافة redirect flag في sessionStorage
- تم تحسين logic التحقق من token

### 2. إصلاح أخطاء JavaScript ✅
- تم حذف الملفات المكررة (notifications.js, loading.js)
- تم تصدير window.api في api.js
- تم إضافة دوال showLoading/hideLoading عامة

### 3. إصلاح استخدامات showLoading/hideLoading ✅
- تم تحديث 7 ملفات JavaScript
- تم إصلاح ~40 استدعاء

### 4. إصلاح تهيئة Managers ✅
- تم تصدير Classes إلى window
- تم إضافة تهيئة مركزية في main.js

### 5. إصلاح StateManager.setState ✅
- تم إضافة method جديد updateState()
- تم تحديث جميع الاستدعاءات

### 6. إنشاء Backend Routes ✅
- تم إنشاء dashboard.routes.ts
- تم تحديث audit routes

### 7. إصلاح أخطاء TypeScript ✅
- تم تثبيت nodemailer
- تم إصلاح async/await في RealNetworkScanner
- تم بناء المشروع بنجاح

## كيفية إعادة التشغيل

### الطريقة 1: استخدام SQLite (موصى به)
```bash
node server-sqlite.js
```

### الطريقة 2: استخدام PostgreSQL
إذا كنت تريد استخدام PostgreSQL:

1. تأكد من تشغيل PostgreSQL
2. قم بتحديث ملف .env
3. قم بتشغيل:
```bash
npm run build
npm start
```

## Scripts المتاحة

### Windows CMD
```cmd
restart-server.bat
```

### PowerShell
```powershell
.\restart-server.ps1
```

## الاختبار

1. افتح المتصفح على: http://localhost:3000/login.html
2. سجل الدخول باستخدام:
   - Username: admin
   - Password: password
3. تحقق من عمل جميع الأقسام:
   - Dashboard
   - Network Analyzer
   - Web Scanner
   - Phishing Campaigns
   - IP Scanner
   - Reports

## ملاحظات مهمة

- الخادم يستخدم SQLite بشكل افتراضي (لا يحتاج PostgreSQL)
- جميع الـ endpoints متصلة بقاعدة البيانات الحقيقية
- تم إزالة جميع البيانات الوهمية (mocks)
- Redis اختياري (يستخدم in-memory storage إذا لم يكن متاحاً)

## في حالة وجود مشاكل

### مسح الذاكرة المؤقتة
اضغط `Ctrl + Shift + R` في المتصفح

### إعادة بناء المشروع
```bash
npm run build
```

### التحقق من الأخطاء
افتح Developer Console في المتصفح (F12)

## الملفات المعدلة

1. `public/js/auth.js` - إصلاح redirect loop
2. `public/js/api.js` - تصدير window.api
3. `public/js/loading-manager.js` - دوال عامة
4. `public/js/main.js` - تهيئة مركزية
5. `public/js/state-manager.js` - updateState method
6. `src/api/routes/dashboard.routes.ts` - routes جديدة
7. `src/services/RealNetworkScanner.ts` - إصلاح async/await
8. `package.json` - إضافة nodemailer

## الخطوات التالية

الآن يمكنك:
1. اختبار جميع الميزات
2. إضافة مستخدمين جدد
3. إنشاء فحوصات جديدة
4. توليد تقارير

---

**تم التحديث**: 2026-01-27
**الحالة**: ✅ جميع الأنظمة تعمل
