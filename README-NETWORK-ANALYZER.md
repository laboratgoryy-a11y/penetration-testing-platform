# 🌐 Network Analyzer - نظام تحليل الشبكات

## 📖 نظرة عامة

نظام متكامل لتحليل واختبار أمان الشبكات اللاسلكية، مبني على تقنيات احترافية ويدعم:

- ✅ اكتشاف نقاط الوصول اللاسلكية (Access Points)
- ✅ تحليل أمان التشفير (WEP, WPA, WPA2, WPA3)
- ✅ اكتشاف الثغرات الأمنية
- ✅ تحليل حركة المرور (Traffic Analysis)
- ✅ اكتشاف الأجهزة المتصلة
- ✅ تقارير مفصلة قابلة للتحميل
- ✅ نظام تصاريح قانوني متكامل

---

## 🏗️ البنية التقنية

### Backend (Node.js + TypeScript)

```
src/
├── api/routes/network.routes.ts      # API Endpoints
├── services/
│   ├── NetworkAnalyzer.ts            # محرك التحليل الرئيسي
│   ├── RealNetworkScanner.ts         # الماسح الحقيقي (Linux)
│   └── NetworkTester.ts              # اختبارات الأمان
└── models/                           # نماذج البيانات
```

### Frontend (Vanilla JavaScript)

```
public/
├── js/
│   ├── network-analyzer-manager.js   # مدير الواجهة
│   └── api.js                        # عميل API
└── test-network-analyzer.html        # واجهة الاختبار
```

### Database (MySQL)

```sql
- network_test_sessions      # جلسات الفحص
- network_vulnerabilities    # الثغرات المكتشفة
- discovered_devices         # الأجهزة المكتشفة
- authorizations             # التصاريح القانونية
```

---

## 🚀 التثبيت والإعداد

### المتطلبات الأساسية

- Node.js 16+ و npm
- MySQL 8.0+
- (اختياري) أدوات Linux للفحص الحقيقي

### 1. تثبيت المشروع

```bash
# استنساخ المشروع
git clone <repository-url>
cd <project-directory>

# تثبيت الحزم
npm install
```

### 2. إعداد قاعدة البيانات

```bash
# إنشاء قاعدة البيانات
mysql -u root -p
CREATE DATABASE web_scanner;
exit;

# تشغيل السيرفر لإنشاء الجداول
npm start
```

### 3. تفعيل الفحص الحقيقي (اختياري)

في ملف `.env`:

```bash
# تفعيل الفحص الحقيقي
ENABLE_REAL_NETWORK_SCANNING=true

# تحديد واجهة الشبكة اللاسلكية
NETWORK_INTERFACE=wlan0

# مهلة الفحص (بالثواني)
NETWORK_SCAN_TIMEOUT=60
```

### 4. تثبيت أدوات Linux (للفحص الحقيقي)

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y wireless-tools iw nmap tcpdump aircrack-ng

# Fedora/RHEL
sudo dnf install -y wireless-tools iw nmap tcpdump aircrack-ng

# Arch Linux
sudo pacman -S wireless_tools iw nmap tcpdump aircrack-ng
```

---

## 🎯 الاستخدام السريع

### الطريقة 1: استخدام السكربت التلقائي (Windows)

```bash
تشغيل-تحليل-الشبكات.bat
```

هذا السكربت سيقوم بـ:
1. التحقق من الإعدادات
2. إنشاء تصريح تجريبي
3. عرض معرّف التصريح

### الطريقة 2: يدوياً

#### أ) إنشاء تصريح

```bash
# تشغيل سكربت إنشاء التصريح
node create-network-authorization.js

# سيظهر معرّف التصريح (UUID)
# انسخه للاستخدام لاحقاً
```

#### ب) فتح واجهة الاختبار

```
http://localhost:3000/test-network-analyzer.html
```

#### ج) بدء الفحص

1. الصق معرّف التصريح
2. اضغط "اكتشاف الشبكات"
3. اختر شبكة من القائمة
4. حدد نوع الفحص
5. اضغط "بدء الفحص"

---

## 📡 API Documentation

### 1. اكتشاف الشبكات

```http
POST /api/v1/network/discover
Authorization: Bearer <token>
Content-Type: application/json

{
  "authorizationId": "uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessPoints": [
      {
        "ssid": "MyNetwork",
        "bssid": "00:11:22:33:44:55",
        "channel": 6,
        "encryption": "WPA2",
        "signalStrength": -45,
        "vendor": "TP-Link"
      }
    ]
  }
}
```

### 2. بدء فحص جديد

```http
POST /api/v1/network/tests
Authorization: Bearer <token>
Content-Type: application/json

{
  "target": {
    "ssid": "MyNetwork",
    "bssid": "00:11:22:33:44:55",
    "authorizationId": "uuid-here"
  },
  "config": {
    "testTypes": ["TRAFFIC_ANALYSIS", "WPA_HANDSHAKE_CAPTURE"],
    "maxAttempts": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid-here",
    "status": "RUNNING",
    "startedAt": "2024-01-01T12:00:00Z"
  }
}
```

### 3. الحصول على النتائج

```http
GET /api/v1/network/tests/{sessionId}/results
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": {
      "sessionId": "uuid-here",
      "target": {
        "ssid": "MyNetwork",
        "bssid": "00:11:22:33:44:55"
      },
      "vulnerabilities": [
        {
          "type": "WEAK_PASSWORD",
          "severity": "CRITICAL",
          "description": "Network uses weak password",
          "remediation": "Use strong password"
        }
      ],
      "connectedDevices": [
        {
          "macAddress": "AA:BB:CC:DD:EE:FF",
          "ipAddress": "192.168.1.100",
          "hostname": "device-1",
          "vendor": "Apple Inc."
        }
      ],
      "trafficAnalysis": {
        "totalPackets": 5000,
        "protocols": {
          "HTTP": 100,
          "HTTPS": 800
        },
        "insecureProtocols": ["HTTP", "FTP"]
      }
    }
  }
}
```

### 4. تحميل التقرير

```http
GET /api/v1/network/tests/{sessionId}/report?format=PDF
Authorization: Bearer <token>
```

---

## 🔬 أنواع الفحوصات

### 1. TRAFFIC_ANALYSIS (تحليل حركة المرور)
- اكتشاف الأجهزة المتصلة
- تحليل البروتوكولات المستخدمة
- كشف البروتوكولات غير الآمنة
- تحليل أمان DNS

**الوقت المتوقع:** 2-5 دقائق

### 2. WEP_CRACK (كسر تشفير WEP)
- اختبار ضعف تشفير WEP
- محاكاة هجوم IV Collection

**الوقت المتوقع:** 5-10 دقائق

### 3. WPA_HANDSHAKE_CAPTURE (التقاط WPA Handshake)
- التقاط 4-way handshake
- اختبار قوة كلمة المرور
- هجوم القاموس (Dictionary Attack)

**الوقت المتوقع:** 10-30 دقيقة

### 4. WPS_ATTACK (هجوم WPS)
- كشف تفعيل WPS
- محاكاة Brute Force على WPS PIN

**الوقت المتوقع:** 5-15 دقيقة

### 5. EVIL_TWIN (نقطة وصول مزيفة)
- اختبار قابلية الشبكة لهجوم Evil Twin
- كشف اتصال العملاء بنقاط وصول مزيفة

**الوقت المتوقع:** 10-20 دقيقة

### 6. DEAUTH_ATTACK (هجوم قطع الاتصال)
- اختبار حماية Management Frame Protection
- محاكاة Deauthentication Attack

**الوقت المتوقع:** 2-5 دقائق

---

## 🛡️ الأمان والتصاريح

### نظام التصاريح

كل فحص يتطلب تصريحاً قانونياً صالحاً يحتوي على:

- **النوع:** NETWORK_ANALYSIS
- **النطاق:** NETWORK
- **القيمة:** SSID محدد أو * للجميع
- **تاريخ البدء والانتهاء**
- **الموافق:** اسم المسؤول

### التحقق من الصلاحيات

```typescript
// يتم التحقق تلقائياً قبل كل عملية
const authResult = await authorizationManager.validateAuthorization(
  userId,
  { type: 'NETWORK', value: ssid },
  'NETWORK_ANALYSIS'
);

if (!authResult.authorized) {
  throw new AuthorizationError('No valid authorization');
}
```

### Audit Logging

جميع العمليات يتم تسجيلها في جدول `audit_logs`:

- من قام بالعملية
- متى تمت العملية
- ما هي العملية
- النتيجة (نجاح/فشل)

---

## 🔧 استكشاف الأخطاء

### المشكلة: "No valid authorization found"

**الأسباب:**
- التصريح غير موجود
- التصريح منتهي الصلاحية
- النطاق لا يشمل الشبكة المستهدفة

**الحل:**
```bash
# إنشاء تصريح جديد
node create-network-authorization.js
```

### المشكلة: "Network scanning tools not found"

**الأسباب:**
- الأدوات غير مثبتة (Linux)
- الفحص الحقيقي معطّل

**الحل:**
```bash
# تثبيت الأدوات
sudo apt-get install wireless-tools iw nmap tcpdump

# أو تفعيل وضع المحاكاة
ENABLE_REAL_NETWORK_SCANNING=false
```

### المشكلة: "Permission denied"

**الأسباب:**
- الفحص الحقيقي يتطلب صلاحيات root

**الحل:**
```bash
# تشغيل بصلاحيات root (Linux فقط)
sudo npm start
```

### المشكلة: النتائج تظهر "0"

**الأسباب:**
1. لم يتم بدء أي فحص
2. الفحص لا يزال قيد التنفيذ
3. الفحص فشل

**الحل:**
```bash
# تحقق من حالة الفحص
curl http://localhost:3000/api/v1/network/tests/{sessionId}/status \
  -H "Authorization: Bearer <token>"

# تحقق من logs السيرفر
tail -f logs/app.log
```

---

## 📊 مثال على النتائج

### ثغرة حرجة (CRITICAL)

```json
{
  "type": "WEAK_PASSWORD",
  "severity": "CRITICAL",
  "description": "Network MyNetwork uses a weak password that was cracked using dictionary attack",
  "evidence": "WPA handshake captured and password cracked within 1000 attempts",
  "remediation": "Use a strong, complex password with minimum 16 characters including uppercase, lowercase, numbers, and special characters",
  "discoveredAt": "2024-01-01T12:30:00Z"
}
```

### ثغرة عالية (HIGH)

```json
{
  "type": "WPS_ENABLED",
  "severity": "HIGH",
  "description": "Network MyNetwork has WPS enabled and is vulnerable to brute force attacks",
  "evidence": "WPS is enabled and PIN can be brute forced in 4-10 hours",
  "remediation": "Disable WPS on the router. WPS has known vulnerabilities that allow attackers to recover the WPA password.",
  "discoveredAt": "2024-01-01T12:35:00Z"
}
```

---

## 🎓 أفضل الممارسات

### للمستخدمين

1. **احصل على تصريح كتابي** قبل فحص أي شبكة
2. **وثّق جميع العمليات** في نظام إدارة المشاريع
3. **أبلغ عن الثغرات** بشكل مسؤول
4. **احترم الخصوصية** ولا تفحص بيانات المستخدمين

### للمطورين

1. **استخدم TypeScript** للحصول على Type Safety
2. **اكتب اختبارات** لجميع الوظائف الحرجة
3. **سجّل جميع العمليات** في Audit Logs
4. **تحقق من التصاريح** قبل كل عملية
5. **استخدم Rate Limiting** لمنع إساءة الاستخدام

---

## 📚 المراجع والموارد

### الأدوات المستخدمة

- **iw/iwlist:** مسح الشبكات اللاسلكية
- **nmap:** اكتشاف الأجهزة والخدمات
- **tcpdump:** التقاط حزم الشبكة
- **aircrack-ng:** اختبار أمان الشبكات اللاسلكية

### مصادر التعلم

- [Wireless Security Testing](https://www.aircrack-ng.org/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

## ⚖️ القانون والأخلاقيات

### تحذير قانوني

⚠️ **استخدام هذا النظام على شبكات غير مصرح بها يعتبر جريمة في معظم الدول.**

القوانين ذات الصلة:
- Computer Fraud and Abuse Act (CFAA) - الولايات المتحدة
- Computer Misuse Act - المملكة المتحدة
- قوانين مكافحة الجرائم الإلكترونية - الدول العربية

### الاستخدام القانوني

✅ **يُسمح باستخدام النظام في:**
- شبكاتك الخاصة
- شبكات العملاء بتصريح كتابي
- بيئات الاختبار المعزولة
- الأبحاث الأكاديمية المصرح بها

❌ **يُمنع استخدام النظام في:**
- شبكات الآخرين بدون إذن
- الشبكات العامة
- أي شبكة بدون تصريح كتابي

---

## 🤝 المساهمة

نرحب بالمساهمات! الرجاء:

1. Fork المشروع
2. إنشاء branch للميزة الجديدة
3. Commit التغييرات
4. Push إلى Branch
5. فتح Pull Request

---

## 📄 الترخيص

هذا المشروع مرخص تحت [MIT License](LICENSE)

---

## 📞 الدعم

- **الوثائق:** راجع ملف `دليل-تفعيل-تحليل-الشبكات.md`
- **الدليل السريع:** راجع ملف `⚡-ابدأ-تحليل-الشبكات-الآن.md`
- **المشاكل:** افتح Issue على GitHub

---

## 🙏 شكر وتقدير

تم بناء هذا النظام باستخدام:
- Node.js & TypeScript
- Express.js
- MySQL
- Linux Networking Tools

**تم التطوير بواسطة Kiro AI Assistant** 🤖

---

**آخر تحديث:** 2024
**الإصدار:** 1.0.0
