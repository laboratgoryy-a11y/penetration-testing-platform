# 🔍 دليل Simple IP Scanner

## نظرة عامة

Simple IP Scanner هو بديل خفيف لـ Nmap يعمل بـ Node.js فقط بدون الحاجة لتثبيت برامج خارجية.

## الميزات

- ✅ لا يحتاج إلى Nmap أو Python
- ✅ يعمل على Windows/Linux/Mac
- ✅ فحص سريع للمنافذ الشائعة
- ✅ فحص شامل لجميع المنافذ
- ✅ كشف الخدمات الأساسية
- ✅ نتائج بصيغة JSON

## أنواع الفحص

### 1. Quick Scan (فحص سريع)
- يفحص 15 منفذ شائع فقط
- سريع جداً (2-5 ثوانٍ)
- مناسب للفحص الأولي

**المنافذ المفحوصة:**
```
21   - FTP
22   - SSH
23   - Telnet
25   - SMTP
53   - DNS
80   - HTTP
110  - POP3
143  - IMAP
443  - HTTPS
445  - SMB
3306 - MySQL
3389 - RDP
5432 - PostgreSQL
8080 - HTTP-Proxy
8443 - HTTPS-Alt
```

### 2. Full Scan (فحص كامل)
- يفحص المنافذ من 1 إلى 1000
- متوسط السرعة (30-60 ثانية)
- مناسب للفحص المتوسط

### 3. Comprehensive Scan (فحص شامل)
- يفحص المنافذ من 1 إلى 10000
- بطيء (5-10 دقائق)
- مناسب للفحص الشامل

## الاستخدام

### من سطر الأوامر

```bash
# فحص سريع
node simple-ip-scanner.js 192.168.1.1 quick

# فحص كامل
node simple-ip-scanner.js 192.168.1.1 full

# فحص شامل
node simple-ip-scanner.js 192.168.1.1 comprehensive
```

### من Node.js

```javascript
const SimpleIPScanner = require('./simple-ip-scanner.js');

const scanner = new SimpleIPScanner();

// فحص سريع
scanner.scanHost('192.168.1.1', 'quick')
    .then(results => {
        console.log('Results:', results);
    });
```

### من الواجهة

الفحص يعمل تلقائياً عند استخدام واجهة فحص IP.

## تنسيق النتائج

```json
{
  "success": true,
  "timestamp": "2024-01-28T10:30:00.000Z",
  "stats": {
    "total_hosts": 1,
    "hosts_up": 1,
    "total_ports": 15,
    "open_ports": 3,
    "scan_time": "2.45"
  },
  "hosts": [
    {
      "ip": "192.168.1.1",
      "hostname": "router.local",
      "state": "up",
      "protocols": ["tcp"]
    }
  ],
  "ports": [
    {
      "host": "192.168.1.1",
      "port": 80,
      "protocol": "tcp",
      "state": "open",
      "service": "HTTP"
    }
  ],
  "services": [
    {
      "host": "192.168.1.1",
      "port": 80,
      "name": "HTTP"
    }
  ]
}
```

## الاختبار

### اختبار محلي (localhost)

```bash
node test-simple-scanner.js
```

هذا سيختبر:
1. ✅ فحص localhost (127.0.0.1)
2. ✅ فحص عنوان خارجي (8.8.8.8)
3. ✅ فحص عنوان غير موجود

### اختبار من الواجهة

1. افتح صفحة فحص IP
2. أدخل عنوان IP (مثل: 127.0.0.1)
3. اختر نوع الفحص
4. انقر "بدء الفحص"

## الأمثلة

### مثال 1: فحص localhost

```bash
node simple-ip-scanner.js 127.0.0.1 quick
```

**النتيجة المتوقعة:**
```json
{
  "success": true,
  "stats": {
    "hosts_up": 1,
    "open_ports": 1-3
  },
  "ports": [
    {"port": 80, "service": "HTTP"},
    {"port": 443, "service": "HTTPS"}
  ]
}
```

### مثال 2: فحص router

```bash
node simple-ip-scanner.js 192.168.1.1 quick
```

**النتيجة المتوقعة:**
```json
{
  "success": true,
  "stats": {
    "hosts_up": 1,
    "open_ports": 1-2
  },
  "ports": [
    {"port": 80, "service": "HTTP"},
    {"port": 443, "service": "HTTPS"}
  ]
}
```

### مثال 3: فحص عنوان غير موجود

```bash
node simple-ip-scanner.js 192.168.255.255 quick
```

**النتيجة المتوقعة:**
```json
{
  "success": true,
  "stats": {
    "hosts_up": 0,
    "open_ports": 0
  },
  "message": "Host appears to be down or unreachable"
}
```

## القيود

### ما يمكنه فعله:
- ✅ فحص المنافذ المفتوحة
- ✅ كشف الخدمات الأساسية
- ✅ التحقق من توفر الهوست
- ✅ الحصول على hostname

### ما لا يمكنه فعله:
- ❌ كشف نظام التشغيل (OS Detection)
- ❌ كشف إصدارات الخدمات
- ❌ فحص الثغرات
- ❌ الفحص الخفي (Stealth Scan)
- ❌ فحص UDP

## المقارنة مع Nmap

| الميزة | Simple Scanner | Nmap |
|--------|---------------|------|
| التثبيت | لا يحتاج | يحتاج تثبيت |
| السرعة | سريع | متوسط-بطيء |
| كشف OS | ❌ | ✅ |
| كشف الإصدارات | ❌ | ✅ |
| فحص الثغرات | ❌ | ✅ |
| الفحص الخفي | ❌ | ✅ |
| سهولة الاستخدام | ✅ | متوسط |

## استكشاف الأخطاء

### المشكلة: لا يتم اكتشاف أي منافذ

**الأسباب المحتملة:**
1. الهوست محمي بجدار ناري
2. الهوست غير متصل
3. العنوان غير صحيح

**الحلول:**
```bash
# 1. اختبر localhost أولاً
node simple-ip-scanner.js 127.0.0.1 quick

# 2. اختبر عنوان معروف (Google DNS)
node simple-ip-scanner.js 8.8.8.8 quick

# 3. تحقق من الاتصال
ping 192.168.1.1
```

### المشكلة: الفحص بطيء جداً

**الحل:**
- استخدم "quick" بدلاً من "comprehensive"
- قلل عدد المنافذ المفحوصة

### المشكلة: خطأ في التنفيذ

**الحل:**
```bash
# تحقق من Node.js
node --version

# تحقق من الملف
node test-simple-scanner.js
```

## التكامل مع النظام

تم تحديث `server-sqlite.js` لاستخدام Simple IP Scanner تلقائياً:

```javascript
// في server-sqlite.js
const SimpleIPScanner = require('./simple-ip-scanner.js');
const scanner = new SimpleIPScanner();

const results = await scanner.scanHost(target, scanType);
```

## الخطوات التالية

1. ✅ اختبر Scanner محلياً
2. ✅ اختبر من الواجهة
3. ✅ جرب أنواع الفحص المختلفة
4. ✅ راجع النتائج

## الدعم

إذا واجهت مشاكل:
1. شغل `test-simple-scanner.js`
2. تحقق من Console في المتصفح
3. راجع سجلات الخادم
