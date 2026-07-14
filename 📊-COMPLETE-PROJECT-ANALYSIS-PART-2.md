# 📊 تحليل شامل للمشروع - الجزء الثاني
# Complete Project Analysis - Part 2

## 💾 قاعدة البيانات | Database Architecture

### نوع قاعدة البيانات | Database Type
**MySQL 8.0+** (متوافق مع XAMPP)

### اسم قاعدة البيانات | Database Name
- **الحالي**: `web scanner` (مع مسافة)
- **المخطط الأصلي**: `penetration_testing_platform`

### الاتصال | Connection Details
```javascript
{
  host: 'localhost',
  port: 3306,
  database: 'web scanner',
  user: 'root',
  password: 'admin', // أو فارغة
  charset: 'utf8mb4',
  connectionLimit: 10
}
```

### الجداول الرئيسية | Main Tables

#### 1. جداول المستخدمين والصلاحيات | Users & Permissions

**users** - المستخدمون
```sql
- id (VARCHAR(36), PK)
- username (VARCHAR(255), UNIQUE)
- email (VARCHAR(255), UNIQUE)
- password_hash (VARCHAR(255))
- mfa_enabled (BOOLEAN)
- mfa_secret (VARCHAR(255))
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- last_login (TIMESTAMP)
- account_locked (BOOLEAN)
- failed_login_attempts (INT)
```

**sessions** - الجلسات
```sql
- id (VARCHAR(64), PK)
- user_id (VARCHAR(36), FK → users)
- created_at (TIMESTAMP)
- expires_at (TIMESTAMP)
- ip_address (VARCHAR(45))
- user_agent (TEXT)
- last_activity (TIMESTAMP)
```

**roles** - الأدوار
```sql
- id (VARCHAR(36), PK)
- name (VARCHAR(100), UNIQUE)
- description (TEXT)
- created_at (TIMESTAMP)

الأدوار الافتراضية:
- ADMIN: مسؤول النظام
- AUDITOR: مدقق
- PENTESTER: مختبر اختراق
- ANALYST: محلل أمني
```

**permissions** - الصلاحيات
```sql
- id (VARCHAR(36), PK)
- resource (VARCHAR(255))
- action (VARCHAR(50))
- description (TEXT)

الموارد:
- authorizations (READ, WRITE, DELETE)
- scans (READ, EXECUTE)
- phishing (READ, EXECUTE)
- network (READ, EXECUTE)
- audit (READ)
- reports (READ)
- users (READ, WRITE)
```

**role_permissions** - ربط الأدوار بالصلاحيات
```sql
- role_id (VARCHAR(36), FK → roles)
- permission_id (VARCHAR(36), FK → permissions)
- PRIMARY KEY (role_id, permission_id)
```

**user_roles** - ربط المستخدمين بالأدوار
```sql
- user_id (VARCHAR(36), FK → users)
- role_id (VARCHAR(36), FK → roles)
- assigned_at (TIMESTAMP)
- PRIMARY KEY (user_id, role_id)
```


#### 2. جداول التصاريح | Authorization Tables

**authorizations** - التصاريح
```sql
- id (VARCHAR(36), PK)
- user_id (VARCHAR(36), FK → users)
- organization_name (VARCHAR(255))
- valid_from (TIMESTAMP)
- valid_until (TIMESTAMP)
- signed_by (VARCHAR(255))
- digital_signature (TEXT)
- document_path (VARCHAR(500))
- status (VARCHAR(50)) - ACTIVE, EXPIRED, REVOKED
- created_at (TIMESTAMP)
- revoked_at (TIMESTAMP)
- revocation_reason (TEXT)
```

**authorization_scopes** - نطاقات التصاريح
```sql
- id (VARCHAR(36), PK)
- authorization_id (VARCHAR(36), FK → authorizations)
- scope_type (VARCHAR(50)) - DOMAIN, IP_RANGE, NETWORK
- scope_value (TEXT)
- created_at (TIMESTAMP)
```

**authorization_operations** - العمليات المسموحة
```sql
- authorization_id (VARCHAR(36), FK → authorizations)
- operation_type (VARCHAR(50))
  - WEB_SCAN
  - PHISHING_CAMPAIGN
  - NETWORK_TEST
  - ALL
- PRIMARY KEY (authorization_id, operation_type)
```

#### 3. جداول فحص الويب | Web Scanning Tables

**scan_sessions** - جلسات الفحص
```sql
- id (VARCHAR(36), PK)
- user_id (VARCHAR(36), FK → users)
- authorization_id (VARCHAR(36), FK → authorizations)
- target_url (TEXT)
- status (VARCHAR(50)) - PENDING, RUNNING, COMPLETED, FAILED
- started_at (TIMESTAMP)
- completed_at (TIMESTAMP)
- total_requests (INT)
- total_vulnerabilities (INT)
- config (JSON) - إعدادات الفحص
```

**vulnerabilities** - الثغرات المكتشفة
```sql
- id (VARCHAR(36), PK)
- scan_session_id (VARCHAR(36), FK → scan_sessions)
- type (VARCHAR(100))
  - SQL_INJECTION
  - XSS
  - CSRF
  - DIRECTORY_TRAVERSAL
  - COMMAND_INJECTION
  - etc.
- severity (VARCHAR(50)) - CRITICAL, HIGH, MEDIUM, LOW, INFO
- location (TEXT)
- description (TEXT)
- evidence (TEXT)
- remediation (TEXT)
- cvss_score (DECIMAL(3,1))
- discovered_at (TIMESTAMP)
```

#### 4. جداول حملات التصيد | Phishing Campaign Tables

**phishing_campaigns** - حملات التصيد
```sql
- id (VARCHAR(36), PK)
- user_id (VARCHAR(36), FK → users)
- authorization_id (VARCHAR(36), FK → authorizations)
- name (VARCHAR(255))
- status (VARCHAR(50)) - DRAFT, SCHEDULED, RUNNING, COMPLETED
- email_template (JSON)
- landing_page_config (JSON)
- schedule (JSON)
- created_at (TIMESTAMP)
- launched_at (TIMESTAMP)
- completed_at (TIMESTAMP)
```

**campaign_targets** - أهداف الحملة
```sql
- id (VARCHAR(36), PK)
- campaign_id (VARCHAR(36), FK → phishing_campaigns)
- email (VARCHAR(255))
- name (VARCHAR(255))
- department (VARCHAR(255))
- tracking_token (VARCHAR(255), UNIQUE)
```

**campaign_interactions** - تفاعلات الحملة
```sql
- id (VARCHAR(36), PK)
- campaign_id (VARCHAR(36), FK → phishing_campaigns)
- target_id (VARCHAR(36), FK → campaign_targets)
- interaction_type (VARCHAR(50))
  - EMAIL_SENT
  - EMAIL_OPENED
  - LINK_CLICKED
  - DATA_SUBMITTED
- timestamp (TIMESTAMP)
- ip_address (VARCHAR(45))
- user_agent (TEXT)
- geolocation (VARCHAR(255))
- captured_data (BLOB) - مشفر
```

#### 5. جداول تحليل الشبكات | Network Analysis Tables

**network_test_sessions** - جلسات اختبار الشبكات
```sql
- id (VARCHAR(36), PK)
- user_id (VARCHAR(36), FK → users)
- authorization_id (VARCHAR(36), FK → authorizations)
- ssid (VARCHAR(255))
- bssid (VARCHAR(17))
- status (VARCHAR(50)) - PENDING, RUNNING, COMPLETED, FAILED
- started_at (TIMESTAMP)
- completed_at (TIMESTAMP)
- config (JSON)
```

**network_vulnerabilities** - ثغرات الشبكات
```sql
- id (VARCHAR(36), PK)
- test_session_id (VARCHAR(36), FK → network_test_sessions)
- type (VARCHAR(100))
  - WEP_CRACK
  - WPA_HANDSHAKE
  - WPS_ATTACK
  - DEAUTH_ATTACK
- severity (VARCHAR(50))
- description (TEXT)
- evidence (TEXT)
- remediation (TEXT)
- discovered_at (TIMESTAMP)
```

**discovered_devices** - الأجهزة المكتشفة
```sql
- id (VARCHAR(36), PK)
- test_session_id (VARCHAR(36), FK → network_test_sessions)
- mac_address (VARCHAR(17))
- ip_address (VARCHAR(45))
- hostname (VARCHAR(255))
- vendor (VARCHAR(255))
- discovered_at (TIMESTAMP)
```

#### 6. جداول التدقيق والتقارير | Audit & Reports Tables

**audit_logs** - سجلات التدقيق
```sql
- id (VARCHAR(36), PK)
- timestamp (TIMESTAMP)
- user_id (VARCHAR(36), FK → users)
- event_type (VARCHAR(100))
- resource (VARCHAR(255))
- action (VARCHAR(100))
- result (VARCHAR(50)) - SUCCESS, FAILURE
- details (JSON)
- ip_address (VARCHAR(45))
- user_agent (TEXT)
```

**reports** - التقارير
```sql
- id (VARCHAR(36), PK)
- type (VARCHAR(50)) - SCAN, PHISHING, NETWORK, COMPLIANCE
- format (VARCHAR(20)) - PDF, HTML, JSON, CSV
- file_path (VARCHAR(500))
- metadata (JSON)
- generated_by (VARCHAR(36), FK → users)
- generated_at (TIMESTAMP)
- expires_at (TIMESTAMP)
```

### الفهارس | Indexes

```sql
-- Users
INDEX idx_users_username (username)
INDEX idx_users_email (email)

-- Sessions
INDEX idx_sessions_user (user_id)
INDEX idx_sessions_expires (expires_at)
INDEX idx_sessions_last_activity (last_activity)

-- Authorizations
INDEX idx_authorizations_user (user_id)
INDEX idx_authorizations_status (status)
INDEX idx_authorizations_validity (valid_from, valid_until)

-- Scan Sessions
INDEX idx_scan_sessions_user (user_id)
INDEX idx_scan_sessions_status (status)

-- Vulnerabilities
INDEX idx_vulnerabilities_session (scan_session_id)
INDEX idx_vulnerabilities_severity (severity)

-- Phishing Campaigns
INDEX idx_campaigns_user (user_id)
INDEX idx_campaigns_status (status)

-- Campaign Targets
INDEX idx_campaign_targets_campaign (campaign_id)

-- Campaign Interactions
INDEX idx_campaign_interactions_campaign (campaign_id)
INDEX idx_campaign_interactions_target (target_id)

-- Network Tests
INDEX idx_network_tests_user (user_id)
INDEX idx_network_tests_status (status)

-- Network Vulnerabilities
INDEX idx_network_vulnerabilities_session (test_session_id)

-- Audit Logs
INDEX idx_audit_logs_timestamp (timestamp DESC)
INDEX idx_audit_logs_user (user_id)
INDEX idx_audit_logs_event_type (event_type)
INDEX idx_audit_logs_result (result)

-- Reports
INDEX idx_reports_type (type)
INDEX idx_reports_generated_by (generated_by)
```

