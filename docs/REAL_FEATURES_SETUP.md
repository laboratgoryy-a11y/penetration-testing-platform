# دليل إعداد الوظائف الحقيقية

هذا الدليل يشرح كيفية إعداد وتفعيل الوظائف الحقيقية (غير المحاكاة) في منصة اختبار الاختراق.

## 📧 إعداد خدمة البريد الإلكتروني

### الخيار 1: SMTP (موصى به للتطوير)

#### Gmail
```bash
# في ملف .env
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

**ملاحظة**: يجب إنشاء App Password من إعدادات حساب Google:
1. اذهب إلى https://myaccount.google.com/security
2. فعّل المصادقة الثنائية
3. اذهب إلى "App passwords"
4. أنشئ كلمة مرور جديدة للتطبيق

#### SMTP عام
```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_username
SMTP_PASSWORD=your_password
```

### الخيار 2: SendGrid (موصى به للإنتاج)

```bash
# تثبيت المكتبة
npm install @sendgrid/mail

# في ملف .env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
```

**الحصول على API Key**:
1. سجل في https://sendgrid.com
2. اذهب إلى Settings > API Keys
3. أنشئ API Key جديد مع صلاحيات "Mail Send"

### الخيار 3: AWS SES (للمؤسسات)

```bash
# تثبيت المكتبة
npm install aws-sdk

# في ملف .env
EMAIL_PROVIDER=ses
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

**الإعداد**:
1. سجل في AWS وفعّل SES
2. تحقق من عناوين البريد الإلكتروني
3. اطلب الخروج من Sandbox mode للإنتاج
4. أنشئ IAM user مع صلاحيات SES

### الخيار 4: Mailgun

```bash
# تثبيت المكتبة
npm install mailgun.js form-data

# في ملف .env
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=your_api_key
MAILGUN_DOMAIN=your_domain
```

### اختبار خدمة البريد الإلكتروني

```typescript
import { EmailService } from './src/services/EmailService';
import { config } from './src/config';

const emailService = new EmailService({
  provider: config.email.provider,
  smtp: config.email.smtp,
  // ... other configs
});

// اختبار الاتصال
const isValid = await emailService.verifyConnection();
console.log('Email service valid:', isValid);

// إرسال بريد تجريبي
await emailService.send(
  'test@example.com',
  'Test Email',
  '<h1>Hello from Penetration Testing Platform</h1>',
  { name: 'Security Team', email: 'security@example.com' }
);
```

## 🌐 إعداد ماسح الشبكات الحقيقي

### المتطلبات

يتطلب ماسح الشبكات الحقيقي تثبيت أدوات Linux التالية:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y iw wireless-tools aircrack-ng nmap tcpdump

# CentOS/RHEL
sudo yum install -y iw wireless-tools aircrack-ng nmap tcpdump

# Arch Linux
sudo pacman -S iw wireless_tools aircrack-ng nmap tcpdump
```

### التحقق من التثبيت

```bash
# التحقق من الأدوات
which iw
which iwlist
which nmap
which tcpdump

# التحقق من واجهات الشبكة اللاسلكية
iw dev
iwconfig
```

### التكوين

```bash
# في ملف .env
NETWORK_INTERFACE=wlan0  # اسم واجهة الشبكة اللاسلكية
NETWORK_SCAN_TIMEOUT=60
ENABLE_REAL_NETWORK_SCANNING=true
```

### الصلاحيات المطلوبة

يتطلب الماسح الحقيقي صلاحيات root:

```bash
# تشغيل التطبيق مع sudo
sudo npm start

# أو إعطاء صلاحيات للأدوات
sudo setcap cap_net_raw,cap_net_admin=eip $(which nmap)
sudo setcap cap_net_raw,cap_net_admin=eip $(which tcpdump)
```

### اختبار الماسح

```typescript
import { RealNetworkScanner } from './src/services/RealNetworkScanner';

const scanner = new RealNetworkScanner('wlan0');

// التحقق من المتطلبات
const requirements = await scanner.checkRequirements();
console.log('Requirements:', requirements);

// فحص نقاط الوصول
const accessPoints = await scanner.scanAccessPoints();
console.log('Access Points:', accessPoints);

// اكتشاف الأجهزة
const devices = await scanner.discoverDevices('192.168.1.0/24');
console.log('Devices:', devices);
```

### ملاحظات أمنية مهمة

⚠️ **تحذير**: استخدام ماسح الشبكات الحقيقي يتطلب:

1. **تصريح كتابي** من مالك الشبكة
2. **بيئة معزولة** للاختبار
3. **عدم استخدامه** على شبكات عامة أو غير مصرح بها
4. **الامتثال** للقوانين المحلية

## 🔧 إعداد CVE Service

### الحصول على NVD API Key

```bash
# التسجيل في NVD
# https://nvd.nist.gov/developers/request-an-api-key

# في ملف .env
NVD_API_KEY=your_nvd_api_key
```

**ملاحظة**: بدون API key، سيكون معدل الطلبات محدوداً (5 طلبات/30 ثانية).
مع API key: 50 طلب/30 ثانية.

### تحديث قاعدة بيانات CVE

```typescript
import { CVEService } from './src/services/CVEService';
import { Pool } from 'pg';

const pool = new Pool(/* config */);
const cveService = new CVEService(pool, process.env.NVD_API_KEY);

// تحديث قاعدة البيانات (آخر 7 أيام)
await cveService.updateCVEDatabase(7);

// البحث عن CVEs
const cves = await cveService.searchCVEs('apache', '2.4.41');
console.log('CVEs found:', cves);
```

## 🐳 إعداد Docker

### Dockerfile مع الأدوات المطلوبة

```dockerfile
FROM node:18-alpine

# تثبيت الأدوات المطلوبة
RUN apk add --no-cache \
    wireless-tools \
    nmap \
    tcpdump \
    aircrack-ng \
    sudo

# نسخ التطبيق
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# تشغيل التطبيق
CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - EMAIL_PROVIDER=smtp
      - ENABLE_REAL_NETWORK_SCANNING=false
    volumes:
      - ./.env:/app/.env
    depends_on:
      - postgres
      - redis
    # صلاحيات الشبكة للماسح
    cap_add:
      - NET_ADMIN
      - NET_RAW
    network_mode: host  # للوصول لواجهات الشبكة

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: penetration_testing_platform
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 🧪 الاختبار

### اختبار البريد الإلكتروني

```bash
# إنشاء ملف test-email.ts
npm run test:email
```

### اختبار ماسح الشبكات

```bash
# يتطلب صلاحيات root
sudo npm run test:network
```

### اختبار CVE Service

```bash
npm run test:cve
```

## 📊 المراقبة والسجلات

### تفعيل السجلات التفصيلية

```bash
# في ملف .env
LOG_LEVEL=debug
```

### مراقبة إرسال البريد الإلكتروني

```typescript
// السجلات تظهر تلقائياً
// [INFO] Email sent successfully { to: 'user@example.com', subject: '...' }
// [ERROR] Failed to send email { error: '...' }
```

### مراقبة فحص الشبكات

```typescript
// السجلات تظهر تلقائياً
// [INFO] Using real network scanner
// [INFO] Access points found: 5
// [WARN] Some network scanning tools are missing
```

## 🔒 الأمان

### أفضل الممارسات

1. **لا تشارك** ملف .env أبداً
2. **استخدم** متغيرات بيئة في الإنتاج
3. **قم بتدوير** API keys بانتظام
4. **راقب** استخدام الخدمات الخارجية
5. **احتفظ** بنسخ احتياطية من التكوينات

### تشفير البيانات الحساسة

```bash
# استخدم مفتاح تشفير قوي
ENCRYPTION_KEY=$(openssl rand -base64 32)
```

### حماية API Keys

```bash
# استخدم أدوات إدارة الأسرار
# - AWS Secrets Manager
# - HashiCorp Vault
# - Azure Key Vault
```

## 🚀 النشر في الإنتاج

### قائمة التحقق

- [ ] تكوين خدمة البريد الإلكتروني
- [ ] تحديث جميع API keys
- [ ] تفعيل HTTPS
- [ ] تكوين النسخ الاحتياطية
- [ ] إعداد المراقبة
- [ ] اختبار جميع الوظائف
- [ ] مراجعة السجلات
- [ ] تحديث الوثائق

### متغيرات البيئة للإنتاج

```bash
NODE_ENV=production
EMAIL_PROVIDER=sendgrid  # أو ses
ENABLE_REAL_NETWORK_SCANNING=false  # إلا في بيئة معزولة
LOG_LEVEL=info
```

## 📞 الدعم

إذا واجهت مشاكل:

1. تحقق من السجلات
2. راجع التكوينات
3. تأكد من تثبيت جميع المتطلبات
4. اختبر الاتصال بالخدمات الخارجية

## 📚 موارد إضافية

- [Nodemailer Documentation](https://nodemailer.com/)
- [SendGrid API](https://docs.sendgrid.com/)
- [AWS SES Documentation](https://docs.aws.amazon.com/ses/)
- [Nmap Documentation](https://nmap.org/book/man.html)
- [NVD API Documentation](https://nvd.nist.gov/developers)
