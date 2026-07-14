# 🔒 منصة اختبار الاختراق والأمن الهجومي

## ⚠️ المشكلة الحالية

هناك عملية معلقة في النظام تطلب تأكيداً `[Y] Yes` أو `[N] No`

### الحل السريع:
1. **أعد تشغيل الجهاز** (أسهل حل)
2. أو افتح Task Manager وأنهِ العمليات: `winget.exe`, `msiexec.exe`
3. افتح PowerShell جديد

---

## 🚀 تشغيل النظام

### الطريقة 1: Docker (موصى بها) ✅

```bash
# انقر نقراً مزدوجاً على:
START-DOCKER.bat
```

**المتطلبات:**
- Docker Desktop: https://www.docker.com/products/docker-desktop/

### الطريقة 2: Node.js مباشرة

```bash
# انقر نقراً مزدوجاً على:
START.bat
```

**المتطلبات:**
- Node.js (ملف `nodejs-installer.msi` موجود)
- PostgreSQL: https://www.postgresql.org/download/windows/
- Redis: https://github.com/microsoftarchive/redis/releases

---

## 📋 الأوامر اليدوية

```powershell
# التحقق من Node.js
node --version
npm --version

# إعداد البيئة
copy .env.example .env

# تثبيت المكتبات
npm install

# تشغيل النظام
npm run dev
```

---

## 🌐 الوصول للنظام

بعد التشغيل:
- **النظام الرئيسي:** http://localhost:3000
- **توثيق API:** http://localhost:3000/api-docs

---

## 📁 الملفات المساعدة

| الملف | الوصف |
|------|-------|
| `دليل-التشغيل.html` | دليل تفاعلي (افتحه في المتصفح) |
| `START-DOCKER.bat` | تشغيل باستخدام Docker |
| `START.bat` | تشغيل باستخدام Node.js |
| `KILL-PENDING.bat` | إنهاء العمليات المعلقة |
| `check-system.ps1` | فحص النظام |
| `اقرأني-أولاً.txt` | تعليمات نصية |

---

## 🔧 حل المشاكل

### "node is not recognized"
- أعد تشغيل PowerShell أو الجهاز بعد تثبيت Node.js

### "Cannot connect to database"
- تأكد من تشغيل PostgreSQL و Redis
- أو استخدم Docker (يشغل كل شيء تلقائياً)

### "Port 3000 already in use"
- غير `PORT=3001` في ملف `.env`

---

## 📚 الوثائق الإضافية

- `README.md` - الوثائق الكاملة بالإنجليزية
- `QUICK_START.md` - دليل البدء السريع
- `SETUP.md` - دليل الإعداد التفصيلي
- `.kiro/specs/penetration-testing-platform/` - مواصفات المشروع

---

## 🎯 الخطوات المختصرة

1. ✅ أعد تشغيل الجهاز (لحل المشكلة المعلقة)
2. ✅ ثبت Docker Desktop
3. ✅ شغل `START-DOCKER.bat`
4. ✅ افتح http://localhost:3000

---

## 💡 نصيحة

**استخدم Docker!** إنه الأسهل والأسرع - يثبت ويشغل كل شيء تلقائياً.

---

## 📞 الدعم

إذا واجهت مشاكل:
1. افتح `دليل-التشغيل.html` في المتصفح
2. راجع `اقرأني-أولاً.txt`
3. راجع السجلات في مجلد `logs/`
