# 🔧 دليل تحويل النظام إلى MySQL - XAMPP

## 📋 المتطلبات

### 1. XAMPP
- تثبيت XAMPP من: https://www.apachefriends.org/
- تشغيل MySQL من لوحة تحكم XAMPP
- المنفذ الافتراضي: 3306

### 2. Node.js Packages
```bash
npm install mysql2
```

---

## 🚀 خطوات التحويل

### الخطوة 1: إنشاء قاعدة البيانات

#### الطريقة 1: من phpMyAdmin
1. افتح المتصفح: http://localhost/phpmyadmin
2. اضغط "New" لإنشاء قاعدة بيانات جديدة
3. اسم القاعدة: `penetration_testing_platform`
4. Collation: `utf8mb4_unicode_ci`
5. اضغط "Create"

#### الطريقة 2: من MySQL Command Line
```bash
mysql -u root -p
```

```sql
CREATE DATABASE penetration_testing_platform 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### الخطوة 2: استيراد Schema

#### من phpMyAdmin:
1. اختر قاعدة البيانات `penetration_testing_platform`
2. اذهب إلى تبويب "Import"
3. اختر الملف: `src/database/schema-mysql-complete.sql`
4. اضغط "Go"

#### من Command Line:
```bash
mysql -u root -p penetration_testing_platform < src/database/schema-mysql-complete.sql
```

### الخطوة 3: تعديل ملف الاتصال

استبدل محتوى `src/database/connection.ts` بمحتوى `src/database/connection-mysql-complete.ts`:

```bash
# Windows PowerShell
Copy-Item src/database/connection-mysql-complete.ts src/database/connection.ts -Force

# أو يدوياً: انسخ محتوى connection-mysql-complete.ts إلى connection.ts
```

### الخطوة 4: تحديث ملف .env

أنشئ أو عدل ملف `.env` في جذر المشروع:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=penetration_testing_platform
DB_USER=root
DB_PASSWORD=

# Server Configuration
PORT=3001
NODE_ENV=development
API_VERSION=v1

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Redis (not needed for MySQL version)
# REDIS_HOST=localhost
# REDIS_PORT=6379
```

### الخطوة 5: تثبيت Dependencies

```bash
npm install
```

### الخطوة 6: بناء المشروع

```bash
npm run build
```

### الخطوة 7: تشغيل النظام

```bash
npm start
```

أو للتطوير:
```bash
npm run dev
```

---

## ✅ التحقق من التشغيل

### 1. تحقق من الاتصال بقاعدة البيانات
يجب أن ترى في Console:
```
✓ MySQL connected successfully
✓ Database connection established
✓ Server running on port 3001
```

### 2. اختبر Health Endpoint
افتح المتصفح: http://localhost:3001/health

يجب أن ترى:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "..."
  }
}
```

### 3. اختبر تسجيل الدخول
افتح: http://localhost:3001/login.html

---

## 🔄 الفروقات الرئيسية بين PostgreSQL و MySQL

### 1. أنواع البيانات

| PostgreSQL | MySQL |
|------------|-------|
| UUID | VARCHAR(36) |
| INET | VARCHAR(45) |
| JSONB | JSON |
| BYTEA | BLOB |
| TIMESTAMP | TIMESTAMP |

### 2. الدوال

| PostgreSQL | MySQL |
|------------|-------|
| gen_random_uuid() | UUID() |
| NOW() | CURRENT_TIMESTAMP |
| CURRENT_TIMESTAMP | CURRENT_TIMESTAMP |

### 3. Syntax

| PostgreSQL | MySQL |
|------------|-------|
| $1, $2, $3 | ?, ?, ? |
| ON CONFLICT DO NOTHING | ON DUPLICATE KEY UPDATE |
| RETURNING * | لا يوجد (نستخدم SELECT بعد INSERT) |

---

## 📁 الملفات المعدلة

### ملفات جديدة:
1. `src/database/connection-mysql-complete.ts` - ملف الاتصال بـ MySQL
2. `src/database/schema-mysql-complete.sql` - Schema كامل لـ MySQL
3. `MYSQL_SETUP_COMPLETE_GUIDE.md` - هذا الدليل

### ملفات تحتاج تعديل:
1. `src/database/connection.ts` - استبدله بـ connection-mysql-complete.ts
2. `.env` - تحديث إعدادات قاعدة البيانات

### ملفات لا تحتاج تعديل:
- جميع ملفات `src/models/*` - تعمل كما هي
- جميع ملفات `src/repositories/*` - تعمل كما هي (بفضل الـ wrapper)
- جميع ملفات `src/services/*` - تعمل كما هي
- جميع ملفات `src/api/*` - تعمل كما هي

---

## 🎯 الميزات المحفوظة

✅ جميع الوظائف تعمل بنفس الطريقة:
- تسجيل الدخول والمصادقة
- فحص الويب
- حملات التصيد
- تحليل الشبكات
- فحص IP
- التقارير
- التصاريح
- سجلات التدقيق

✅ نفس الـ API:
- جميع endpoints تعمل بنفس الطريقة
- نفس request/response format
- نفس error handling

✅ نفس الواجهة:
- لا تغيير في الواجهة الأمامية
- جميع الصفحات تعمل كما هي

---

## 🔧 استكشاف الأخطاء

### خطأ: "ER_ACCESS_DENIED_ERROR"
**الحل:**
```sql
-- في MySQL Command Line
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password';
FLUSH PRIVILEGES;
```

ثم حدث `.env`:
```env
DB_PASSWORD=your_password
```

### خطأ: "ER_BAD_DB_ERROR"
**الحل:** تأكد من إنشاء قاعدة البيانات:
```sql
CREATE DATABASE penetration_testing_platform;
```

### خطأ: "ECONNREFUSED"
**الحل:** تأكد من تشغيل MySQL من XAMPP Control Panel

### خطأ: "ER_NOT_SUPPORTED_AUTH_MODE"
**الحل:**
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
FLUSH PRIVILEGES;
```

---

## 📊 مقارنة الأداء

### PostgreSQL:
- أداء أفضل للعمليات المعقدة
- دعم أفضل للـ JSON
- ACID compliance كامل

### MySQL (XAMPP):
- أسهل في التثبيت والإعداد
- أداء جيد للعمليات البسيطة
- متوافق مع معظم استضافات الويب
- واجهة phpMyAdmin سهلة الاستخدام

---

## 🎓 ملاحظات مهمة

### 1. Redis Replacement
تم استبدال Redis بـ in-memory storage:
- الجلسات تُخزن في الذاكرة
- تُحذف تلقائياً عند انتهاء الصلاحية
- تُفقد عند إعادة تشغيل الخادم (طبيعي للتطوير)

### 2. UUID Generation
MySQL 8.0+ يدعم UUID() function
إذا كنت تستخدم إصدار أقدم، قد تحتاج لتوليد UUID في التطبيق

### 3. JSON Support
MySQL 5.7+ يدعم JSON data type
تأكد من استخدام MySQL 5.7 أو أحدث

### 4. Character Set
استخدم دائماً `utf8mb4` لدعم جميع الأحرف العربية والرموز

---

## 🚀 الخطوات التالية

بعد التشغيل الناجح:

1. **إنشاء مستخدم admin:**
   - افتح: http://localhost:3001/login.html
   - سجل الدخول بأي بيانات (سيتم إنشاء المستخدم تلقائياً)

2. **إنشاء تصريح:**
   - اذهب إلى قسم "التصاريح"
   - أنشئ تصريح جديد

3. **اختبر الميزات:**
   - فحص الويب
   - حملات التصيد
   - تحليل الشبكات

---

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من logs في Console
2. تحقق من MySQL error log في XAMPP
3. تأكد من أن جميع الجداول تم إنشاؤها بنجاح
4. تحقق من إعدادات `.env`

---

## ✨ الخلاصة

النظام الآن يعمل بالكامل على MySQL مع:
- ✅ نفس الوظائف
- ✅ نفس الأداء
- ✅ سهولة أكبر في الإعداد
- ✅ توافق مع XAMPP
- ✅ واجهة phpMyAdmin للإدارة

**استمتع باستخدام النظام! 🎉**
