# IP Scanner API Documentation

## نظرة عامة

تم إنشاء جميع API endpoints الخاصة بميزة فحص IP باستخدام Nmap. تم تقسيم الـ endpoints إلى 4 ملفات رئيسية:

1. **ipScanRoutes.ts** - إدارة جلسات الفحص
2. **ipScanResultsRoutes.ts** - عرض النتائج والتقارير
3. **ipScanScheduleRoutes.ts** - إدارة الجداول
4. **cveRoutes.ts** - قاعدة بيانات CVE

## الملفات المنشأة

### 1. IP Scan Routes (`src/api/routes/ipScanRoutes.ts`)

**Endpoints:**
- `POST /api/v1/ip-scans` - بدء فحص جديد
- `GET /api/v1/ip-scans` - قائمة جميع الفحوصات
- `GET /api/v1/ip-scans/:id` - تفاصيل فحص محدد
- `GET /api/v1/ip-scans/:id/status` - حالة الفحص
- `POST /api/v1/ip-scans/:id/stop` - إيقاف فحص جاري
- `DELETE /api/v1/ip-scans/:id` - حذف جلسة فحص

**الميزات:**
- التحقق من المصادقة والتفويض
- التحقق من صحة المدخلات
- معالجة الأخطاء الشاملة
- تسجيل جميع العمليات

### 2. IP Scan Results Routes (`src/api/routes/ipScanResultsRoutes.ts`)

**Endpoints:**
- `GET /api/v1/ip-scans/:id/results` - جميع نتائج الفحص
- `GET /api/v1/ip-scans/:id/hosts` - قائمة المضيفين المكتشفين
- `GET /api/v1/ip-scans/:id/ports` - قائمة المنافذ المكتشفة
- `GET /api/v1/ip-scans/:id/vulnerabilities` - قائمة الثغرات
- `GET /api/v1/ip-scans/:id/summary` - ملخص النتائج

**الميزات:**
- دعم الفلترة (حسب الحالة، الخطورة، المضيف)
- إحصائيات شاملة
- استعلامات محسّنة مع JOINs

### 3. IP Scan Schedule Routes (`src/api/routes/ipScanScheduleRoutes.ts`)

**Endpoints:**
- `POST /api/v1/ip-scans/schedules` - إنشاء جدول جديد
- `GET /api/v1/ip-scans/schedules` - قائمة جميع الجداول
- `GET /api/v1/ip-scans/schedules/:id` - تفاصيل جدول محدد
- `PUT /api/v1/ip-scans/schedules/:id` - تحديث جدول
- `DELETE /api/v1/ip-scans/schedules/:id` - حذف جدول
- `POST /api/v1/ip-scans/schedules/:id/toggle` - تفعيل/تعطيل جدول
- `GET /api/v1/ip-scans/schedules/:id/history` - سجل التنفيذ

**الميزات:**
- إدارة كاملة للجداول
- سجل تنفيذ الفحوصات المجدولة
- تفعيل/تعطيل سهل

### 4. CVE Routes (`src/api/routes/cveRoutes.ts`)

**Endpoints:**
- `GET /api/v1/cve/search` - البحث عن CVEs
- `GET /api/v1/cve/:cveId` - تفاصيل CVE محدد
- `GET /api/v1/cve/:cveId/exploits` - البحث عن exploits
- `POST /api/v1/cve/update-database` - تحديث قاعدة البيانات (Admin فقط)
- `GET /api/v1/cve/stats` - إحصائيات قاعدة البيانات

**الميزات:**
- البحث بالخدمة والإصدار
- البحث بالكلمات المفتاحية
- التحقق من صلاحيات Admin للتحديث
- إحصائيات شاملة

## كيفية التسجيل في التطبيق الرئيسي

يجب تسجيل هذه الـ routes في الملف الرئيسي للتطبيق. إليك الكود المطلوب:

### في `src/index.ts` أو `server.ts`:

```typescript
import { createIpScanRoutes } from './api/routes/ipScanRoutes';
import { createIpScanResultsRoutes } from './api/routes/ipScanResultsRoutes';
import { createIpScanScheduleRoutes } from './api/routes/ipScanScheduleRoutes';
import { createCveRoutes } from './api/routes/cveRoutes';

// بعد إنشاء Express app وقبل بدء الخادم
const app = express();

// Middleware
app.use(express.json());
app.use(authMiddleware); // التحقق من المصادقة

// تسجيل IP Scanner routes
app.use('/api/v1/ip-scans', createIpScanRoutes(db));

// دمج Results routes مع IP Scans routes
const ipScanRouter = createIpScanRoutes(db);
const resultsRouter = createIpScanResultsRoutes(db);
ipScanRouter.use('/', resultsRouter);
app.use('/api/v1/ip-scans', ipScanRouter);

// تسجيل Schedule routes
app.use('/api/v1/ip-scans/schedules', createIpScanScheduleRoutes(db));

// تسجيل CVE routes
app.use('/api/v1/cve', createCveRoutes(db));
```

### أو بطريقة أبسط:

```typescript
// تسجيل جميع routes
app.use('/api/v1/ip-scans', createIpScanRoutes(db));
app.use('/api/v1/ip-scans', createIpScanResultsRoutes(db));
app.use('/api/v1/ip-scans/schedules', createIpScanScheduleRoutes(db));
app.use('/api/v1/cve', createCveRoutes(db));
```

## أمثلة على الاستخدام

### 1. بدء فحص جديد

```bash
curl -X POST http://localhost:3000/api/v1/ip-scans \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "target": {
      "type": "SINGLE_IP",
      "value": "192.168.1.100",
      "authorizationId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "config": {
      "scanType": "COMPREHENSIVE_SCAN",
      "portRange": {
        "type": "ALL"
      },
      "timing": "T4",
      "serviceDetection": true,
      "osDetection": true,
      "vulnerabilityScan": true
    }
  }'
```

### 2. الحصول على حالة الفحص

```bash
curl -X GET http://localhost:3000/api/v1/ip-scans/SESSION_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. الحصول على النتائج

```bash
curl -X GET http://localhost:3000/api/v1/ip-scans/SESSION_ID/results \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. إنشاء جدول فحص

```bash
curl -X POST http://localhost:3000/api/v1/ip-scans/schedules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Daily Network Scan",
    "target": {
      "type": "CIDR",
      "value": "192.168.1.0/24",
      "authorizationId": "550e8400-e29b-41d4-a716-446655440000"
    },
    "config": {
      "scanType": "QUICK_SCAN",
      "timing": "T3"
    },
    "frequency": {
      "type": "DAILY",
      "time": "02:00"
    },
    "enabled": true,
    "notifyOnCompletion": true
  }'
```

### 5. البحث عن CVEs

```bash
curl -X GET "http://localhost:3000/api/v1/cve/search?service=apache&version=2.4.49" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## الأمان

جميع الـ endpoints تتطلب:
- ✅ مصادقة صالحة (Bearer Token)
- ✅ التحقق من ملكية الموارد
- ✅ التحقق من صحة المدخلات
- ✅ معالجة الأخطاء الشاملة
- ✅ تسجيل جميع العمليات

## الخطوات التالية

1. ✅ تسجيل الـ routes في التطبيق الرئيسي
2. ⏳ اختبار جميع الـ endpoints
3. ⏳ إضافة Swagger documentation
4. ⏳ تطوير واجهة المستخدم

## الحالة

- ✅ المهمة 14.1: IP Scan Controller - مكتمل
- ✅ المهمة 14.3: Results Controller - مكتمل
- ✅ المهمة 14.4: Schedule Controller - مكتمل
- ✅ المهمة 14.5: CVE Controller - مكتمل
- ⏳ المهمة 14.2: اختبارات الخصائص - اختياري (تم تخطيه للـ MVP)
