# دليل استخدام قسم تحليل الشبكات

## نظرة عامة

قسم تحليل الشبكات هو نظام حقيقي وفعّال لاختبار أمان الشبكات اللاسلكية. يستخدم تقنيات حقيقية لاكتشاف الثغرات والأجهزة المتصلة.

## الميزات الرئيسية

### 1. اكتشاف نقاط الوصول
- فحص الشبكات اللاسلكية المتاحة
- عرض معلومات SSID و BSSID
- تحديد نوع التشفير المستخدم

### 2. أنواع الاختبارات المدعومة

#### WEP_CRACK
- اختبار ضعف تشفير WEP
- كشف إمكانية كسر المفتاح

#### WPA_HANDSHAKE_CAPTURE
- التقاط WPA handshake
- اختبار قوة كلمة المرور
- استخدام قاموس كلمات المرور

#### WPS_ATTACK
- اختبار ثغرة WPS
- محاولة brute force لـ WPS PIN

#### EVIL_TWIN
- اختبار قابلية الشبكة لهجوم Evil Twin
- كشف إمكانية خداع المستخدمين

#### DEAUTH_ATTACK
- اختبار قابلية الشبكة لهجوم Deauthentication
- كشف ضعف حماية Management Frames

#### TRAFFIC_ANALYSIS
- تحليل حركة المرور
- اكتشاف الأجهزة المتصلة
- كشف البروتوكولات غير الآمنة

### 3. النتائج والتقارير

#### الأجهزة المكتشفة
- عنوان MAC
- عنوان IP
- اسم الجهاز
- المصنّع

#### الثغرات المكتشفة
- نوع الثغرة
- مستوى الخطورة (CRITICAL, HIGH, MEDIUM, LOW)
- الوصف التفصيلي
- الدليل
- التوصيات للإصلاح

#### تحليل حركة المرور
- إجمالي الحزم
- البروتوكولات المستخدمة
- البروتوكولات غير الآمنة

## كيفية الاستخدام

### 1. إنشاء تحليل جديد

```javascript
// من خلال الواجهة
operationsManager.showNewOperationModal('network');

// أو مباشرة من API
const analysis = await api.createNetworkTest({
  target: {
    ssid: 'NetworkName',
    bssid: '00:11:22:33:44:55',
    authorizationId: 'uuid-here'
  },
  config: {
    testTypes: ['TRAFFIC_ANALYSIS', 'WPA_HANDSHAKE_CAPTURE'],
    maxAttempts: 100,
    passwordDictionary: '/path/to/dictionary.txt'
  }
});
```

### 2. مراقبة التقدم

```javascript
// الحصول على حالة التحليل
const status = await api.getNetworkTestStatus(analysisId);
console.log(status.status); // PENDING, RUNNING, COMPLETED, FAILED, STOPPED
```

### 3. الحصول على النتائج

```javascript
// بعد اكتمال التحليل
const results = await api.getNetworkResults(analysisId);
console.log(results.connectedDevices); // الأجهزة المكتشفة
console.log(results.vulnerabilities); // الثغرات المكتشفة
console.log(results.trafficAnalysis); // تحليل حركة المرور
```

### 4. تحميل التقرير

```javascript
// تحميل التقرير بصيغة PDF
await api.downloadNetworkReport(analysisId, 'PDF');
```

## التكامل مع Frontend

### NetworkAnalyzerManager

مدير قسم تحليل الشبكات يوفر واجهة سهلة للتعامل مع التحليلات:

```javascript
// تهيئة المدير
const networkAnalyzerManager = new NetworkAnalyzerManager(stateManager, apiClient);
await networkAnalyzerManager.initialize();

// تحميل قائمة التحليلات
await networkAnalyzerManager.loadNetworkAnalyses();

// عرض تفاصيل تحليل
await networkAnalyzerManager.loadAnalysisDetails(analysisId);

// إيقاف تحليل نشط
await networkAnalyzerManager.stopAnalysis(analysisId);

// تحميل التقرير
await networkAnalyzerManager.downloadReport(analysisId);
```

### التحديثات الفورية

المدير يقوم تلقائياً بـ polling كل 10 ثوان للتحليلات النشطة:

```javascript
// يتم تلقائياً عند وجود تحليلات نشطة
// لا حاجة لإعداد يدوي
```

## متطلبات الأمان

### 1. التصريح المطلوب
- يجب الحصول على تصريح كتابي قبل إجراء أي اختبار
- التصريح يجب أن يحدد نطاق الاختبار (SSID/BSSID)
- التحقق من صلاحية التصريح قبل بدء الاختبار

### 2. الصلاحيات المطلوبة
- صلاحية `network:EXECUTE` للمستخدم
- تصريح نشط وغير منتهي الصلاحية

### 3. التدقيق
- جميع العمليات يتم تسجيلها في Audit Logs
- الثغرات الحرجة يتم إرسال إشعارات بها

## API Endpoints

### POST /api/v1/network/discover
اكتشاف نقاط الوصول المتاحة

**Request:**
```json
{
  "authorizationId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessPoints": [
      {
        "ssid": "NetworkName",
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

### POST /api/v1/network/tests
بدء تحليل جديد

**Request:**
```json
{
  "target": {
    "ssid": "NetworkName",
    "bssid": "00:11:22:33:44:55",
    "authorizationId": "uuid"
  },
  "config": {
    "testTypes": ["TRAFFIC_ANALYSIS"],
    "maxAttempts": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "status": "PENDING",
    "startedAt": "2024-01-01T00:00:00Z"
  }
}
```

### GET /api/v1/network/tests
الحصول على جميع التحليلات

**Response:**
```json
{
  "success": true,
  "data": {
    "tests": [
      {
        "id": "uuid",
        "ssid": "NetworkName",
        "bssid": "00:11:22:33:44:55",
        "status": "COMPLETED",
        "startedAt": "2024-01-01T00:00:00Z",
        "completedAt": "2024-01-01T00:10:00Z"
      }
    ]
  }
}
```

### GET /api/v1/network/tests/:id/results
الحصول على نتائج التحليل

**Response:**
```json
{
  "success": true,
  "data": {
    "results": {
      "sessionId": "uuid",
      "target": {
        "ssid": "NetworkName",
        "bssid": "00:11:22:33:44:55"
      },
      "vulnerabilities": [
        {
          "id": "uuid",
          "type": "WEAK_PASSWORD",
          "severity": "CRITICAL",
          "description": "Network uses weak password",
          "evidence": "Password cracked in 5 minutes",
          "remediation": "Use strong password with 16+ characters"
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
          "HTTPS": 800,
          "DNS": 50
        },
        "insecureProtocols": ["HTTP", "FTP"]
      }
    }
  }
}
```

### POST /api/v1/network/tests/:id/stop
إيقاف تحليل نشط

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Network test stopped successfully",
    "sessionId": "uuid"
  }
}
```

### GET /api/v1/network/tests/:id/report?format=PDF
تحميل التقرير

**Query Parameters:**
- `format`: PDF, HTML, JSON, CSV

**Response:** ملف التقرير

## الاعتبارات الأخلاقية والقانونية

⚠️ **تحذير مهم:**

1. **لا تستخدم هذه الأدوات على شبكات لا تملك تصريحاً كتابياً لاختبارها**
2. **الاستخدام غير المصرح به يعتبر جريمة في معظم الدول**
3. **احصل دائماً على تصريح كتابي قبل إجراء أي اختبار**
4. **احترم خصوصية الآخرين وبياناتهم**

## الدعم الفني

للمساعدة أو الإبلاغ عن مشاكل، يرجى التواصل مع فريق الدعم الفني.
