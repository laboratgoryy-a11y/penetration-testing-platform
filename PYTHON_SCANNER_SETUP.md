# إعداد Python IP Scanner

## ✅ تم التكامل بنجاح!

الآن يمكنك استخدام فاحص IP الحقيقي باستخدام Python بدلاً من Nmap.

## خطوات التفعيل السريعة

### 1. تثبيت Python Scanner

```cmd
cd python-scanner
install.bat
```

هذا سيثبت المكتبة المطلوبة: `python-nmap`

### 2. اختبار Scanner

```cmd
cd python-scanner
test-scanner.bat
```

أو يدوياً:
```cmd
python ip_scanner.py 127.0.0.1 --type quick
```

### 3. استخدام من الواجهة

1. افتح المتصفح: http://localhost:3000
2. سجل الدخول (admin/password)
3. اذهب إلى قسم "IP Scanner"
4. اختر تصريح
5. أدخل عنوان IP (مثل: 192.168.1.1)
6. اختر نوع الفحص
7. ابدأ الفحص!

## أنواع الفحص المتاحة

| النوع | الوصف | الوقت |
|------|-------|------|
| Quick | فحص سريع للمنافذ الشائعة | ~30 ثانية |
| Full | فحص جميع المنافذ (1-65535) | ~5 دقائق |
| Service | فحص الخدمات والإصدارات | ~1 دقيقة |
| Stealth | فحص خفي (SYN scan) | ~1 دقيقة |
| OS | فحص نظام التشغيل | ~1 دقيقة |
| Comprehensive | فحص شامل | ~10 دقائق |

## كيف يعمل؟

```
Frontend (Browser)
    ↓
    POST /api/v1/ip-scans
    ↓
Server (Node.js)
    ↓
    exec("python ip_scanner.py 192.168.1.1")
    ↓
Python Scanner
    ↓
    Uses python-nmap library
    ↓
    Returns JSON results
    ↓
Server saves to SQLite
    ↓
Frontend displays results
```

## مثال على النتائج

عند فحص `192.168.1.1`:

```json
{
  "success": true,
  "stats": {
    "total_hosts": 1,
    "hosts_up": 1,
    "open_ports": 3
  },
  "hosts": [
    {
      "ip": "192.168.1.1",
      "hostname": "router.local",
      "state": "up"
    }
  ],
  "ports": [
    {
      "port": 80,
      "service": "http",
      "state": "open"
    },
    {
      "port": 443,
      "service": "https",
      "state": "open"
    }
  ]
}
```

## استكشاف الأخطاء

### المشكلة: "Python not found"
**الحل**: ثبّت Python من https://www.python.org/downloads/

### المشكلة: "python-nmap not found"
**الحل**: 
```cmd
pip install python-nmap
```

### المشكلة: "Permission denied"
**الحل**: شغّل Command Prompt كمسؤول (Run as Administrator)

### المشكلة: "No route to host"
**الحل**: 
- تأكد أن الهدف متصل بالشبكة
- تحقق من إعدادات Firewall
- جرب فحص localhost أولاً: `127.0.0.1`

## الفرق بين Python Scanner و Nmap

| الميزة | Python Scanner | Nmap |
|-------|---------------|------|
| التثبيت | سهل (pip install) | يحتاج تثبيت منفصل |
| الحجم | صغير (~1MB) | كبير (~30MB) |
| السرعة | جيد | ممتاز |
| الميزات | أساسية | متقدمة جداً |
| التوافق | Python فقط | مستقل |

## الأمان والقانون

⚠️ **تحذير مهم**:

1. **لا تفحص شبكات لا تملكها**
2. **احصل على تصريح كتابي قبل أي فحص**
3. **الفحص غير المصرح به جريمة**
4. **استخدم فقط للأغراض القانونية**

## الخطوات التالية

1. ✅ ثبّت Python Scanner
2. ✅ اختبر على localhost
3. ✅ جرب من الواجهة
4. ✅ افحص شبكتك المحلية (بتصريح)
5. ✅ راجع النتائج والتقارير

## الدعم

للمزيد من المعلومات:
- راجع: `python-scanner/README.md`
- اختبر: `python-scanner/test-scanner.bat`
- الكود: `python-scanner/ip_scanner.py`

---

**تم الإنشاء**: 2026-01-27  
**الحالة**: ✅ جاهز للاستخدام
