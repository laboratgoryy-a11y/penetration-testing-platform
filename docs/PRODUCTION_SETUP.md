# دليل إعداد بيئة الإنتاج

## نظرة عامة

هذا الدليل يوفر تعليمات شاملة لإعداد منصة اختبار الاختراق في بيئة الإنتاج مع التركيز على الأمان والأداء والموثوقية.

## المتطلبات الأساسية

### الأجهزة الموصى بها

**الحد الأدنى:**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 100 GB SSD
- Network: 100 Mbps

**الموصى به:**
- CPU: 8+ cores
- RAM: 16+ GB
- Storage: 500 GB SSD (RAID 10)
- Network: 1 Gbps

### البرمجيات المطلوبة

```bash
# نظام التشغيل
Ubuntu 22.04 LTS أو أحدث

# Node.js
Node.js 18.x أو أحدث

# قاعدة البيانات
PostgreSQL 14.x أو أحدث

# التخزين المؤقت
Redis 6.x أو أحدث

# خادم الويب (اختياري)
Nginx 1.18 أو أحدث
```

## إعداد قاعدة البيانات للإنتاج

### 1. تثبيت PostgreSQL

```bash
# تحديث النظام
sudo apt update && sudo apt upgrade -y

# تثبيت PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# بدء الخدمة
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. إنشاء قاعدة البيانات والمستخدم

```bash
# الدخول إلى PostgreSQL
sudo -u postgres psql

# إنشاء المستخدم
CREATE USER pentest_user WITH PASSWORD 'strong_password_here';

# إنشاء قاعدة البيانات
CREATE DATABASE pentest_db OWNER pentest_user;

# منح الصلاحيات
GRANT ALL PRIVILEGES ON DATABASE pentest_db TO pentest_user;

# الخروج
\q
```

### 3. تكوين PostgreSQL للإنتاج

```bash
# تحرير ملف التكوين
sudo nano /etc/postgresql/14/main/postgresql.conf
```

**الإعدادات الموصى بها:**
```conf
# الاتصالات
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10485kB
min_wal_size = 1GB
max_wal_size = 4GB

# التسجيل
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_duration = off
log_lock_waits = on
log_statement = 'ddl'
log_temp_files = 0

# الأمان
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'
```

### 4. تفعيل التشفير

```bash
# إنشاء شهادة SSL
sudo openssl req -new -x509 -days 365 -nodes \
  -text -out /etc/ssl/certs/server.crt \
  -keyout /etc/ssl/private/server.key \
  -subj "/CN=pentest-db.example.com"

# تعيين الصلاحيات
sudo chmod 600 /etc/ssl/private/server.key
sudo chown postgres:postgres /etc/ssl/private/server.key
sudo chown postgres:postgres /etc/ssl/certs/server.crt
```

### 5. إعداد النسخ الاحتياطية التلقائية

```bash
# إنشاء سكريبت النسخ الاحتياطي
sudo nano /usr/local/bin/backup-pentest-db.sh
```

```bash
#!/bin/bash

# إعدادات
DB_NAME="pentest_db"
DB_USER="pentest_user"
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"
RETENTION_DAYS=30

# إنشاء مجلد النسخ الاحتياطية
mkdir -p $BACKUP_DIR

# إنشاء النسخة الاحتياطية
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_FILE

# حذف النسخ القديمة
find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# تسجيل النتيجة
if [ $? -eq 0 ]; then
    echo "$(date): Backup successful - $BACKUP_FILE" >> /var/log/db-backup.log
else
    echo "$(date): Backup failed" >> /var/log/db-backup.log
    exit 1
fi
```

```bash
# تعيين الصلاحيات
sudo chmod +x /usr/local/bin/backup-pentest-db.sh

# إضافة إلى cron (يومياً الساعة 2 صباحاً)
sudo crontab -e
```

```cron
0 2 * * * /usr/local/bin/backup-pentest-db.sh
```

## إعداد Redis

### 1. تثبيت Redis

```bash
# تثبيت Redis
sudo apt install redis-server -y

# بدء الخدمة
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 2. تكوين Redis للإنتاج

```bash
# تحرير ملف التكوين
sudo nano /etc/redis/redis.conf
```

**الإعدادات الموصى بها:**
```conf
# الأمان
bind 127.0.0.1
protected-mode yes
requirepass your_strong_redis_password

# الأداء
maxmemory 2gb
maxmemory-policy allkeys-lru

# الاستمرارية
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec

# التسجيل
loglevel notice
logfile /var/log/redis/redis-server.log
```

```bash
# إعادة تشغيل Redis
sudo systemctl restart redis-server
```

## إعداد التطبيق

### 1. إنشاء مستخدم النظام

```bash
# إنشاء مستخدم للتطبيق
sudo useradd -r -s /bin/bash -d /opt/pentest-platform pentest

# إنشاء المجلدات
sudo mkdir -p /opt/pentest-platform
sudo chown pentest:pentest /opt/pentest-platform
```

### 2. نشر التطبيق

```bash
# التبديل للمستخدم
sudo su - pentest

# استنساخ المشروع
git clone https://github.com/your-org/penetration-testing-platform.git /opt/pentest-platform
cd /opt/pentest-platform

# تثبيت التبعيات
npm ci --production

# بناء التطبيق
npm run build
```

### 3. إعداد متغيرات البيئة

```bash
# إنشاء ملف البيئة
nano /opt/pentest-platform/.env.production
```

```env
# البيئة
NODE_ENV=production
PORT=3000

# قاعدة البيانات
DATABASE_URL=postgresql://pentest_user:strong_password@localhost:5432/pentest_db
DATABASE_SSL=true
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Redis
REDIS_URL=redis://:your_strong_redis_password@localhost:6379
REDIS_TLS=false

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d

# التشفير
ENCRYPTION_KEY=your-32-character-encryption-key-here
ENCRYPTION_ALGORITHM=aes-256-gcm

# إدارة المفاتيح (AWS KMS أو HashiCorp Vault)
KMS_PROVIDER=aws
AWS_KMS_KEY_ID=your-kms-key-id
AWS_REGION=us-east-1

# البريد الإلكتروني
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER=noreply@example.com
SMTP_PASSWORD=smtp_password

# التسجيل
LOG_LEVEL=info
LOG_FILE=/var/log/pentest-platform/app.log

# الأمان
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX=100
SESSION_TIMEOUT=30m
MFA_REQUIRED=true

# المراقبة
METRICS_ENABLED=true
METRICS_PORT=9090
```

### 4. إنشاء خدمة systemd

```bash
# إنشاء ملف الخدمة
sudo nano /etc/systemd/system/pentest-platform.service
```

```ini
[Unit]
Description=Penetration Testing Platform
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=pentest
Group=pentest
WorkingDirectory=/opt/pentest-platform
Environment=NODE_ENV=production
EnvironmentFile=/opt/pentest-platform/.env.production
ExecStart=/usr/bin/node /opt/pentest-platform/dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=pentest-platform

# الأمان
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/pentest-platform/logs /opt/pentest-platform/uploads

[Install]
WantedBy=multi-user.target
```

```bash
# تفعيل وبدء الخدمة
sudo systemctl daemon-reload
sudo systemctl enable pentest-platform
sudo systemctl start pentest-platform

# التحقق من الحالة
sudo systemctl status pentest-platform
```

## إعداد Nginx كـ Reverse Proxy

### 1. تثبيت Nginx

```bash
sudo apt install nginx -y
```

### 2. تكوين Nginx

```bash
sudo nano /etc/nginx/sites-available/pentest-platform
```

```nginx
# Upstream
u