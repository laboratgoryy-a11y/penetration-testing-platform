# ✅ قائمة التحقق من التحويل إلى MySQL

## 📋 قبل البدء

- [ ] تثبيت XAMPP
- [ ] تشغيل MySQL من XAMPP Control Panel
- [ ] التأكد من عمل phpMyAdmin: http://localhost/phpmyadmin
- [ ] نسخ احتياطي من قاعدة البيانات الحالية (إن وجدت)
- [ ] تثبيت Node.js و npm

---

## 🔧 خطوات التحويل

### المرحلة 1: إعداد قاعدة البيانات

- [ ] **1.1** فتح phpMyAdmin
- [ ] **1.2** إنشاء قاعدة بيانات جديدة
  - الاسم: `penetration_testing_platform`
  - Collation: `utf8mb4_unicode_ci`
- [ ] **1.3** استيراد Schema
  - الملف: `src/database/schema-mysql-complete.sql`
  - التحقق من عدم وجود أخطاء
- [ ] **1.4** التحقق من إنشاء جميع الجداول (17 جدول)

**الجداول المطلوبة:**
```
✓ users
✓ sessions
✓ roles
✓ permissions
✓ role_permissions
✓ user_roles
✓ authorizations
✓ authorization_scopes
✓ authorization_operations
✓ scan_sessions
✓ vulnerabilities
✓ phishing_campaigns
✓ campaign_targets
✓ campaign_interactions
✓ network_test_sessions
✓ network_vulnerabilities
✓ discovered_devices
✓ audit_logs
✓ reports
```

### المرحلة 2: تحديث الكود

- [ ] **2.1** تثبيت mysql2
  ```bash
  npm install mysql2
  ```

- [ ] **2.2** نسخ ملف الاتصال
  ```bash
  copy src\database\connection-mysql-complete.ts src\database\connection.ts
  ```
  أو يدوياً: استبدل محتوى `connection.ts` بمحتوى `connection-mysql-complete.ts`

- [ ] **2.3** إنشاء/تحديث ملف .env
  ```env
  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=penetration_testing_platform
  DB_USER=root
  DB_PASSWORD=
  
  PORT=3001
  NODE_ENV=development
  API_VERSION=v1
  
  JWT_SECRET=your-super-secret-jwt-key-change-this
  JWT_EXPIRES_IN=24h
  ```

- [ ] **2.4** التحقق من عدم وجود استيرادات مباشرة لـ `pg`
  ```bash
  # ابحث عن أي استيرادات متبقية
  grep -r "from 'pg'" src/
  grep -r 'from "pg"' src/
  ```

### المرحلة 3: الاختبار

- [ ] **3.1** اختبار الاتصال
  ```bash
  node test-mysql-connection.js
  ```
  يجب أن ترى: ✅ جميع الاختبارات نجحت!

- [ ] **3.2** بناء المشروع
  ```bash
  npm run build
  ```
  يجب أن يكتمل بدون أخطاء

- [ ] **3.3** تشغيل الخادم
  ```bash
  npm start
  ```
  يجب أن ترى:
  ```
  ✓ MySQL connected successfully
  ✓ Database connection established
  ✓ Server running on port 3001
  ```

- [ ] **3.4** اختبار Health Endpoint
  - افتح: http://localhost:3001/health
  - يجب أن ترى: `{"success": true, "data": {"status": "ok"}}`

- [ ] **3.5** اختبار تسجيل الدخول
  - افتح: http://localhost:3001/login.html
  - سجل الدخول بأي بيانات
  - يجب أن تنجح العملية

### المرحلة 4: اختبار الميزات

- [ ] **4.1** التصاريح (Authorizations)
  - [ ] إنشاء تصريح جديد
  - [ ] عرض قائمة التصاريح
  - [ ] تعديل تصريح
  - [ ] حذف تصريح

- [ ] **4.2** فحص الويب (Web Scanning)
  - [ ] إنشاء فحص جديد
  - [ ] عرض حالة الفحص
  - [ ] عرض الثغرات المكتشفة

- [ ] **4.3** حملات التصيد (Phishing)
  - [ ] إنشاء حملة جديدة
  - [ ] إضافة أهداف
  - [ ] عرض النتائج

- [ ] **4.4** تحليل الشبكات (Network Analysis)
  - [ ] إنشاء تحليل جديد
  - [ ] عرض الأجهزة المكتشفة
  - [ ] عرض الثغرات

- [ ] **4.5** فحص IP (IP Scanner)
  - [ ] إنشاء فحص IP
  - [ ] عرض النتائج

- [ ] **4.6** التقارير (Reports)
  - [ ] إنشاء تقرير
  - [ ] تحميل تقرير

- [ ] **4.7** سجلات التدقيق (Audit Logs)
  - [ ] عرض السجلات
  - [ ] تصفية السجلات

---

## 🔍 التحقق من الأداء

### اختبارات الأداء الأساسية

- [ ] **زمن الاستجابة**
  - Health endpoint: < 50ms
  - Login: < 200ms
  - List operations: < 500ms

- [ ] **استهلاك الذاكرة**
  - عند البدء: < 100MB
  - بعد ساعة: < 200MB

- [ ] **الاتصالات**
  - عدد الاتصالات النشطة: < 5
  - لا توجد تسريبات في الاتصالات

---

## 🐛 استكشاف الأخطاء

### الأخطاء الشائعة وحلولها

#### ❌ ER_ACCESS_DENIED_ERROR
```
الخطأ: Access denied for user 'root'@'localhost'
الحل: تحديث DB_PASSWORD في .env
```
- [ ] تحديث كلمة المرور في .env
- [ ] إعادة تشغيل الخادم

#### ❌ ER_BAD_DB_ERROR
```
الخطأ: Unknown database 'penetration_testing_platform'
الحل: إنشاء قاعدة البيانات
```
- [ ] إنشاء قاعدة البيانات من phpMyAdmin
- [ ] استيراد Schema

#### ❌ ECONNREFUSED
```
الخطأ: connect ECONNREFUSED 127.0.0.1:3306
الحل: تشغيل MySQL
```
- [ ] فتح XAMPP Control Panel
- [ ] تشغيل MySQL
- [ ] التحقق من أن المنفذ 3306 غير محجوب

#### ❌ Cannot find module 'mysql2'
```
الخطأ: Cannot find module 'mysql2'
الحل: تثبيت mysql2
```
- [ ] تشغيل: npm install mysql2
- [ ] إعادة بناء المشروع

#### ❌ Syntax Error in SQL
```
الخطأ: You have an error in your SQL syntax
الحل: التحقق من إصدار MySQL
```
- [ ] التحقق من إصدار MySQL (يجب أن يكون 5.7+)
- [ ] تحديث MySQL إذا لزم الأمر

---

## 📊 مقارنة قبل وبعد

### قبل التحويل (PostgreSQL)
```
✓ قاعدة البيانات: PostgreSQL
✓ الاتصال: pg Pool
✓ الجلسات: Redis
✓ المنفذ: 5432
✓ الأدوات: pgAdmin
```

### بعد التحويل (MySQL)
```
✓ قاعدة البيانات: MySQL
✓ الاتصال: mysql2 Pool
✓ الجلسات: In-Memory
✓ المنفذ: 3306
✓ الأدوات: phpMyAdmin
```

---

## 📝 ملاحظات مهمة

### ✅ ما يعمل بنفس الطريقة
- جميع API endpoints
- جميع الميزات
- الواجهة الأمامية
- المصادقة والتفويض
- سجلات التدقيق

### ⚠️ الاختلافات
- الجلسات تُخزن في الذاكرة (تُفقد عند إعادة التشغيل)
- UUID يُخزن كـ VARCHAR(36)
- بعض الدوال المتقدمة قد لا تكون متاحة

### 💡 نصائح
- احتفظ بنسخة احتياطية من قاعدة البيانات القديمة
- اختبر جميع الميزات بعد التحويل
- راقب الأداء في الأيام الأولى
- استخدم phpMyAdmin لإدارة قاعدة البيانات

---

## 🎯 الخطوات النهائية

- [ ] **توثيق التغييرات**
  - [ ] تحديث README.md
  - [ ] توثيق إعدادات .env الجديدة
  - [ ] إضافة ملاحظات للفريق

- [ ] **النشر**
  - [ ] اختبار على بيئة staging
  - [ ] إعداد خطة rollback
  - [ ] النشر على production

- [ ] **المراقبة**
  - [ ] مراقبة الأداء
  - [ ] مراقبة الأخطاء
  - [ ] جمع feedback من المستخدمين

---

## ✅ التأكيد النهائي

عند اكتمال جميع الخطوات أعلاه:

```
✅ قاعدة البيانات تعمل
✅ الخادم يعمل
✅ جميع الميزات تعمل
✅ لا توجد أخطاء
✅ الأداء مقبول
```

**التحويل مكتمل! 🎉**

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. راجع قسم "استكشاف الأخطاء" أعلاه
2. اقرأ `MYSQL_SETUP_COMPLETE_GUIDE.md`
3. اقرأ `📖-دليل-التحويل-السريع.md`
4. شغل `node test-mysql-connection.js`
5. تحقق من logs الخادم

---

**تاريخ التحويل:** __________
**المسؤول:** __________
**الحالة:** ☐ قيد التنفيذ  ☐ مكتمل  ☐ فشل
