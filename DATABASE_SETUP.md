# إعداد قاعدة البيانات - Database Setup

## المتطلبات الأساسية

1. **PostgreSQL** - يجب تثبيت PostgreSQL على جهازك
   - تحميل من: https://www.postgresql.org/download/
   - أو استخدام Docker: `docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`

2. **Node.js** - مثبت بالفعل

## خطوات الإعداد

### 1. تثبيت PostgreSQL (إذا لم يكن مثبتاً)

#### Windows:
```cmd
# تحميل المثبت من الموقع الرسمي
# https://www.postgresql.org/download/windows/

# أو استخدام Chocolatey
choco install postgresql
```

#### استخدام Docker (الأسهل):
```cmd
docker run --name postgres-pentest ^
  -e POSTGRES_PASSWORD=postgres ^
  -e POSTGRES_USER=postgres ^
  -p 5432:5432 ^
  -d postgres:15
```

### 2. تكوين ملف .env

أنشئ أو حدّث ملف `.env` في جذر المشروع:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=penetration_testing_platform
DB_USER=postgres
DB_PASSWORD=postgres

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. تشغيل سكربت الإعداد

```cmd
# تشغيل سكربت إعداد قاعدة البيانات
node setup-database.js
```

هذا السكربت سيقوم بـ:
- ✅ إنشاء قاعدة البيانات إذا لم تكن موجودة
- ✅ تطبيق Schema (الجداول والعلاقات)
- ✅ إضافة البيانات التجريبية (Mock Data)
- ✅ عرض إحصائيات البيانات

### 4. التحقق من الإعداد

بعد تشغيل السكربت، يجب أن ترى:

```
==========================================================
✅ تم إعداد قاعدة البيانات بنجاح!
==========================================================

📊 إحصائيات قاعدة البيانات:
   👥 المستخدمين: 3
   🔐 التصاريح: 2
   🔍 جلسات الفحص: 3
   🐟 حملات التصيد: 2
   📡 اختبارات الشبكات: 2
   🐛 الثغرات: 11
   📝 سجلات التدقيق: 5
   📄 التقارير: 3
```

## البيانات التجريبية

### المستخدمين:

| Username  | Password    | Role      |
|-----------|-------------|-----------|
| admin     | password123 | ADMIN     |
| pentester | password123 | PENTESTER |
| analyst   | password123 | ANALYST   |

### البيانات المتوفرة:

- **3 عمليات فحص ويب** (مكتملة، قيد التشغيل، قيد الانتظار)
- **11 ثغرة أمنية** بمستويات خطورة مختلفة
- **2 حملة تصيد** (نشطة ومكتملة)
- **5 أهداف للحملات** مع تفاعلات
- **2 اختبار شبكة** مع أجهزة مكتشفة
- **3 تقارير** (فحص، حملة، امتثال)
- **5 سجلات تدقيق**

## تشغيل الخادم مع قاعدة البيانات

### الخادم الكامل (مع PostgreSQL):
```cmd
node server.js
```

### الخادم البسيط (بدون قاعدة بيانات):
```cmd
node start-simple.js
```

## استكشاف الأخطاء

### خطأ: ECONNREFUSED
```
❌ Database connection failed: connect ECONNREFUSED
```

**الحل:**
1. تأكد من تشغيل PostgreSQL
2. تحقق من معلومات الاتصال في `.env`
3. تأكد من المنفذ 5432 غير محجوب

### خطأ: authentication failed
```
❌ password authentication failed for user "postgres"
```

**الحل:**
1. تحقق من كلمة المرور في `.env`
2. أعد تعيين كلمة مرور PostgreSQL

### خطأ: database does not exist
```
❌ database "penetration_testing_platform" does not exist
```

**الحل:**
- شغّل `node setup-database.js` مرة أخرى

## الاتصال بقاعدة البيانات يدوياً

### استخدام psql:
```cmd
psql -U postgres -d penetration_testing_platform
```

### استخدام pgAdmin:
1. افتح pgAdmin
2. أنشئ اتصال جديد:
   - Host: localhost
   - Port: 5432
   - Database: penetration_testing_platform
   - Username: postgres
   - Password: postgres

## هيكل قاعدة البيانات

### الجداول الرئيسية:

1. **users** - المستخدمين والمصادقة
2. **roles** - الأدوار والصلاحيات
3. **authorizations** - تصاريح الاختبار
4. **scan_sessions** - جلسات فحص الويب
5. **vulnerabilities** - الثغرات المكتشفة
6. **phishing_campaigns** - حملات التصيد
7. **campaign_targets** - أهداف الحملات
8. **campaign_interactions** - تفاعلات الحملات
9. **network_test_sessions** - اختبارات الشبكات
10. **discovered_devices** - الأجهزة المكتشفة
11. **audit_logs** - سجلات التدقيق
12. **reports** - التقارير

## إعادة تعيين قاعدة البيانات

إذا أردت البدء من جديد:

```cmd
# حذف قاعدة البيانات
psql -U postgres -c "DROP DATABASE IF EXISTS penetration_testing_platform;"

# إعادة الإعداد
node setup-database.js
```

## الخطوات التالية

بعد إعداد قاعدة البيانات:

1. ✅ شغّل الخادم: `node server.js`
2. ✅ افتح المتصفح: http://localhost:3000
3. ✅ سجل الدخول: admin / password123
4. ✅ استكشف النظام مع البيانات الحقيقية!

## الدعم

إذا واجهت أي مشاكل:
1. تحقق من سجلات الخادم (console output)
2. تحقق من سجلات PostgreSQL
3. تأكد من صحة ملف `.env`
