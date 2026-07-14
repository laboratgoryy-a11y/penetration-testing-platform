# 🚀 تشغيل المنصة - Quick Start

## الخيار 1: التشغيل السريع (بدون قاعدة بيانات)

للاختبار السريع بدون إعداد قاعدة بيانات:

```cmd
node start-simple.js
```

ثم افتح: http://localhost:3000

**ملاحظة**: يستخدم بيانات وهمية ثابتة

---

## الخيار 2: التشغيل الكامل (مع PostgreSQL)

### الخطوة 1: تثبيت PostgreSQL

اختر أحد الطرق:

#### أ) Docker (الأسهل - موصى به)
```cmd
docker run --name postgres-pentest -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

#### ب) Windows Installer
```cmd
install-postgresql.bat
```

### الخطوة 2: إعداد قاعدة البيانات

```cmd
node setup-database.js
```

يجب أن ترى:
```
✅ تم إعداد قاعدة البيانات بنجاح!
📊 إحصائيات قاعدة البيانات:
   👥 المستخدمين: 3
   🔍 جلسات الفحص: 3
   🐛 الثغرات: 11
   ...
```

### الخطوة 3: تشغيل الخادم

```cmd
node server.js
```

يجب أن ترى:
```
✓ Server Started Successfully!
✅ Database connected successfully
Server running at: http://localhost:3000
```

### الخطوة 4: فتح المتصفح

افتح: http://localhost:3000

**تسجيل الدخول:**
- Username: `admin`
- Password: `password123`

---

## ✅ التحقق من النجاح

بعد تسجيل الدخول، يجب أن ترى:

### لوحة التحكم
- ✅ إحصائيات حقيقية من قاعدة البيانات
- ✅ رسم بياني لتوزيع الثغرات
- ✅ آخر تحديث يظهر الوقت الحالي

### فحص الويب
- ✅ 3 عمليات فحص (مكتملة، قيد التشغيل، قيد الانتظار)
- ✅ عند الضغط على "عرض" تظهر التفاصيل والثغرات
- ✅ زر "فحص جديد" يعمل

### حملات التصيد
- ✅ 2 حملة (نشطة ومكتملة)
- ✅ عرض الأهداف والتفاعلات

### تحليل الشبكات
- ✅ 2 اختبار شبكة
- ✅ عرض الأجهزة المكتشفة

---

## 🔧 استكشاف الأخطاء

### المشكلة: Database connection failed

**الحل:**
1. تأكد من تشغيل PostgreSQL:
   ```cmd
   # إذا كنت تستخدم Docker
   docker ps
   
   # يجب أن ترى postgres-pentest في القائمة
   ```

2. تحقق من ملف `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=penetration_testing_platform
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```

### المشكلة: Port 3000 already in use

**الحل:**
```cmd
# إيقاف العملية على المنفذ 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### المشكلة: Cannot find module 'pg'

**الحل:**
```cmd
npm install
```

---

## 📚 الملفات المهمة

- `start-simple.js` - خادم بسيط بدون قاعدة بيانات
- `server.js` - خادم كامل مع PostgreSQL
- `setup-database.js` - إعداد قاعدة البيانات
- `DATABASE_SETUP.md` - دليل مفصل
- `دليل-قاعدة-البيانات.md` - دليل بالعربية

---

## 🎯 الخطوات التالية

بعد التشغيل الناجح:

1. ✅ استكشف جميع الأقسام
2. ✅ جرب إنشاء فحص جديد
3. ✅ اعرض تفاصيل الثغرات
4. ✅ تحقق من السجلات

---

## 💡 نصائح

- استخدم `server.js` للتطوير الكامل
- استخدم `start-simple.js` للاختبار السريع
- احفظ كلمة مرور PostgreSQL
- استخدم Docker لسهولة الإدارة

---

## 🆘 الدعم

إذا واجهت مشاكل:
1. تحقق من console output
2. راجع `DATABASE_SETUP.md`
3. تأكد من تشغيل PostgreSQL
4. تحقق من ملف `.env`
