# 🔧 دليل تحويل النظام إلى MySQL (XAMPP)

## 📋 المتطلبات

1. **XAMPP** مثبت ويعمل
2. **MySQL** يعمل على المنفذ 3306
3. **Node.js** مثبت

## 🚀 خطوات التثبيت

### 1️⃣ تشغيل XAMPP

```bash
# افتح XAMPP Control Panel
# شغّل Apache
# شغّل MySQL
```

### 2️⃣ إنشاء قاعدة البيانات

**الطريقة 1: عبر phpMyAdmin**
1. افتح المتصفح على: `http://localhost/phpmyadmin`
2. اضغط على "SQL" في الأعلى
3. انسخ محتوى ملف `src/database/schema-mysql.sql`
4. الصق في نافذة SQL واضغط "Go"

**الطريقة 2: عبر سطر الأوامر**
```bash
# افتح CMD في مجلد XAMPP
cd C:\xampp\mysql\bin

# سجل الدخول لـ MySQL
mysql -u root -p

# أنشئ قاعدة البيانات
source D:\kiroproject\src\database\schema-mysql.sql
```

### 3️⃣ تثبيت مكتبة MySQL

```bash
npm install mysql2
```

### 4️⃣ تحديث ملف .env

أنشئ أو عدّل ملف `.env`:

```env
# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=penetration_testing_platform
DB_USER=root
DB_PASSWORD=

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 5️⃣ استخدام connection-mysql.ts

**الخيار 1: استبدال الملف الأصلي**
```bash
# احفظ نسخة احتياطية
copy src\database\connection.ts src\database\connection-postgres.ts.backup

# استبدل بنسخة MySQL
copy src\database\connection-mysql.ts src\database\connection.ts
```

**الخيار 2: تعديل imports في الملفات**
```typescript
// بدلاً من:
import { query, getClient } from './database/connection';

// استخدم:
import { query, getClient } from './database/connection-mysql';
```

### 6️⃣ تشغيل النظام

```bash
# إذا كنت تستخدم TypeScript
npm run build
npm start

# أو مباشرة
node server-complete.js
```

## ✅ التحقق من التثبيت

### اختبار الاتصال بقاعدة البيانات

```bash
# افتح MySQL من CMD
cd C:\xampp\mysql\bin
mysql -u root

# تحقق من قاعدة البيانات
USE penetration_testing_platform;
SHOW TABLES;
SELECT * FROM users;
```

يجب أن ترى:
- ✅ قاعدة البيانات `penetration_testing_platform`
- ✅ جميع الجداول (users, web_scans, vulnerabilities, إلخ)
- ✅ مستخدم admin افتراضي

### اختبار السيرفر

```bash
# شغّل السيرفر
node server-complete.js

# يجب أن ترى:
# ✓ MySQL connected successfully
# ✓ COMPLETE SERVER STARTED
```

افتح المتصفح على: `http://localhost:3001/login.html`

## 🔄 الفروقات بين PostgreSQL و MySQL

### تم التعامل معها تلقائياً:

| PostgreSQL | MySQL | الحل |
|-----------|-------|------|
| `$1, $2, $3` | `?, ?, ?` | تحويل تلقائي في `query()` |
| `SERIAL` | `AUTO_INCREMENT` | تم التعديل في schema |
| `BOOLEAN` | `TINYINT(1)` | تم التعديل في schema |
| `TEXT[]` | `JSON` | تم التعديل في schema |
| `TIMESTAMP WITH TIME ZONE` | `TIMESTAMP` | تم التعديل في schema |
| Redis للجلسات | In-memory Map | تم الاستبدال |

### الدوال المتوافقة:

```typescript
// ✅ نفس الواجهة البرمجية
await query('SELECT * FROM users WHERE id = ?', [userId]);
const client = await getClient();
await closeConnections();

// ✅ الجلسات (بدلاً من Redis)
await setSession(key, value, ttl);
const value = await getSession(key);
await deleteSession(key);
```

## 🐛 حل المشاكل الشائعة

### المشكلة: MySQL لا يعمل
```bash
# تحقق من حالة MySQL في XAMPP
# أو شغّله من CMD:
cd C:\xampp\mysql\bin
mysqld --console
```

### المشكلة: خطأ في الاتصال
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**الحل:**
1. تأكد من أن MySQL يعمل في XAMPP
2. تحقق من المنفذ 3306 غير مشغول
3. تحقق من ملف `.env`

### المشكلة: خطأ في كلمة المرور
```
Error: Access denied for user 'root'@'localhost'
```

**الحل:**
```bash
# إذا كان لديك كلمة مرور
DB_PASSWORD=your_password

# إذا لم يكن لديك كلمة مرور (افتراضي في XAMPP)
DB_PASSWORD=
```

### المشكلة: قاعدة البيانات غير موجودة
```
Error: Unknown database 'penetration_testing_platform'
```

**الحل:**
```sql
-- افتح MySQL
mysql -u root

-- أنشئ قاعدة البيانات
CREATE DATABASE penetration_testing_platform;
```

## 📊 مقارنة الأداء

| الميزة | SQLite | MySQL | PostgreSQL |
|--------|--------|-------|------------|
| **التثبيت** | ✅ بسيط جداً | ⚠️ يحتاج XAMPP | ⚠️ يحتاج تثبيت |
| **الأداء** | ✅ سريع للقراءة | ✅ متوازن | ✅ ممتاز |
| **التزامن** | ⚠️ محدود | ✅ جيد | ✅ ممتاز |
| **الحجم** | ✅ صغير | ⚠️ متوسط | ⚠️ كبير |
| **الاستخدام** | ✅ تطوير/صغير | ✅ متوسط | ✅ إنتاج |

## 💡 التوصيات

### للتطوير المحلي:
- ✅ استخدم **SQLite** (الحالي) - أبسط وأسرع
- ملف واحد `penetration_testing.db`
- لا يحتاج XAMPP

### للإنتاج الصغير:
- ✅ استخدم **MySQL** مع XAMPP
- سهل الإدارة عبر phpMyAdmin
- مناسب لعدة مستخدمين

### للإنتاج الكبير:
- ✅ استخدم **PostgreSQL**
- أداء أفضل
- ميزات متقدمة

## 🔗 روابط مفيدة

- [XAMPP Download](https://www.apachefriends.org/download.html)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [phpMyAdmin Guide](https://www.phpmyadmin.net/docs/)

## ✅ الخلاصة

تم إنشاء:
- ✅ `src/database/connection-mysql.ts` - اتصال MySQL
- ✅ `src/database/schema-mysql.sql` - Schema MySQL
- ✅ نفس الواجهة البرمجية (query, getClient, closeConnections)
- ✅ استبدال Redis بـ in-memory storage
- ✅ تحويل تلقائي من PostgreSQL syntax إلى MySQL

**النظام جاهز للعمل على XAMPP!** 🎉
