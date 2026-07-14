# دليل إعداد ماسح IP

## نظرة عامة

ميزة ماسح IP توفر واجهة متكاملة لفحص عناوين IP باستخدام أداة Nmap القوية.

## المتطلبات الأساسية

### 1. تثبيت Nmap

#### Windows
```bash
# تحميل من الموقع الرسمي
https://nmap.org/download.html

# أو باستخدام Chocolatey
choco install nmap
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install nmap
```

#### Linux (CentOS/RHEL)
```bash
sudo yum install nmap
```

#### macOS
```bash
brew install nmap
```

### 2. التحقق من التثبيت

```bash
nmap --version
```

يجب أن ترى إصدار Nmap المثبت.

## التكوين

### متغيرات البيئة

أضف المتغيرات التالية إلى ملف `.env`:

```env
# Nmap Configuration
NMAP_PATH=                          # مسار Nmap (اختياري، سيتم اكتشافه تلقائياً)
MAX_CONCURRENT_SCANS=5              # الحد الأقصى للفحوصات المتزامنة
SCAN_TIMEOUT=3600                   # مهلة الفحص بالثواني
NMAP_OUTPUT_DIR=./temp/nmap-scans   # مجلد المخرجات المؤقتة

# CVE Integration
CVE_INTEGRATION_ENABLED=false       # تفعيل التكامل مع CVE
NVD_API_URL=https://services.nvd.nist.gov/rest/json/cves/2.0
NVD_API_KEY=                        # مفتاح API لـ NVD (اختياري)
CVE_UPDATE_INTERVAL=24              # فترة التحديث بالساعات

# Scheduler
SCHEDULER_ENABLED=false             # تفعيل الجدولة
SCHEDULER_CHECK_INTERVAL=5          # فترة التحقق بالدقائق

# Notifications
NOTIFICATIONS_ENABLED=false         # تفعيل الإشعارات
EMAIL_NOTIFICATIONS_ENABLED=false
EMAIL_FROM=noreply@pentestplatform.com
SLACK_NOTIFICATIONS_ENABLED=false
SLACK_WEBHOOK_URL=

# Security
REQUIRE_AUTHORIZATION=true          # التحقق من التصاريح
MAX_IP_RANGE_SIZE=256              # الحد الأقصى لحجم نطاق IP
LOG_ALL_SCAN_ATTEMPTS=true         # تسجيل جميع المحاولات

# Storage
SCAN_RETENTION_DAYS=90             # الاحتفاظ بالنتائج بالأيام
AUTO_DELETE_OLD_SCANS=false        # حذف النتائج القديمة تلقائياً
```

## هيكل المشروع

```
src/
├── services/
│   └── ip-scanner/
│       ├── NmapService.ts              # الخدمة الرئيسية
│       ├── NmapCommandBuilder.ts       # بناء الأوامر
│       ├── NmapExecutor.ts             # تنفيذ الأوامر
│       ├── NmapResultParser.ts         # تحليل النتائج
│       ├── AuthorizationValidator.ts   # التحقق من التصاريح
│       └── index.ts
├── models/
│   └── IPScanSession.ts                # نماذج البيانات
├── config/
│   └── ipScanner.ts                    # التكوين
├── utils/
│   ├── ipScannerErrors.ts              # الأخطاء المخصصة
│   └── ipScannerHelpers.ts             # الدوال المساعدة
└── types/
    └── index.ts                         # الأنواع
```

## الاستخدام

### مثال بسيط

```typescript
import { NmapService } from './services/ip-scanner';

const nmapService = new NmapService();

// إعداد الهدف
const target = {
  type: 'SINGLE_IP',
  value: '192.168.1.1',
  authorizationId: 'auth-id-123'
};

// إعداد التكوين
const config = {
  scanType: 'QUICK_SCAN',
  timing: 'T4',
  serviceDetection: true,
  osDetection: false,
  vulnerabilityScan: false,
  stealthMode: false
};

// بدء الفحص
const session = await nmapService.startScan(userId, target, config);

// مراقبة التقدم
const status = await nmapService.getScanStatus(session.id);
console.log(`Progress: ${status.progress}%`);

// الحصول على النتائج
const results = await nmapService.getResults(session.id);
console.log(results);
```

## أنواع الفحص المدعومة

### 1. الفحص السريع (Quick Scan)
- يفحص أكثر 100 منفذ شيوعاً
- سريع (أقل من دقيقتين)
- مناسب للمسح الأولي

### 2. الفحص الشامل (Comprehensive Scan)
- يفحص جميع المنافذ (1-65535)
- يتضمن اكتشاف الخدمات ونظام التشغيل
- يستغرق وقتاً أطول

### 3. فحص المنافذ (Port Scan)
- يركز على اكتشاف المنافذ المفتوحة
- أنواع: TCP Connect، SYN، UDP، ACK

### 4. اكتشاف الخدمات (Service Detection)
- يحدد الخدمات التي تعمل على المنافذ
- يكتشف الإصدارات

### 5. اكتشاف نظام التشغيل (OS Detection)
- يحدد نظام التشغيل المستخدم
- يوفر نسبة الدقة

### 6. فحص الثغرات (Vulnerability Scan)
- يستخدم NSE scripts
- يكتشف الثغرات الشائعة

### 7. الفحص الخفي (Stealth Scan)
- يستخدم تقنيات لتجنب الكشف
- مناسب لاختبار أنظمة الكشف

## الأمان

### التحقق من التصاريح

جميع عمليات الفحص تتطلب تصريحاً صالحاً:

```typescript
// يجب أن يكون الهدف ضمن نطاق العمل المصرح به
const authorization = await authorizationService.getAuthorization(authId);
const isInScope = await authorizationValidator.isInScope(target, authId);

if (!isInScope) {
  throw new AuthorizationError('Target is out of scope');
}
```

### منع حقن الأوامر

جميع المدخلات يتم تنظيفها والتحقق منها:

```typescript
const builder = new NmapCommandBuilder();
const sanitized = builder.sanitizeInput(userInput);
```

## استكشاف الأخطاء

### Nmap غير موجود

```
Error: Nmap is not installed or not found in PATH
```

**الحل:** تأكد من تثبيت Nmap وإضافته إلى PATH.

### صلاحيات غير كافية

```
Error: Insufficient permissions to run Nmap
```

**الحل:** قد تحتاج بعض أنواع الفحص إلى صلاحيات المسؤول.

### الهدف غير قابل للوصول

```
Error: Target is unreachable
```

**الحل:** تحقق من الاتصال بالشبكة والجدار الناري.

## التطوير

### إضافة نوع فحص جديد

1. أضف النوع إلى `ScanType` في `types/index.ts`
2. أضف منطق البناء في `NmapCommandBuilder`
3. أضف معالجة النتائج في `NmapResultParser`

### إضافة NSE Script جديد

1. أضف Script إلى مجلد NSE
2. أضف التكوين في `ipScanner.ts`
3. أضف معالجة المخرجات في `NmapResultParser`

## الموارد

- [Nmap Official Documentation](https://nmap.org/book/man.html)
- [NSE Scripts Reference](https://nmap.org/nsedoc/)
- [CVE Database](https://nvd.nist.gov/)

## الدعم

للمساعدة والدعم، يرجى فتح issue في المستودع.
