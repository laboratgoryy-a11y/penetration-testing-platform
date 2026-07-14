# Docker Setup Guide
# دليل إعداد Docker

## نظرة عامة

يوفر هذا المشروع إعدادات Docker كاملة لتشغيل منصة اختبار الاختراق والأمن الهجومي في بيئات مختلفة.

## المتطلبات الأساسية

- Docker Engine 20.10 أو أحدث
- Docker Compose 2.0 أو أحدث
- 4GB RAM كحد أدنى (8GB موصى به)
- 10GB مساحة تخزين متاحة

## الملفات المتوفرة

### ملفات الإنتاج
- `Dockerfile` - صورة Docker للإنتاج (multi-stage build)
- `docker-compose.yml` - إعداد البيئة الكاملة للإنتاج
- `nginx/nginx.conf` - إعدادات Nginx reverse proxy

### ملفات التطوير
- `Dockerfile.dev` - صورة Docker للتطوير مع hot reload
- `docker-compose.dev.yml` - إعداد بيئة التطوير

### ملفات أخرى
- `.dockerignore` - ملفات يتم استبعادها من صورة Docker

## البدء السريع

### 1. بيئة التطوير

```bash
# نسخ ملف البيئة
cp .env.example .env

# تشغيل البيئة الكاملة
docker-compose -f docker-compose.dev.yml up -d

# عرض السجلات
docker-compose -f docker-compose.dev.yml logs -f app

# إيقاف البيئة
docker-compose -f docker-compose.dev.yml down
```

التطبيق سيكون متاحاً على: http://localhost:3000

### 2. بيئة الإنتاج

```bash
# تعديل ملف .env بالقيم الإنتاجية
nano .env

# بناء وتشغيل البيئة
docker-compose up -d

# عرض حالة الخدمات
docker-compose ps

# عرض السجلات
docker-compose logs -f

# إيقاف البيئة
docker-compose down
```

### 3. بيئة الإنتاج مع Nginx

```bash
# إنشاء شهادات SSL (للاختبار)
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem

# تشغيل مع Nginx
docker-compose --profile production up -d

# التطبيق سيكون متاحاً على:
# HTTP: http://localhost (يعيد التوجيه إلى HTTPS)
# HTTPS: https://localhost
```

## المتغيرات البيئية

### قاعدة البيانات
```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=penetration_testing_platform
DB_USER=postgres
DB_PASSWORD=your_secure_password
```

### Redis
```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### التطبيق
```env
NODE_ENV=production
PORT=3000
API_VERSION=v1
```

### الأمان
```env
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=your_encryption_key_change_this_in_production
```

## الأوامر المفيدة

### إدارة الحاويات

```bash
# بناء الصور من جديد
docker-compose build --no-cache

# إعادة تشغيل خدمة معينة
docker-compose restart app

# عرض استخدام الموارد
docker stats

# تنظيف الموارد غير المستخدمة
docker system prune -a
```

### الوصول إلى الحاويات

```bash
# الوصول إلى حاوية التطبيق
docker-compose exec app sh

# الوصول إلى قاعدة البيانات
docker-compose exec postgres psql -U postgres -d penetration_testing_platform

# الوصول إلى Redis
docker-compose exec redis redis-cli
```

### النسخ الاحتياطي والاستعادة

```bash
# نسخ احتياطي لقاعدة البيانات
docker-compose exec postgres pg_dump -U postgres penetration_testing_platform > backup.sql

# استعادة قاعدة البيانات
docker-compose exec -T postgres psql -U postgres penetration_testing_platform < backup.sql

# نسخ احتياطي للبيانات
docker run --rm -v pentest_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_backup.tar.gz /data
```

## البنية المعمارية

```
┌─────────────────────────────────────────────┐
│              Nginx (Optional)               │
│         Reverse Proxy + SSL/TLS             │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           Application Container             │
│         Node.js + TypeScript                │
│              Port: 3000                     │
└─────────┬───────────────────┬───────────────┘
          │                   │
┌─────────▼─────────┐  ┌──────▼──────────────┐
│    PostgreSQL     │  │       Redis         │
│   Port: 5432      │  │     Port: 6379      │
└───────────────────┘  └─────────────────────┘
```

## الأحجام (Volumes)

- `postgres_data` - بيانات قاعدة البيانات
- `redis_data` - بيانات Redis
- `app_data` - ملفات التطبيق (تقارير، رفوعات)
- `nginx_logs` - سجلات Nginx

## الشبكات

- `pentest-network` - شبكة داخلية للاتصال بين الحاويات (172.20.0.0/16)

## الأمان

### أفضل الممارسات

1. **تغيير كلمات المرور الافتراضية**
   - قم بتغيير جميع كلمات المرور في ملف `.env`
   - استخدم كلمات مرور قوية ومعقدة

2. **استخدام المستخدمين غير الجذريين**
   - جميع الحاويات تعمل بمستخدمين غير جذريين

3. **تحديثات الأمان**
   - قم بتحديث الصور بانتظام: `docker-compose pull`

4. **شهادات SSL**
   - استخدم شهادات SSL صالحة في الإنتاج
   - يمكن استخدام Let's Encrypt مع Certbot

5. **جدار الحماية**
   - قم بتكوين جدار الحماية للسماح فقط بالمنافذ الضرورية

## المراقبة والصحة

### فحوصات الصحة

جميع الخدمات تحتوي على فحوصات صحة تلقائية:

```bash
# عرض حالة الصحة
docker-compose ps
```

### السجلات

```bash
# عرض جميع السجلات
docker-compose logs

# عرض سجلات خدمة معينة
docker-compose logs app

# متابعة السجلات في الوقت الفعلي
docker-compose logs -f app

# عرض آخر 100 سطر
docker-compose logs --tail=100 app
```

## استكشاف الأخطاء

### المشكلة: الحاوية لا تبدأ

```bash
# عرض السجلات
docker-compose logs app

# التحقق من حالة الحاوية
docker-compose ps

# إعادة بناء الصورة
docker-compose build --no-cache app
docker-compose up -d app
```

### المشكلة: لا يمكن الاتصال بقاعدة البيانات

```bash
# التحقق من أن PostgreSQL يعمل
docker-compose exec postgres pg_isready

# التحقق من الاتصال
docker-compose exec app ping postgres
```

### المشكلة: نفاد المساحة

```bash
# تنظيف الموارد غير المستخدمة
docker system prune -a --volumes

# عرض استخدام المساحة
docker system df
```

## الإنتاج

### قائمة التحقق قبل النشر

- [ ] تغيير جميع كلمات المرور الافتراضية
- [ ] تكوين شهادات SSL صالحة
- [ ] تفعيل جدار الحماية
- [ ] تكوين النسخ الاحتياطي التلقائي
- [ ] إعداد المراقبة والتنبيهات
- [ ] مراجعة إعدادات الأمان
- [ ] اختبار خطة استعادة الكوارث

### التوسع الأفقي

لتوسيع التطبيق:

```bash
# تشغيل نسخ متعددة من التطبيق
docker-compose up -d --scale app=3
```

## الدعم

للمزيد من المعلومات، راجع:
- [وثائق Docker](https://docs.docker.com/)
- [وثائق Docker Compose](https://docs.docker.com/compose/)
- [دليل المستخدم](./docs/USER_GUIDE_QUICK_START.md)

## الترخيص

هذا المشروع مرخص بموجب رخصة ISC.

---

**⚠️ تحذير أمني**: هذه المنصة مصممة حصرياً للاستخدام القانوني والأخلاقي في اختبار الاختراق المصرح به. يجب الحصول على تصريح كتابي صريح قبل إجراء أي اختبار.
