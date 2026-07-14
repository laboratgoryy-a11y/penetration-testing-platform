# 🚀 دليل البدء السريع - نسخة MySQL

## ✅ المتطلبات الأساسية

1. **XAMPP** مثبت مع تشغيل MySQL
2. **Node.js** مثبت (الإصدار 14 أو أحدث)
3. حزم **npm** مثبتة

## 📋 خطوات الإعداد

### الخطوة 1: تشغيل MySQL في XAMPP

1. افتح لوحة تحكم XAMPP
2. اضغط "Start" بجانب MySQL
3. تأكد من أن MySQL يعمل على المنفذ 3306

### الخطوة 2: إنشاء قاعدة البيانات

افتح phpMyAdmin (http://localhost/phpmyadmin) ونفذ:

```sql
CREATE DATABASE IF NOT EXISTS web_scanner 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

أو استخدم سطر أوامر MySQL:

```bash
mysql -u root -p
CREATE DATABASE web_scanner;
exit;
```

### الخطوة 3: استيراد هيكل قاعدة البيانات

في phpMyAdmin:
1. اختر قاعدة البيانات `web_scanner`
2. اضغط على تبويب "Import"
3. اختر الملف: `src/database/schema.sql`
4. اضغط "Go"

أو استخدم سطر الأوامر:

```bash
mysql -u root web_scanner < src/database/schema.sql
```

### الخطوة 4: التحقق من الإعدادات

تأكد من أن ملف `.env` يحتوي على:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=web_scanner
DB_USER=root
DB_PASSWORD=
```

### الخطوة 5: تشغيل الخادم

**الخيار أ: استخدام ملف Batch (موصى به)**
```bash
start-mysql-server.bat
```

**الخيار ب: استخدام Node مباشرة**
```bash
node server-mysql.js
```

### الخطوة 6: الوصول إلى التطبيق

افتح المتصفح واذهب إلى:
- **صفحة تسجيل الدخول**: http://localhost:3001/login.html
- **لوحة التحكم**: http://localhost:3001/index.html

## 🔐 بيانات تسجيل الدخول

للأغراض التجريبية، أي اسم مستخدم/كلمة مرور ستعمل:
- اسم المستخدم: `admin` (أو أي اسم مستخدم)
- كلمة المرور: `password` (أو أي كلمة مرور)

## ✨ الميزات المتاحة

بعد تسجيل الدخول، يمكنك الوصول إلى:

1. **📊 لوحة التحكم** - نظرة عامة على جميع الأنشطة
2. **🔍 فاحص الويب** - فحص المواقع للثغرات الأمنية
3. **🌐 تحليل الشبكة** - تحليل أمان الشبكة
4. **🎣 حملات التصيد** - إنشاء وإدارة اختبارات التصيد
5. **📄 التقارير** - إنشاء تقارير الأمان
6. **🔑 التصاريح** - إدارة تصاريح الاختبار

## 🔧 حل المشاكل

### خطأ: "Cannot connect to MySQL"

**الحل:**
1. تأكد من تشغيل MySQL في XAMPP
2. تحقق من أن المنفذ 3306 غير محظور
3. تحقق من أن اسم قاعدة البيانات هو `web_scanner`
4. راجع إعدادات ملف `.env`

### خطأ: "Database does not exist"

**الحل:**
```sql
CREATE DATABASE web_scanner;
```

### خطأ: "Table doesn't exist"

**الحل:**
استورد ملف الهيكل:
```bash
mysql -u root web_scanner < src/database/schema.sql
```

### خطأ: "Port 3001 already in use"

**الحل:**
1. أغلق أي عمليات Node.js أخرى
2. أو غير PORT في ملف `.env`:
```env
PORT=3002
```

## 📝 الجداول المنشأة في قاعدة البيانات

يقوم الهيكل بإنشاء 17 جدول:
- `users` - حسابات المستخدمين
- `sessions` - جلسات المستخدمين
- `roles` - أدوار المستخدمين
- `permissions` - صلاحيات النظام
- `authorizations` - تصاريح الاختبار
- `scan_sessions` - جلسات فحص الويب
- `vulnerabilities` - الثغرات المكتشفة
- `phishing_campaigns` - حملات اختبار التصيد
- `campaign_targets` - مستلمي الحملة
- `campaign_interactions` - تفاعلات المستخدمين
- `network_test_sessions` - جلسات اختبار الشبكة
- `network_vulnerabilities` - ثغرات الشبكة
- `discovered_devices` - الأجهزة المكتشفة في الشبكة
- `audit_logs` - سجلات التدقيق
- `reports` - التقارير المنشأة
- والمزيد...

## 🎯 الخطوات التالية

1. ✅ تسجيل الدخول إلى النظام
2. ✅ إنشاء تصريح
3. ✅ تشغيل أول فحص ويب
4. ✅ تحليل أمان الشبكة
5. ✅ إنشاء التقارير

## 📞 تحتاج مساعدة؟

إذا واجهت أي مشاكل:
1. تحقق من رسائل الخطأ في وحدة تحكم الخادم
2. تحقق من تشغيل MySQL في XAMPP
3. راجع إعدادات الاتصال بقاعدة البيانات في `.env`
4. تأكد من تثبيت جميع حزم npm: `npm install`

---

**حالة النظام:**
- ✅ قاعدة البيانات: MySQL (XAMPP)
- ✅ اسم قاعدة البيانات: web_scanner
- ✅ منفذ الخادم: 3001
- ✅ جميع الميزات: مفعلة
