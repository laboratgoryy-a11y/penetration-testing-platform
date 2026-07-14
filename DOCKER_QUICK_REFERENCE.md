# Docker Quick Reference
# مرجع سريع لأوامر Docker

## أوامر سريعة

### بدء البيئة
```bash
# تطوير
make dev
# أو
docker-compose -f docker-compose.dev.yml up -d

# إنتاج
make up
# أو
docker-compose up -d

# إنتاج مع Nginx
make prod-nginx
# أو
docker-compose --profile production up -d
```

### إيقاف البيئة
```bash
# تطوير
make dev-down
# أو
docker-compose -f docker-compose.dev.yml down

# إنتاج
make down
# أو
docker-compose down
```

### عرض السجلات
```bash
# جميع الخدمات
docker-compose logs -f

# خدمة معينة
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis
```

### الوصول إلى الحاويات
```bash
# التطبيق
docker-compose exec app sh

# قاعدة البيانات
docker-compose exec postgres psql -U postgres -d penetration_testing_platform

# Redis
docker-compose exec redis redis-cli
```

### إدارة قاعدة البيانات
```bash
# نسخ احتياطي
make db-backup
# أو
docker-compose exec postgres pg_dump -U postgres penetration_testing_platform > backup.sql

# استعادة
docker-compose exec -T postgres psql -U postgres penetration_testing_platform < backup.sql

# الوصول إلى shell
make db-shell
# أو
docker-compose exec postgres psql -U postgres -d penetration_testing_platform
```

### إعادة البناء
```bash
# إعادة بناء جميع الصور
make build
# أو
docker-compose build --no-cache

# إعادة بناء وتشغيل
docker-compose up -d --build
```

### التنظيف
```bash
# إيقاف وحذف الحاويات والأحجام
make clean
# أو
docker-compose down -v

# تنظيف موارد Docker
make prune
# أو
docker system prune -a --volumes
```

### المراقبة
```bash
# عرض حالة الحاويات
docker-compose ps

# عرض استخدام الموارد
docker stats

# فحص الصحة
make health
```

### تشغيل الاختبارات
```bash
# في Docker
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# تنظيف بعد الاختبار
docker-compose -f docker-compose.test.yml down -v
```

## المنافذ

### التطوير
- التطبيق: http://localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Debug: localhost:9229

### الإنتاج
- التطبيق: http://localhost:3000
- PostgreSQL: localhost:5432 (داخلي فقط)
- Redis: localhost:6379 (داخلي فقط)

### الإنتاج مع Nginx
- HTTP: http://localhost:80 (يعيد التوجيه إلى HTTPS)
- HTTPS: https://localhost:443

## المتغيرات البيئية المهمة

```env
# قاعدة البيانات
DB_HOST=postgres
DB_PORT=5432
DB_NAME=penetration_testing_platform
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# التطبيق
NODE_ENV=production
PORT=3000

# الأمان
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

## استكشاف الأخطاء

### الحاوية لا تبدأ
```bash
# عرض السجلات
docker-compose logs app

# إعادة البناء
docker-compose build --no-cache app
docker-compose up -d app
```

### لا يمكن الاتصال بقاعدة البيانات
```bash
# التحقق من PostgreSQL
docker-compose exec postgres pg_isready

# التحقق من الشبكة
docker-compose exec app ping postgres
```

### نفاد المساحة
```bash
# عرض استخدام المساحة
docker system df

# تنظيف
docker system prune -a --volumes
```

### إعادة تعيين كاملة
```bash
# إيقاف وحذف كل شيء
docker-compose down -v
docker-compose -f docker-compose.dev.yml down -v

# حذف الصور
docker rmi $(docker images -q pentest*)

# إعادة البناء والتشغيل
docker-compose build --no-cache
docker-compose up -d
```

## نصائح الأداء

1. **استخدام BuildKit**
   ```bash
   export DOCKER_BUILDKIT=1
   docker-compose build
   ```

2. **تخزين مؤقت للطبقات**
   - لا تستخدم `--no-cache` إلا عند الضرورة

3. **حجم الصورة**
   - استخدام Alpine images
   - Multi-stage builds
   - تنظيف cache بعد التثبيت

4. **الشبكات**
   - استخدام شبكة مخصصة
   - تجنب host networking في الإنتاج

## الأمان

1. **لا تستخدم كلمات مرور افتراضية**
2. **استخدم شهادات SSL صالحة**
3. **قم بتحديث الصور بانتظام**
4. **استخدم مستخدمين غير جذريين**
5. **قم بفحص الثغرات**: `docker scan pentest-app`

## الموارد

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)
