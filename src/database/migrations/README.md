# IP Scanner Database Migrations

هذا المجلد يحتوي على migrations قاعدة البيانات لميزة ماسح IP.

## الملفات

### 001_create_ip_scanner_tables.sql
ملف SQL يحتوي على جميع الجداول المطلوبة لميزة ماسح IP.

**الجداول المنشأة:**
1. `ip_scan_sessions` - جلسات فحص IP
2. `ip_scan_hosts` - المضيفين المفحوصين
3. `ip_scan_ports` - المنافذ المكتشفة
4. `ip_scan_vulnerabilities` - الثغرات المكتشفة
5. `ip_scan_schedules` - جداول الفحص التلقائي
6. `cve_database` - قاعدة بيانات CVE المحلية
7. `ip_scan_notifications` - الإشعارات

### apply-ip-scanner-migration.ts
سكريبت TypeScript لتطبيق migration.

### rollback-ip-scanner-migration.ts
سكريبت TypeScript للتراجع عن migration.

## الاستخدام

### تطبيق Migration

#### باستخدام npm script
```bash
npm run db:migrate:ip-scanner
```

#### باستخدام ts-node مباشرة
```bash
npx ts-node src/database/migrations/apply-ip-scanner-migration.ts
```

#### باستخدام psql
```bash
psql -U postgres -d penetration_testing -f src/database/migrations/001_create_ip_scanner_tables.sql
```

### التراجع عن Migration

```bash
npx ts-node src/database/migrations/rollback-ip-scanner-migration.ts
```

⚠️ **تحذير:** التراجع سيحذف جميع الجداول وبياناتها!

## هيكل الجداول

### ip_scan_sessions
جدول جلسات الفحص الرئيسي.

**الأعمدة الرئيسية:**
- `id` - معرف فريد
- `user_id` - المستخدم الذي بدأ الفحص
- `authorization_id` - التصريح المستخدم
- `target_type` - نوع الهدف (SINGLE_IP, IP_RANGE, CIDR, HOSTNAME)
- `target_value` - قيمة الهدف
- `scan_type` - نوع الفحص
- `status` - حالة الفحص
- `progress` - نسبة الإنجاز (0-100)
- `config` - إعدادات الفحص (JSONB)

**العلاقات:**
- يرتبط بـ `users` (many-to-one)
- يرتبط بـ `authorizations` (many-to-one)
- يرتبط بـ `ip_scan_hosts` (one-to-many)

### ip_scan_hosts
معلومات المضيفين المكتشفة.

**الأعمدة الرئيسية:**
- `id` - معرف فريد
- `session_id` - الجلسة المرتبطة
- `ip_address` - عنوان IP (INET)
- `hostname` - اسم المضيف
- `status` - حالة المضيف (up, down, unknown)
- `os_name` - نظام التشغيل المكتشف
- `os_accuracy` - دقة اكتشاف نظام التشغيل (0-100)

**العلاقات:**
- يرتبط بـ `ip_scan_sessions` (many-to-one)
- يرتبط بـ `ip_scan_ports` (one-to-many)
- يرتبط بـ `ip_scan_vulnerabilities` (one-to-many)

### ip_scan_ports
المنافذ والخدمات المكتشفة.

**الأعمدة الرئيسية:**
- `id` - معرف فريد
- `host_id` - المضيف المرتبط
- `port` - رقم المنفذ (1-65535)
- `protocol` - البروتوكول (tcp, udp)
- `state` - حالة المنفذ (open, closed, filtered, unfiltered)
- `service_name` - اسم الخدمة
- `service_version` - إصدار الخدمة
- `cpe` - Common Platform Enumeration

**العلاقات:**
- يرتبط بـ `ip_scan_hosts` (many-to-one)
- يرتبط بـ `ip_scan_vulnerabilities` (one-to-many)

### ip_scan_vulnerabilities
الثغرات الأمنية المكتشفة.

**الأعمدة الرئيسية:**
- `id` - معرف فريد
- `host_id` - المضيف المرتبط
- `port_id` - المنفذ المرتبط (اختياري)
- `type` - نوع الثغرة
- `severity` - مستوى الخطورة (CRITICAL, HIGH, MEDIUM, LOW, INFO)
- `title` - عنوان الثغرة
- `cvss_score` - درجة CVSS (0-10)
- `cve_ids` - معرفات CVE (مصفوفة)
- `remediation` - الحل المقترح

**العلاقات:**
- يرتبط بـ `ip_scan_hosts` (many-to-one)
- يرتبط بـ `ip_scan_ports` (many-to-one, optional)

### ip_scan_schedules
جدولة الفحوصات التلقائية.

**الأعمدة الرئيسية:**
- `id` - معرف فريد
- `user_id` - المستخدم المالك
- `name` - اسم الجدول
- `target_type` - نوع الهدف
- `target_value` - قيمة الهدف
- `config` - إعدادات الفحص (JSONB)
- `frequency_type` - نوع التكرار (HOURLY, DAILY, WEEKLY, MONTHLY, CUSTOM)
- `frequency_config` - إعدادات التكرار (JSONB)
- `enabled` - مفعل/معطل
- `next_run` - موعد التشغيل التالي

**العلاقات:**
- يرتبط بـ `users` (many-to-one)
- يرتبط بـ `authorizations` (many-to-one)

### cve_database
قاعدة بيانات CVE المحلية.

**الأعمدة الرئيسية:**
- `cve_id` - معرف CVE (PRIMARY KEY)
- `description` - وصف الثغرة
- `cvss_score` - درجة CVSS
- `published_date` - تاريخ النشر
- `affected_products` - المنتجات المتأثرة (مصفوفة)
- `affected_versions` - الإصدارات المتأثرة (مصفوفة)
- `exploit_available` - هل يوجد exploit متاح
- `patch_available` - هل يوجد patch متاح

### ip_scan_notifications
إشعارات فحص IP.

**الأعمدة الرئيسية:**
- `id` - معرف فريد
- `user_id` - المستخدم المستلم
- `session_id` - الجلسة المرتبطة (اختياري)
- `type` - نوع الإشعار
- `title` - عنوان الإشعار
- `message` - نص الإشعار
- `severity` - مستوى الأهمية (INFO, WARNING, ERROR, CRITICAL)
- `read` - مقروء/غير مقروء

**العلاقات:**
- يرتبط بـ `users` (many-to-one)
- يرتبط بـ `ip_scan_sessions` (many-to-one, optional)

## الفهارس (Indexes)

تم إنشاء فهارس على الأعمدة التالية لتحسين الأداء:
- معرفات المستخدمين
- حالات الفحص
- تواريخ الإنشاء
- عناوين IP
- أرقام المنافذ
- مستويات الخطورة
- معرفات CVE (GIN index للمصفوفات)

## القيود (Constraints)

### Check Constraints
- `target_type` - يجب أن يكون أحد القيم المحددة
- `scan_type` - يجب أن يكون أحد القيم المحددة
- `status` - يجب أن يكون أحد القيم المحددة
- `progress` - يجب أن يكون بين 0 و 100
- `port` - يجب أن يكون بين 1 و 65535
- `severity` - يجب أن يكون أحد القيم المحددة
- `cvss_score` - يجب أن يكون بين 0 و 10

### Foreign Key Constraints
جميع العلاقات محمية بـ foreign keys مع:
- `ON DELETE CASCADE` - للحذف التسلسلي
- `ON DELETE SET NULL` - للعلاقات الاختيارية

## Triggers

### update_ip_scan_sessions_updated_at
يحدث `updated_at` تلقائياً عند تحديث السجل.

### update_ip_scan_schedules_updated_at
يحدث `updated_at` تلقائياً عند تحديث السجل.

## الأمان

- جميع الجداول تستخدم UUID كمعرفات رئيسية
- العلاقات محمية بـ foreign keys
- القيود تضمن صحة البيانات
- الفهارس تحسن الأداء

## الصيانة

### النسخ الاحتياطي
```bash
pg_dump -U postgres -d penetration_testing -t 'ip_scan_*' -t 'cve_database' > ip_scanner_backup.sql
```

### الاستعادة
```bash
psql -U postgres -d penetration_testing < ip_scanner_backup.sql
```

### تنظيف البيانات القديمة
```sql
-- حذف الجلسات الأقدم من 90 يوماً
DELETE FROM ip_scan_sessions 
WHERE created_at < NOW() - INTERVAL '90 days';
```

## استكشاف الأخطاء

### خطأ: relation already exists
الجداول موجودة بالفعل. استخدم rollback أولاً.

### خطأ: permission denied
تأكد من صلاحيات المستخدم في قاعدة البيانات.

### خطأ: foreign key violation
تأكد من وجود السجلات المرتبطة في الجداول الأخرى.

## المراجع

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [IP Scanner Design Document](.kiro/specs/ip-nmap-scanner/design.md)
- [IP Scanner Requirements](.kiro/specs/ip-nmap-scanner/requirements.md)
