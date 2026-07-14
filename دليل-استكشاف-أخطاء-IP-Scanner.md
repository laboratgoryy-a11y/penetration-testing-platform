# 🔧 دليل استكشاف الأخطاء وإصلاحها - فحص IP

## المشاكل الشائعة والحلول

### 1. القائمة المنسدلة فارغة (Please select an item)

#### الأعراض
- عند النقر على "بدء فحص جديد"
- تظهر رسالة "Please select an item in the list"
- القائمة المنسدلة لنوع الفحص فارغة

#### الحلول

**الحل 1: مسح الذاكرة المؤقتة**
```
Ctrl + Shift + R (في المتصفح)
```

**الحل 2: استخدام صفحة الاختبار**
```
http://localhost:3001/test-ip-scanner-complete.html
```
- انقر "عرض النموذج"
- انقر "فحص قائمة نوع الفحص"
- إذا كانت فارغة، انقر "ملء يدوي"

**الحل 3: من Console**
```javascript
// افتح Console (F12)
window.ipScannerManager.showNewScanForm();

// انتظر ثانية ثم
const select = document.getElementById('scan-type');
window.ipScannerManager.populateScanTypeSelect(select);
```

**الحل 4: إعادة تحميل النموذج**
```javascript
// في Console
window.ipScannerManager.reloadForm();
```

---

### 2. النموذج لا يظهر

#### الأعراض
- النقر على "بدء فحص جديد" لا يفعل شيئاً
- لا تظهر نافذة منبثقة

#### الحلول

**الحل 1: التحقق من Console**
```
F12 → Console
```
ابحث عن أخطاء JavaScript

**الحل 2: التحقق من المدير**
```javascript
// في Console
console.log(window.ipScannerManager);
```
إذا كان `undefined`:
```javascript
window.ipScannerManager = new IPScannerManager();
window.ipScannerManager.initialize();
```

**الحل 3: إعادة تحميل الصفحة**
```
Ctrl + Shift + R
```

---

### 3. التصاريح لا تظهر

#### الأعراض
- قائمة التصاريح تعرض "جاري التحميل..." أو فارغة

#### الحلول

**الحل 1: التحقق من API**
```javascript
// في Console
api.get('/authorizations').then(console.log);
```

**الحل 2: إنشاء تصريح تجريبي**
افتح:
```
http://localhost:3001/إنشاء-تصريح-تجريبي.html
```

**الحل 3: التحقق من قاعدة البيانات**
```batch
sqlite3 penetration_testing.db "SELECT * FROM authorizations;"
```

---

### 4. الفحص لا يبدأ

#### الأعراض
- النقر على "بدء الفحص" لا يفعل شيئاً
- أو تظهر رسالة خطأ

#### الحلول

**الحل 1: التحقق من الحقول المطلوبة**
- ✅ نوع الهدف
- ✅ الهدف (IP أو نطاق)
- ✅ التصريح
- ✅ نوع الفحص

**الحل 2: التحقق من Console**
```
F12 → Console
```
ابحث عن رسائل الخطأ

**الحل 3: اختبار API مباشرة**
```javascript
// في Console
const data = {
    targetType: 'SINGLE_IP',
    targetValue: '192.168.1.1',
    authorizationId: 1,
    scanType: 'QUICK_SCAN'
};

api.post('/ip-scans', data).then(console.log);
```

---

### 5. الخادم لا يعمل

#### الأعراض
- صفحة لا تُحمل
- أخطاء اتصال في Console

#### الحلول

**الحل 1: تشغيل الخادم**
```batch
تشغيل-النظام.bat
```
اختر [1] تشغيل النظام الكامل

**الحل 2: التحقق من المنفذ**
```batch
netstat -ano | findstr :3001
```

**الحل 3: إعادة تشغيل**
```batch
إدارة-سريعة.bat restart
```

---

## أدوات التشخيص

### 1. صفحة الاختبار الشاملة
```
http://localhost:3001/test-ip-scanner-complete.html
```

**الميزات:**
- ✅ اختبار التهيئة
- ✅ اختبار النموذج
- ✅ اختبار API
- ✅ سجلات تفصيلية

### 2. صفحة اختبار النموذج
```
http://localhost:3001/test-ip-scanner-form.html
```

### 3. Console Commands

**التحقق من المدير:**
```javascript
console.log(window.ipScannerManager);
console.log(window.ipScannerManager.scanTypes);
```

**عرض النموذج:**
```javascript
window.ipScannerManager.showNewScanForm();
```

**ملء القائمة يدوياً:**
```javascript
const select = document.getElementById('scan-type');
window.ipScannerManager.populateScanTypeSelect(select);
```

**إعادة تحميل النموذج:**
```javascript
window.ipScannerManager.reloadForm();
```

**اختبار API:**
```javascript
api.get('/authorizations').then(console.log);
api.get('/ip-scans').then(console.log);
```

---

## سيناريوهات الإصلاح

### السيناريو 1: القائمة فارغة بعد فتح النموذج

```javascript
// 1. افتح Console (F12)

// 2. تحقق من scanTypes
console.log(window.ipScannerManager.scanTypes);
// يجب أن يظهر: {QUICK_SCAN: "فحص سريع", ...}

// 3. إذا كان موجوداً، املأ القائمة يدوياً
const select = document.getElementById('scan-type');
window.ipScannerManager.populateScanTypeSelect(select);

// 4. تحقق من النتيجة
console.log(select.options.length);
// يجب أن يكون 7
```

### السيناريو 2: النموذج لا يظهر

```javascript
// 1. افتح Console (F12)

// 2. تحقق من المدير
if (!window.ipScannerManager) {
    window.ipScannerManager = new IPScannerManager();
}

// 3. اعرض النموذج
window.ipScannerManager.showNewScanForm();

// 4. إذا لم يظهر، تحقق من الأخطاء
// ابحث عن رسائل حمراء في Console
```

### السيناريو 3: التصاريح لا تُحمل

```javascript
// 1. اختبر API
api.get('/authorizations').then(response => {
    console.log('Success:', response.success);
    console.log('Data:', response.data);
});

// 2. إذا فشل، تحقق من الخادم
fetch('http://localhost:3001/api/v1/authorizations')
    .then(r => r.json())
    .then(console.log);

// 3. إنشاء تصريح تجريبي
// افتح: http://localhost:3001/إنشاء-تصريح-تجريبي.html
```

---

## الفحوصات السريعة

### ✅ قائمة التحقق السريع

```
□ الخادم يعمل (http://localhost:3001)
□ تم تسجيل الدخول
□ Console لا يحتوي على أخطاء
□ window.ipScannerManager موجود
□ scanTypes يحتوي على 7 أنواع
□ يوجد تصريح واحد على الأقل
□ النموذج يظهر عند النقر
□ القائمة المنسدلة تحتوي على خيارات
```

### 🔍 أوامر التشخيص السريع

```javascript
// نسخ والصق في Console

// 1. التحقق الشامل
console.log('Manager:', !!window.ipScannerManager);
console.log('ScanTypes:', Object.keys(window.ipScannerManager?.scanTypes || {}));
console.log('API:', typeof api);

// 2. اختبار سريع
window.ipScannerManager?.showNewScanForm();
setTimeout(() => {
    const select = document.getElementById('scan-type');
    console.log('Options:', select?.options.length);
}, 500);
```

---

## الحصول على المساعدة

إذا استمرت المشكلة:

1. ✅ افتح `test-ip-scanner-complete.html`
2. ✅ شغل جميع الاختبارات
3. ✅ انسخ السجلات من الصفحة
4. ✅ انسخ أخطاء Console (F12)
5. ✅ شارك المعلومات للحصول على المساعدة

---

## الملفات المفيدة

- `test-ip-scanner-complete.html` - اختبار شامل
- `test-ip-scanner-form.html` - اختبار النموذج
- `إصلاح-قائمة-نوع-الفحص.md` - دليل الإصلاح
- `تشغيل-النظام.bat` - تشغيل النظام
- `إدارة-سريعة.bat` - إدارة سريعة
