# Python IP Scanner

فاحص IP باستخدام Python كبديل لـ Nmap

## المميزات

✅ لا يحتاج تثبيت Nmap  
✅ يعمل مع Python فقط  
✅ سهل التثبيت والاستخدام  
✅ نتائج بصيغة JSON  
✅ أنواع فحص متعددة  

## التثبيت

### 1. تأكد من تثبيت Python

```bash
python --version
```

إذا لم يكن مثبتاً، حمّله من: https://www.python.org/downloads/

### 2. ثبّت المكتبات المطلوبة

**Windows:**
```cmd
install.bat
```

**Linux/Mac:**
```bash
pip install -r requirements.txt
```

## الاستخدام

### من سطر الأوامر

```bash
# فحص سريع
python ip_scanner.py 192.168.1.1

# فحص كامل
python ip_scanner.py 192.168.1.1 --type full

# فحص نطاق
python ip_scanner.py 192.168.1.0/24 --type quick

# فحص الخدمات
python ip_scanner.py 192.168.1.1 --type service

# فحص شامل
python ip_scanner.py 192.168.1.1 --type comprehensive
```

### أنواع الفحص

- `quick` - فحص سريع للمنافذ الشائعة (افتراضي)
- `full` - فحص كامل لجميع المنافذ (1-65535)
- `stealth` - فحص خفي (SYN scan)
- `service` - فحص الخدمات والإصدارات
- `os` - فحص نظام التشغيل
- `comprehensive` - فحص شامل (خدمات + نظام + scripts)

### مع الخادم

الخادم يستخدم Python scanner تلقائياً:

```bash
# تشغيل الخادم
node server-sqlite.js

# من المتصفح
# افتح: http://localhost:3000
# اذهب إلى: IP Scanner
# أنشئ فحص جديد
```

## أمثلة النتائج

### فحص ناجح

```json
{
  "success": true,
  "timestamp": "2026-01-27T23:30:00.000Z",
  "stats": {
    "total_hosts": 1,
    "hosts_up": 1,
    "total_ports": 5,
    "open_ports": 3,
    "scan_time": "2.45"
  },
  "hosts": [
    {
      "ip": "192.168.1.1",
      "hostname": "router.local",
      "state": "up",
      "protocols": ["tcp"],
      "os": {
        "name": "Linux 3.2 - 4.9",
        "accuracy": "95"
      }
    }
  ],
  "ports": [
    {
      "host": "192.168.1.1",
      "port": 80,
      "protocol": "tcp",
      "state": "open",
      "service": "http",
      "product": "nginx",
      "version": "1.18.0"
    }
  ],
  "services": [
    {
      "host": "192.168.1.1",
      "port": 80,
      "name": "http",
      "product": "nginx",
      "version": "1.18.0"
    }
  ]
}
```

## الاختبار

```bash
# اختبار على localhost
test-scanner.bat

# أو يدوياً
python ip_scanner.py 127.0.0.1 --type quick
```

## ملاحظات مهمة

⚠️ **تحذير قانوني**: 
- لا تفحص أي شبكة بدون تصريح
- الفحص غير المصرح به قد يكون غير قانوني
- استخدم فقط على شبكاتك الخاصة أو بتصريح كتابي

⚠️ **متطلبات النظام**:
- Python 3.6 أو أحدث
- صلاحيات المسؤول قد تكون مطلوبة لبعض أنواع الفحص
- اتصال بالشبكة

## استكشاف الأخطاء

### خطأ: "python-nmap not found"
```bash
pip install python-nmap
```

### خطأ: "Permission denied"
قم بتشغيل الأمر كمسؤول (Administrator)

### خطأ: "No route to host"
تأكد من:
- الهدف متصل بالشبكة
- لا يوجد Firewall يحجب الفحص
- عنوان IP صحيح

## التكامل مع الخادم

تم تكامل Python scanner مع `server-sqlite.js`:

1. عند إنشاء فحص جديد من الواجهة
2. الخادم يستدعي `python ip_scanner.py`
3. النتائج تُحفظ في قاعدة البيانات
4. يمكن عرضها من الواجهة

## الترقية

لتحديث المكتبات:

```bash
pip install --upgrade python-nmap
```

---

**تم الإنشاء**: 2026-01-27  
**الإصدار**: 1.0.0
