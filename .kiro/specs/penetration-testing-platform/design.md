# وثيقة التصميم - منصة اختبار الاختراق والأمن الهجومي

## نظرة عامة

منصة شاملة لاختبار الاختراق والأمن الهجومي تتكون من ثلاثة مكونات رئيسية مع آليات قوية للتصريح والامتثال القانوني. تم تصميم المنصة لتوفير أدوات اختبار اختراق حقيقية مع ضمان الاستخدام القانوني والأخلاقي فقط.

### الأهداف الرئيسية

1. توفير أدوات اختبار اختراق شاملة وفعالة
2. ضمان الامتثال القانوني والأخلاقي لجميع العمليات
3. حماية البيانات الحساسة وخصوصية المستخدمين
4. توفير تقارير مفصلة وقابلة للتنفيذ
5. دعم التكامل مع أدوات أمنية أخرى

### المبادئ التصميمية

- **الأمان أولاً**: جميع العمليات تتطلب تصريحاً صريحاً
- **الشفافية**: تسجيل شامل لجميع الأنشطة
- **الخصوصية**: تشفير البيانات الحساسة وحذفها التلقائي
- **القابلية للتوسع**: بنية معيارية تدعم إضافة مكونات جديدة
- **سهولة الاستخدام**: واجهات واضحة ووثائق شاملة

## البنية المعمارية

### نظرة عامة على البنية

تتبع المنصة بنية متعددة الطبقات (Multi-tier Architecture) مع فصل واضح بين المكونات:

```
┌─────────────────────────────────────────────────────────────┐
│                    طبقة العرض (Presentation)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web UI      │  │  CLI Tool    │  │  REST API    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│              طبقة التحكم والتصريح (Authorization)           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Authorization Manager - مدير التصاريح والامتثال    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                  طبقة منطق الأعمال (Business)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Web Scanner  │  │   Phishing   │  │   Network    │      │
│  │   Module     │  │    Engine    │  │   Analyzer   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                   طبقة البيانات (Data Layer)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │  File Store  │      │
│  │   Database   │  │    Cache     │  │   (Reports)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```


## تصميم المكونات والواجهات

### 1. مدير التصاريح والامتثال (Authorization Manager)

المكون المركزي المسؤول عن التحقق من التصاريح وضمان الامتثال القانوني.

#### الواجهات الرئيسية

```typescript
interface AuthorizationManager {
  // التحقق من صحة التصريح
  validateAuthorization(
    userId: string,
    target: Target,
    operationType: OperationType
  ): Promise<AuthorizationResult>;
  
  // تحميل وثيقة تصريح جديدة
  uploadAuthorization(
    userId: string,
    document: AuthorizationDocument
  ): Promise<AuthorizationId>;
  
  // التحقق من أن الهدف ضمن النطاق المصرح به
  isTargetInScope(
    authorizationId: string,
    target: Target
  ): Promise<boolean>;
  
  // التحقق من صلاحية التصريح
  isAuthorizationValid(authorizationId: string): Promise<boolean>;
  
  // إلغاء التصريح
  revokeAuthorization(
    authorizationId: string,
    reason: string
  ): Promise<void>;
}

interface AuthorizationDocument {
  organizationName: string;
  scope: Scope;
  validFrom: Date;
  validUntil: Date;
  signedBy: string;
  digitalSignature: string;
  allowedOperations: OperationType[];
}

interface Scope {
  domains: string[];
  ipRanges: string[];
  networks: NetworkIdentifier[];
  emailDomains: string[];
}

type OperationType = 
  | 'WEB_SCAN' 
  | 'PHISHING_CAMPAIGN' 
  | 'NETWORK_ANALYSIS';

interface AuthorizationResult {
  authorized: boolean;
  authorizationId?: string;
  reason?: string;
  expiresAt?: Date;
}
```

#### المسؤوليات

1. التحقق من صحة وثائق التصريح
2. التحقق من تطابق الأهداف مع النطاق المصرح به
3. مراقبة انتهاء صلاحية التصاريح
4. إيقاف العمليات عند انتهاء الصلاحية
5. تسجيل جميع محاولات الوصول


### 2. ماسح ثغرات تطبيقات الويب (Web Scanner Module)

مكون متخصص في فحص تطبيقات الويب واكتشاف الثغرات الأمنية.

#### الواجهات الرئيسية

```typescript
interface WebScanner {
  // بدء عملية فحص جديدة
  startScan(
    userId: string,
    target: WebTarget,
    scanConfig: ScanConfiguration
  ): Promise<ScanSession>;
  
  // الحصول على حالة الفحص
  getScanStatus(sessionId: string): Promise<ScanStatus>;
  
  // إيقاف الفحص
  stopScan(sessionId: string): Promise<void>;
  
  // الحصول على النتائج
  getResults(sessionId: string): Promise<ScanResults>;
}

interface WebTarget {
  url: string;
  authorizationId: string;
}

interface ScanConfiguration {
  vulnerabilityTypes: VulnerabilityType[];
  maxDepth: number;
  maxRequests: number;
  respectRobotsTxt: boolean;
  customHeaders?: Record<string, string>;
}

type VulnerabilityType = 
  | 'SQL_INJECTION'
  | 'XSS'
  | 'CSRF'
  | 'DIRECTORY_TRAVERSAL'
  | 'COMMAND_INJECTION'
  | 'XXE'
  | 'SSRF';

interface ScanSession {
  sessionId: string;
  startedAt: Date;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STOPPED';
}

interface ScanResults {
  sessionId: string;
  target: string;
  vulnerabilities: Vulnerability[];
  summary: ScanSummary;
  completedAt: Date;
}

interface Vulnerability {
  id: string;
  type: VulnerabilityType;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  location: string;
  description: string;
  evidence: string;
  remediation: string;
  cvssScore?: number;
}

interface ScanSummary {
  totalRequests: number;
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}
```

#### آلية الفحص

1. **التحقق من التصريح**: قبل بدء الفحص، يتم التحقق من وجود تصريح صالح
2. **الزحف (Crawling)**: اكتشاف جميع الصفحات والنقاط النهائية
3. **الاختبار**: تنفيذ اختبارات الثغرات على كل نقطة نهاية
4. **التحليل**: تحليل الاستجابات لاكتشاف الثغرات
5. **التقرير**: توليد تقرير شامل بالنتائج


### 3. محرك هجمات التصيد الاحتيالي (Phishing Engine)

مكون متخصص في إنشاء وإدارة حملات التصيد الاحتيالي التدريبية.

#### الواجهات الرئيسية

```typescript
interface PhishingEngine {
  // إنشاء حملة تصيد جديدة
  createCampaign(
    userId: string,
    campaign: PhishingCampaign
  ): Promise<CampaignId>;
  
  // إرسال رسائل الحملة
  launchCampaign(campaignId: string): Promise<void>;
  
  // تتبع التفاعلات
  trackInteraction(
    campaignId: string,
    targetEmail: string,
    interaction: Interaction
  ): Promise<void>;
  
  // الحصول على نتائج الحملة
  getCampaignResults(campaignId: string): Promise<CampaignResults>;
  
  // إنهاء الحملة وإرسال الإشعارات
  completeCampaign(campaignId: string): Promise<void>;
}

interface PhishingCampaign {
  name: string;
  authorizationId: string;
  targets: EmailTarget[];
  emailTemplate: EmailTemplate;
  landingPage: LandingPageConfig;
  schedule: CampaignSchedule;
}

interface EmailTarget {
  email: string;
  name?: string;
  department?: string;
}

interface EmailTemplate {
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
  trackingEnabled: boolean;
  disclaimer: string; // إخلاء المسؤولية الإلزامي
}

interface LandingPageConfig {
  pageType: 'CREDENTIAL_HARVEST' | 'DOWNLOAD_PROMPT' | 'SURVEY';
  customHtml?: string;
  captureFields: string[];
}

interface CampaignSchedule {
  startDate: Date;
  endDate: Date;
  sendingPattern: 'IMMEDIATE' | 'STAGGERED' | 'SCHEDULED';
}

interface Interaction {
  type: 'EMAIL_OPENED' | 'LINK_CLICKED' | 'CREDENTIALS_ENTERED' | 'FILE_DOWNLOADED';
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  geolocation?: string;
  capturedData?: Record<string, string>; // مشفر
}

interface CampaignResults {
  campaignId: string;
  totalTargets: number;
  emailsOpened: number;
  linksClicked: number;
  credentialsEntered: number;
  interactions: InteractionSummary[];
  completedAt: Date;
}

interface InteractionSummary {
  targetEmail: string;
  interactions: Interaction[];
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

#### آلية العمل

1. **التحقق من التصريح**: التأكد من وجود موافقة كتابية من المنظمة
2. **إعداد البنية التحتية**: إنشاء صفحات الهبوط وروابط التتبع
3. **الإرسال**: إرسال رسائل البريد الإلكتروني حسب الجدول المحدد
4. **التتبع**: تسجيل جميع التفاعلات في الوقت الفعلي
5. **التشفير**: تشفير أي بيانات حساسة تم جمعها
6. **الإشعار**: إرسال إشعارات للأهداف بعد انتهاء الحملة
7. **الحذف التلقائي**: حذف البيانات الحساسة بعد 30 يوماً


### 4. محلل الشبكات اللاسلكية (Network Analyzer)

مكون متخصص في اختبار أمان الشبكات اللاسلكية.

#### الواجهات الرئيسية

```typescript
interface NetworkAnalyzer {
  // اكتشاف نقاط الوصول
  discoverAccessPoints(
    userId: string,
    authorizationId: string
  ): Promise<AccessPoint[]>;
  
  // بدء اختبار شبكة
  startNetworkTest(
    userId: string,
    target: NetworkTarget,
    testConfig: NetworkTestConfig
  ): Promise<TestSession>;
  
  // الحصول على حالة الاختبار
  getTestStatus(sessionId: string): Promise<TestStatus>;
  
  // إيقاف الاختبار
  stopTest(sessionId: string): Promise<void>;
  
  // الحصول على النتائج
  getNetworkResults(sessionId: string): Promise<NetworkResults>;
}

interface NetworkTarget {
  ssid: string;
  bssid: string;
  authorizationId: string;
}

interface NetworkTestConfig {
  testTypes: NetworkTestType[];
  passwordDictionary?: string;
  maxAttempts: number;
}

type NetworkTestType = 
  | 'WEP_CRACK'
  | 'WPA_HANDSHAKE_CAPTURE'
  | 'WPS_ATTACK'
  | 'EVIL_TWIN'
  | 'DEAUTH_ATTACK'
  | 'TRAFFIC_ANALYSIS';

interface AccessPoint {
  ssid: string;
  bssid: string;
  channel: number;
  encryption: 'OPEN' | 'WEP' | 'WPA' | 'WPA2' | 'WPA3';
  signalStrength: number;
  vendor?: string;
}

interface TestSession {
  sessionId: string;
  startedAt: Date;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STOPPED';
}

interface NetworkResults {
  sessionId: string;
  target: NetworkTarget;
  vulnerabilities: NetworkVulnerability[];
  connectedDevices?: Device[];
  trafficAnalysis?: TrafficSummary;
  completedAt: Date;
}

interface NetworkVulnerability {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  evidence: string;
  remediation: string;
}

interface Device {
  macAddress: string;
  ipAddress?: string;
  hostname?: string;
  vendor?: string;
}

interface TrafficSummary {
  totalPackets: number;
  protocols: Record<string, number>;
  insecureProtocols: string[];
}
```

#### آلية العمل

1. **التحقق من التصريح**: التأكد من وجود موافقة كتابية من مالك الشبكة
2. **الاكتشاف**: فحص نقاط الوصول المتاحة
3. **الاختبار**: تنفيذ اختبارات الأمان المصرح بها فقط
4. **التحليل**: تحليل حركة المرور والأجهزة المتصلة
5. **التوثيق**: توثيق الثغرات دون استغلالها
6. **الإشعار**: إرسال تنبيهات فورية عند اكتشاف ثغرات خطيرة
7. **الحذف**: حذف البيانات الحساسة بعد إنشاء التقرير


### 5. مولد التقارير (Report Generator)

مكون مسؤول عن توليد تقارير شاملة لجميع أنواع الاختبارات.

#### الواجهات الرئيسية

```typescript
interface ReportGenerator {
  // توليد تقرير فحص ويب
  generateWebScanReport(
    sessionId: string,
    format: ReportFormat
  ): Promise<Report>;
  
  // توليد تقرير حملة تصيد
  generatePhishingReport(
    campaignId: string,
    format: ReportFormat
  ): Promise<Report>;
  
  // توليد تقرير تحليل شبكة
  generateNetworkReport(
    sessionId: string,
    format: ReportFormat
  ): Promise<Report>;
  
  // توليد تقرير امتثال
  generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<Report>;
}

type ReportFormat = 'PDF' | 'HTML' | 'JSON' | 'CSV';

interface Report {
  id: string;
  type: ReportType;
  format: ReportFormat;
  content: Buffer | string;
  metadata: ReportMetadata;
  generatedAt: Date;
}

type ReportType = 
  | 'WEB_SCAN'
  | 'PHISHING_CAMPAIGN'
  | 'NETWORK_ANALYSIS'
  | 'COMPLIANCE';

interface ReportMetadata {
  title: string;
  author: string;
  organization: string;
  confidentialityLevel: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
}
```

### 6. نظام المصادقة والتفويض (Authentication & Authorization System)

#### الواجهات الرئيسية

```typescript
interface AuthenticationService {
  // تسجيل الدخول
  login(
    username: string,
    password: string,
    mfaToken?: string
  ): Promise<AuthToken>;
  
  // تسجيل الخروج
  logout(token: string): Promise<void>;
  
  // تحديث الرمز
  refreshToken(token: string): Promise<AuthToken>;
  
  // التحقق من الرمز
  validateToken(token: string): Promise<TokenValidation>;
}

interface AuthorizationService {
  // التحقق من الصلاحيات
  checkPermission(
    userId: string,
    resource: string,
    action: Action
  ): Promise<boolean>;
  
  // الحصول على أدوار المستخدم
  getUserRoles(userId: string): Promise<Role[]>;
  
  // منح صلاحية
  grantPermission(
    userId: string,
    permission: Permission
  ): Promise<void>;
}

type Action = 'READ' | 'WRITE' | 'DELETE' | 'EXECUTE';

interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

interface Permission {
  resource: string;
  actions: Action[];
}

interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
}

interface TokenValidation {
  valid: boolean;
  userId?: string;
  expiresAt?: Date;
}
```


### 7. نظام التدقيق والسجلات (Audit & Logging System)

#### الواجهات الرئيسية

```typescript
interface AuditLogger {
  // تسجيل حدث
  logEvent(event: AuditEvent): Promise<void>;
  
  // البحث في السجلات
  searchLogs(
    criteria: SearchCriteria
  ): Promise<AuditEvent[]>;
  
  // الحصول على سجلات مستخدم
  getUserActivity(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AuditEvent[]>;
  
  // تصدير السجلات
  exportLogs(
    criteria: SearchCriteria,
    format: 'JSON' | 'CSV'
  ): Promise<Buffer>;
}

interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  eventType: EventType;
  resource: string;
  action: string;
  result: 'SUCCESS' | 'FAILURE';
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
}

type EventType = 
  | 'AUTHENTICATION'
  | 'AUTHORIZATION_CHECK'
  | 'SCAN_STARTED'
  | 'SCAN_COMPLETED'
  | 'CAMPAIGN_LAUNCHED'
  | 'NETWORK_TEST_STARTED'
  | 'AUTHORIZATION_UPLOADED'
  | 'AUTHORIZATION_REVOKED'
  | 'DATA_ACCESSED'
  | 'DATA_DELETED'
  | 'SECURITY_VIOLATION';

interface SearchCriteria {
  userId?: string;
  eventTypes?: EventType[];
  startDate?: Date;
  endDate?: Date;
  result?: 'SUCCESS' | 'FAILURE';
}
```

## نماذج البيانات (Data Models)

### مخطط قاعدة البيانات

#### جدول المستخدمين (users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  account_locked BOOLEAN DEFAULT FALSE,
  failed_login_attempts INTEGER DEFAULT 0
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

#### جدول الأدوار والصلاحيات (roles & permissions)

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  UNIQUE(resource, action)
);

CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);
```


#### جدول التصاريح (authorizations)

```sql
CREATE TABLE authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organization_name VARCHAR(255) NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  signed_by VARCHAR(255) NOT NULL,
  digital_signature TEXT NOT NULL,
  document_path VARCHAR(500) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,
  revocation_reason TEXT
);

CREATE TABLE authorization_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  authorization_id UUID REFERENCES authorizations(id) ON DELETE CASCADE,
  scope_type VARCHAR(50) NOT NULL, -- 'DOMAIN', 'IP_RANGE', 'NETWORK', 'EMAIL_DOMAIN'
  scope_value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE authorization_operations (
  authorization_id UUID REFERENCES authorizations(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL, -- 'WEB_SCAN', 'PHISHING_CAMPAIGN', 'NETWORK_ANALYSIS'
  PRIMARY KEY (authorization_id, operation_type)
);

CREATE INDEX idx_authorizations_user ON authorizations(user_id);
CREATE INDEX idx_authorizations_status ON authorizations(status);
CREATE INDEX idx_authorizations_validity ON authorizations(valid_from, valid_until);
```

#### جدول جلسات الفحص (scan_sessions)

```sql
CREATE TABLE scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  authorization_id UUID REFERENCES authorizations(id),
  target_url TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  total_requests INTEGER DEFAULT 0,
  total_vulnerabilities INTEGER DEFAULT 0,
  config JSONB NOT NULL
);

CREATE TABLE vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_session_id UUID REFERENCES scan_sessions(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT,
  remediation TEXT,
  cvss_score DECIMAL(3,1),
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scan_sessions_user ON scan_sessions(user_id);
CREATE INDEX idx_scan_sessions_status ON scan_sessions(status);
CREATE INDEX idx_vulnerabilities_session ON vulnerabilities(scan_session_id);
CREATE INDEX idx_vulnerabilities_severity ON vulnerabilities(severity);
```

#### جدول حملات التصيد (phishing_campaigns)

```sql
CREATE TABLE phishing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  authorization_id UUID REFERENCES authorizations(id),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'DRAFT',
  email_template JSONB NOT NULL,
  landing_page_config JSONB NOT NULL,
  schedule JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  launched_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE campaign_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES phishing_campaigns(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  department VARCHAR(255),
  tracking_token VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE campaign_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES phishing_campaigns(id) ON DELETE CASCADE,
  target_id UUID REFERENCES campaign_targets(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  geolocation VARCHAR(255),
  captured_data BYTEA -- مشفر
);

CREATE INDEX idx_campaigns_user ON phishing_campaigns(user_id);
CREATE INDEX idx_campaigns_status ON phishing_campaigns(status);
CREATE INDEX idx_campaign_targets_campaign ON campaign_targets(campaign_id);
CREATE INDEX idx_campaign_interactions_campaign ON campaign_interactions(campaign_id);
CREATE INDEX idx_campaign_interactions_target ON campaign_interactions(target_id);
```


#### جدول اختبارات الشبكات (network_tests)

```sql
CREATE TABLE network_test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  authorization_id UUID REFERENCES authorizations(id),
  ssid VARCHAR(255) NOT NULL,
  bssid VARCHAR(17) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  config JSONB NOT NULL
);

CREATE TABLE network_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_session_id UUID REFERENCES network_test_sessions(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  evidence TEXT,
  remediation TEXT,
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE discovered_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_session_id UUID REFERENCES network_test_sessions(id) ON DELETE CASCADE,
  mac_address VARCHAR(17) NOT NULL,
  ip_address INET,
  hostname VARCHAR(255),
  vendor VARCHAR(255),
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_network_tests_user ON network_test_sessions(user_id);
CREATE INDEX idx_network_tests_status ON network_test_sessions(status);
CREATE INDEX idx_network_vulnerabilities_session ON network_vulnerabilities(test_session_id);
```

#### جدول السجلات والتدقيق (audit_logs)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  resource VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  result VARCHAR(50) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_result ON audit_logs(result);

-- جدول لتخزين التقارير
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  metadata JSONB,
  generated_by UUID REFERENCES users(id),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX idx_reports_type ON reports(type);
CREATE INDEX idx_reports_generated_by ON reports(generated_by);
```


## تصميم واجهة برمجة التطبيقات (API Design)

### نقاط النهاية الرئيسية

#### 1. المصادقة والتفويض

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
POST   /api/v1/auth/mfa/enable
POST   /api/v1/auth/mfa/verify
```

#### 2. إدارة التصاريح

```
POST   /api/v1/authorizations
GET    /api/v1/authorizations
GET    /api/v1/authorizations/:id
PUT    /api/v1/authorizations/:id
DELETE /api/v1/authorizations/:id
POST   /api/v1/authorizations/:id/validate
POST   /api/v1/authorizations/:id/revoke
```

#### 3. فحص تطبيقات الويب

```
POST   /api/v1/scans/web
GET    /api/v1/scans/web
GET    /api/v1/scans/web/:id
GET    /api/v1/scans/web/:id/status
POST   /api/v1/scans/web/:id/stop
GET    /api/v1/scans/web/:id/results
GET    /api/v1/scans/web/:id/vulnerabilities
GET    /api/v1/scans/web/:id/report
```

#### 4. حملات التصيد الاحتيالي

```
POST   /api/v1/phishing/campaigns
GET    /api/v1/phishing/campaigns
GET    /api/v1/phishing/campaigns/:id
PUT    /api/v1/phishing/campaigns/:id
DELETE /api/v1/phishing/campaigns/:id
POST   /api/v1/phishing/campaigns/:id/launch
POST   /api/v1/phishing/campaigns/:id/complete
GET    /api/v1/phishing/campaigns/:id/results
GET    /api/v1/phishing/campaigns/:id/interactions
GET    /api/v1/phishing/campaigns/:id/report
```

#### 5. تحليل الشبكات اللاسلكية

```
POST   /api/v1/network/discover
POST   /api/v1/network/tests
GET    /api/v1/network/tests
GET    /api/v1/network/tests/:id
GET    /api/v1/network/tests/:id/status
POST   /api/v1/network/tests/:id/stop
GET    /api/v1/network/tests/:id/results
GET    /api/v1/network/tests/:id/vulnerabilities
GET    /api/v1/network/tests/:id/devices
GET    /api/v1/network/tests/:id/report
```

#### 6. التقارير

```
GET    /api/v1/reports
GET    /api/v1/reports/:id
POST   /api/v1/reports/compliance
DELETE /api/v1/reports/:id
```

#### 7. التدقيق والسجلات

```
GET    /api/v1/audit/logs
GET    /api/v1/audit/logs/export
GET    /api/v1/audit/users/:userId/activity
```

### أمثلة على الطلبات والاستجابات

#### بدء فحص ويب

**الطلب:**
```http
POST /api/v1/scans/web
Authorization: Bearer <token>
Content-Type: application/json

{
  "target": {
    "url": "https://example.com",
    "authorizationId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "config": {
    "vulnerabilityTypes": ["SQL_INJECTION", "XSS", "CSRF"],
    "maxDepth": 3,
    "maxRequests": 1000,
    "respectRobotsTxt": true
  }
}
```

**الاستجابة:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "sessionId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "RUNNING",
  "startedAt": "2024-01-15T10:30:00Z",
  "estimatedCompletion": "2024-01-15T11:00:00Z"
}
```

#### إنشاء حملة تصيد

**الطلب:**
```http
POST /api/v1/phishing/campaigns
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Q1 Security Awareness Test",
  "authorizationId": "550e8400-e29b-41d4-a716-446655440000",
  "targets": [
    {
      "email": "employee1@company.com",
      "name": "Employee One",
      "department": "IT"
    }
  ],
  "emailTemplate": {
    "subject": "Urgent: Password Reset Required",
    "body": "Please click here to reset your password...",
    "senderName": "IT Support",
    "senderEmail": "support@company.com",
    "trackingEnabled": true,
    "disclaimer": "This is a security awareness test..."
  },
  "landingPage": {
    "pageType": "CREDENTIAL_HARVEST",
    "captureFields": ["username", "password"]
  },
  "schedule": {
    "startDate": "2024-01-20T09:00:00Z",
    "endDate": "2024-01-27T17:00:00Z",
    "sendingPattern": "STAGGERED"
  }
}
```


## الاعتبارات الأمنية

### 1. التشفير

#### تشفير البيانات في حالة السكون (At Rest)

- استخدام AES-256 لتشفير البيانات الحساسة في قاعدة البيانات
- تشفير بيانات الاعتماد المجمعة من حملات التصيد
- تشفير وثائق التصريح المخزنة
- استخدام Transparent Data Encryption (TDE) لقاعدة البيانات

```typescript
interface EncryptionService {
  encrypt(data: string | Buffer, key: string): Promise<Buffer>;
  decrypt(encryptedData: Buffer, key: string): Promise<string | Buffer>;
  generateKey(): Promise<string>;
}
```

#### تشفير البيانات أثناء النقل (In Transit)

- إلزام استخدام TLS 1.3 أو أحدث لجميع الاتصالات
- استخدام HSTS (HTTP Strict Transport Security)
- تطبيق Certificate Pinning للتطبيقات المحمولة
- تشفير الاتصالات بين المكونات الداخلية

### 2. إدارة المفاتيح

- استخدام AWS KMS أو HashiCorp Vault لإدارة المفاتيح
- تدوير المفاتيح بشكل دوري (كل 90 يوماً)
- فصل مفاتيح التشفير عن كود التطبيق
- استخدام HSM (Hardware Security Module) للمفاتيح الحساسة

### 3. المصادقة والتفويض

#### المصادقة متعددة العوامل (MFA)

- إلزامية لجميع الحسابات ذات الامتيازات العالية
- دعم TOTP (Time-based One-Time Password)
- دعم U2F/WebAuthn للمفاتيح الأمنية
- خيار استخدام رسائل SMS كعامل ثانوي

#### إدارة الجلسات

```typescript
interface SessionManager {
  createSession(userId: string): Promise<Session>;
  validateSession(sessionId: string): Promise<boolean>;
  invalidateSession(sessionId: string): Promise<void>;
  refreshSession(sessionId: string): Promise<Session>;
}

interface Session {
  id: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
}
```

- انتهاء صلاحية الجلسات بعد 30 دقيقة من عدم النشاط
- انتهاء صلاحية الجلسات بعد 8 ساعات كحد أقصى
- إلغاء جميع الجلسات عند تغيير كلمة المرور
- تسجيل جميع الجلسات النشطة

### 4. الحماية من الهجمات الشائعة

#### حماية من CSRF

- استخدام CSRF tokens لجميع الطلبات المعدلة
- التحقق من Origin و Referer headers
- استخدام SameSite cookies

#### حماية من XSS

- تنظيف جميع المدخلات من المستخدمين
- استخدام Content Security Policy (CSP)
- تشفير المخرجات في HTML

#### حماية من SQL Injection

- استخدام Prepared Statements حصرياً
- عدم بناء استعلامات SQL ديناميكية
- استخدام ORM مع معاملات آمنة

#### حماية من DDoS

- تطبيق Rate Limiting على جميع نقاط النهاية
- استخدام WAF (Web Application Firewall)
- تطبيق CAPTCHA عند الحاجة

```typescript
interface RateLimiter {
  checkLimit(
    identifier: string,
    limit: number,
    window: number
  ): Promise<RateLimitResult>;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}
```

### 5. التحقق من المدخلات

```typescript
interface InputValidator {
  validateUrl(url: string): ValidationResult;
  validateEmail(email: string): ValidationResult;
  validateIpAddress(ip: string): ValidationResult;
  validateMacAddress(mac: string): ValidationResult;
  sanitizeHtml(html: string): string;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
}
```

- التحقق من جميع المدخلات على مستوى API
- رفض المدخلات غير الصالحة مع رسائل خطأ واضحة
- تطبيق قوائم بيضاء للقيم المسموحة
- الحد الأقصى لحجم المدخلات

### 6. الأمان التشغيلي

#### مراقبة الأمان

- تنبيهات فورية عند محاولات الوصول غير المصرح بها
- مراقبة الأنماط غير الطبيعية في الاستخدام
- تتبع محاولات تجاوز ضوابط التصريح
- مراقبة استخدام الموارد

#### النسخ الاحتياطي والاستعادة

- نسخ احتياطية يومية مشفرة لقاعدة البيانات
- اختبار دوري لعمليات الاستعادة
- تخزين النسخ الاحتياطية في مواقع متعددة
- الاحتفاظ بالنسخ الاحتياطية لمدة 90 يوماً


## خصائص الصحة (Correctness Properties)

الخاصية هي سمة أو سلوك يجب أن يكون صحيحاً عبر جميع عمليات التنفيذ الصالحة للنظام - في الأساس، بيان رسمي حول ما يجب أن يفعله النظام. تعمل الخصائص كجسر بين المواصفات المقروءة للإنسان وضمانات الصحة القابلة للتحقق آلياً.

### تحليل التفكير في الخصائص (Property Reflection)

بعد مراجعة جميع معايير القبول، تم تحديد الخصائص التالية التي يمكن دمجها أو تبسيطها:

**الخصائص المتكررة التي تم دمجها:**

1. **التحقق من التصريح**: المعايير 0.1، 1.1، 3.1، 5.1 جميعها تتطلب التحقق من التصريح قبل أي عملية - يمكن دمجها في خاصية واحدة شاملة
2. **التحقق من النطاق**: المعايير 0.2، 0.4، 3.2، 5.2 جميعها تتعلق بالتحقق من أن الأهداف ضمن النطاق المصرح به - يمكن دمجها
3. **التسجيل الشامل**: المعايير 0.6، 7.4، 9.4، 10.7، 11.1 جميعها تتطلب تسجيل العمليات - يمكن دمجها في خاصية واحدة
4. **تشفير البيانات**: المعايير 3.7، 6.6، 8.1، 8.3 جميعها تتطلب تشفير البيانات الحساسة - يمكن دمجها
5. **توليد التقارير**: المعايير 1.5، 2.1، 4.1 جميعها تتعلق بتوليد تقارير بعد اكتمال العمليات - يمكن دمجها
6. **الحذف التلقائي**: المعايير 4.3، 6.7، 8.4 جميعها تتطلب حذف البيانات الحساسة تلقائياً - يمكن دمجها

### الخصائص الأساسية

#### الخاصية 1: التحقق الإلزامي من التصريح قبل أي عملية

*لأي* عملية اختبار اختراق (فحص ويب، حملة تصيد، اختبار شبكة)، يجب على النظام رفض العملية إذا لم يكن هناك تصريح صالح يغطي الهدف المحدد

**يتحقق من: المتطلبات 0.1، 1.1، 3.1، 5.1**

#### الخاصية 2: التحقق من النطاق المصرح به

*لأي* تصريح وأي هدف، يجب على النظام قبول العملية فقط إذا كان الهدف ضمن نطاق العمل المحدد في التصريح (النطاقات، نطاقات IP، الشبكات، نطاقات البريد الإلكتروني)

**يتحقق من: المتطلبات 0.2، 0.4، 3.2، 5.2**

#### الخاصية 3: تخزين التصريح الكامل

*لأي* تصريح محمل، يجب على النظام تخزين جميع المعلومات الضرورية (اسم المنظمة، النطاق، تاريخ الصلاحية، التوقيع الرقمي، العمليات المسموحة) في قاعدة البيانات

**يتحقق من: المتطلبات 0.3**

#### الخاصية 4: إيقاف العمليات عند انتهاء التصريح

*لأي* تصريح منتهي الصلاحية، يجب على النظام إيقاف جميع العمليات الجارية المرتبطة به ورفض أي عمليات جديدة

**يتحقق من: المتطلبات 0.5**

#### الخاصية 5: التسجيل الشامل لجميع العمليات

*لأي* عملية في النظام (مصادقة، تصريح، فحص، حملة، اختبار شبكة)، يجب على النظام إنشاء سجل تدقيق يحتوي على (المستخدم، الطابع الزمني، نوع العملية، الهدف، النتيجة، عنوان IP)

**يتحقق من: المتطلبات 0.6، 7.4، 9.4، 10.7، 11.1**

#### الخاصية 6: حظر محاولات تجاوز التصريح

*لأي* محاولة لتجاوز ضوابط التصريح، يجب على النظام حظر الحساب فوراً، تسجيل المحاولة، وإرسال تنبيه للمدقق

**يتحقق من: المتطلبات 0.7، 11.4**

#### الخاصية 7: اختبار جميع أنواع الثغرات المحددة

*لأي* عملية فحص ويب، يجب على الماسح اختبار جميع أنواع الثغرات المحددة في التكوين (SQL Injection، XSS، CSRF، Directory Traversal، إلخ)

**يتحقق من: المتطلبات 1.3**

#### الخاصية 8: تسجيل الثغرات المكتشفة

*لأي* ثغرة مكتشفة، يجب على النظام تسجيل (النوع، مستوى الخطورة، الموقع، الوصف، الدليل، التوصيات) في قاعدة البيانات

**يتحقق من: المتطلبات 1.4**

#### الخاصية 9: توليد تقرير شامل بعد اكتمال العملية

*لأي* عملية مكتملة (فحص ويب، حملة تصيد، اختبار شبكة)، يجب على النظام توليد تقرير يحتوي على جميع النتائج والتوصيات وتخزينه في قاعدة البيانات

**يتحقق من: المتطلبات 1.5، 2.1، 4.1، 5.7**

#### الخاصية 10: احترام ملف robots.txt

*لأي* عملية فحص ويب، يجب على الماسح قراءة واحترام قواعد ملف robots.txt للنطاق المستهدف

**يتحقق من: المتطلبات 1.6**

#### الخاصية 11: إيقاف الفحص عند اكتشاف هدف خارج النطاق

*لأي* عملية فحص، إذا اكتشف النظام أن الهدف الحالي خارج نطاق العمل المصرح به، يجب إيقاف الفحص فوراً

**يتحقق من: المتطلبات 1.7**

#### الخاصية 12: محتوى التقرير الكامل

*لأي* تقرير ثغرات، يجب أن يحتوي على (وصف كل ثغرة، مستوى الخطورة، خطوات إعادة الإنتاج، توصيات الإصلاح) لجميع الثغرات المكتشفة

**يتحقق من: المتطلبات 2.2**

#### الخاصية 13: دعم تنسيقات التقارير المتعددة

*لأي* طلب تقرير، يجب على النظام توفير التقرير بالتنسيق المطلوب (PDF، HTML، JSON، CSV)

**يتحقق من: المتطلبات 2.3، 4.6**

#### الخاصية 14: تصنيف الثغرات حسب الخطورة

*لأي* ثغرة مكتشفة، يجب على النظام تصنيفها إلى أحد المستويات (حرج، عالي، متوسط، منخفض) بناءً على معايير محددة

**يتحقق من: المتطلبات 2.4**

#### الخاصية 15: إخلاء المسؤولية الإلزامي في رسائل التصيد

*لأي* رسالة تصيد احتيالي، يجب أن تحتوي على إخلاء مسؤولية واضح في التذييل يوضح أنها حملة تدريبية

**يتحقق من: المتطلبات 3.5**

#### الخاصية 16: تتبع التفاعلات مع رسائل التصيد

*لأي* تفاعل مع رسالة تصيد (فتح، نقر، إدخال بيانات)، يجب على النظام تسجيل (نوع التفاعل، الطابع الزمني، عنوان IP، المتصفح، الموقع الجغرافي)

**يتحقق من: المتطلبات 3.6، 3.8**

#### الخاصية 17: تشفير البيانات الحساسة المجمعة

*لأي* بيانات حساسة مجمعة (بيانات اعتماد، معلومات شخصية، بيانات شبكة)، يجب على النظام تشفيرها باستخدام AES-256 قبل التخزين

**يتحقق من: المتطلبات 3.7، 6.6، 8.1، 8.3**

#### الخاصية 18: إشعار الأهداف بعد انتهاء الحملة

*لأي* حملة تصيد مكتملة، يجب على النظام إرسال إشعار فوري لجميع الأهداف يوضح أنها كانت حملة تدريبية

**يتحقق من: المتطلبات 3.9**

#### الخاصية 19: الحذف التلقائي للبيانات الحساسة

*لأي* بيانات حساسة (بيانات اعتماد من حملات التصيد، بيانات شبكة)، يجب على النظام حذفها تلقائياً بعد الفترة المحددة (30 يوماً للحملات، فوراً بعد التقرير للشبكات)

**يتحقق من: المتطلبات 4.3، 6.7، 8.4**

#### الخاصية 20: اكتشاف نقاط الوصول اللاسلكية

*لأي* عملية اكتشاف شبكات، يجب على المحلل اكتشاف وإرجاع جميع نقاط الوصول المتاحة مع معلوماتها (SSID، BSSID، القناة، نوع التشفير، قوة الإشارة)

**يتحقق من: المتطلبات 5.3**

#### الخاصية 21: تنفيذ اختبارات الشبكة المحددة فقط

*لأي* اختبار شبكة، يجب على المحلل تنفيذ فقط أنواع الاختبارات المحددة في التكوين والمصرح بها في التصريح

**يتحقق من: المتطلبات 5.4، 5.6**

#### الخاصية 22: إشعار فوري عند اكتشاف ثغرة خطيرة

*لأي* ثغرة بمستوى خطورة "حرج"، يجب على النظام إرسال إشعار فوري لمالك الهدف (النطاق أو الشبكة)

**يتحقق من: المتطلبات 5.8**

#### الخاصية 23: توثيق الثغرات دون استغلال

*لأي* ثغرة مكتشفة، يجب على النظام توثيقها بالكامل دون استغلالها لأغراض ضارة أو الوصول غير المصرح به

**يتحقق من: المتطلبات 6.4، 6.8**

#### الخاصية 24: المصادقة الإلزامية للوصول

*لأي* محاولة وصول إلى النظام، يجب رفض الوصول إذا لم يتم تقديم بيانات اعتماد صالحة

**يتحقق من: المتطلبات 7.1**

#### الخاصية 25: التفويض بناءً على الأدوار

*لأي* مستخدم مصادق، يجب على النظام منح الوصول إلى الموارد والعمليات بناءً على الأدوار والصلاحيات المخصصة له فقط

**يتحقق من: المتطلبات 7.3**

#### الخاصية 26: قفل الحساب بعد محاولات فاشلة

*لأي* حساب مستخدم، بعد عدد محدد من محاولات تسجيل الدخول الفاشلة المتتالية (مثلاً 5 محاولات)، يجب على النظام قفل الحساب مؤقتاً

**يتحقق من: المتطلبات 7.5**

#### الخاصية 27: حذف آمن للبيانات عند الطلب

*لأي* طلب حذف بيانات من مستخدم مصرح، يجب على النظام حذف جميع البيانات المرتبطة بشكل آمن (overwrite) من قاعدة البيانات والنسخ الاحتياطية

**يتحقق من: المتطلبات 8.5**

#### الخاصية 28: تسجيل الأخطاء مع السياق

*لأي* خطأ يحدث في النظام، يجب تسجيل (نوع الخطأ، مستوى الخطورة، السياق، الطابع الزمني، stack trace) في نظام السجلات

**يتحقق من: المتطلبات 9.1**

#### الخاصية 29: تصنيف الأخطاء حسب الخطورة

*لأي* خطأ مسجل، يجب تصنيفه إلى أحد المستويات (معلومات، تحذير، خطأ، حرج) بناءً على تأثيره على النظام

**يتحقق من: المتطلبات 9.2**

#### الخاصية 30: رسائل خطأ آمنة للمستخدمين

*لأي* خطأ يحدث، يجب على النظام إرجاع رسالة خطأ واضحة للمستخدم دون كشف معلومات حساسة (مثل تفاصيل قاعدة البيانات أو مسارات الملفات)

**يتحقق من: المتطلبات 9.3**

#### الخاصية 31: ضوابط الوصول للسجلات

*لأي* محاولة وصول إلى السجلات، يجب على النظام التحقق من أن المستخدم لديه الصلاحيات المناسبة (مدقق أو مسؤول)

**يتحقق من: المتطلبات 9.5**

#### الخاصية 32: التحقق من صحة مدخلات API

*لأي* طلب API، يجب على النظام التحقق من صحة جميع المدخلات (نوع البيانات، التنسيق، النطاق) ورفض الطلبات غير الصالحة مع رسالة خطأ واضحة

**يتحقق من: المتطلبات 10.2**

#### الخاصية 33: التحقق من التصريح في API

*لأي* طلب API لعملية اختبار اختراق، يجب على النظام التحقق من وجود تصريح صالح قبل تنفيذ العملية

**يتحقق من: المتطلبات 10.4**

#### الخاصية 34: رموز حالة HTTP مناسبة

*لأي* استجابة API، يجب استخدام رمز حالة HTTP المناسب (200 للنجاح، 400 لخطأ العميل، 401 لعدم المصادقة، 403 لعدم التفويض، 500 لخطأ الخادم)

**يتحقق من: المتطلبات 10.5**

#### الخاصية 35: إشعار فوري للمدقق عند العمليات الحساسة

*لأي* عملية حساسة (تحميل تصريح، بدء فحص، إطلاق حملة، محاولة تجاوز)، يجب على النظام إرسال إشعار فوري للمدقق

**يتحقق من: المتطلبات 11.2**

#### الخاصية 36: الاحتفاظ بسجلات التدقيق

*لأي* سجل تدقيق، يجب على النظام الاحتفاظ به لمدة لا تقل عن 7 سنوات في تخزين آمن ومشفر

**يتحقق من: المتطلبات 11.6**

#### الخاصية 37: توفير السجلات للمراجعة

*لأي* طلب مراجعة من المدقق، يجب على النظام توفير جميع السجلات ذات الصلة بتنسيق قابل للتدقيق (CSV، JSON) مع إمكانية التصفية والبحث

**يتحقق من: المتطلبات 11.7**


## معالجة الأخطاء (Error Handling)

### استراتيجية معالجة الأخطاء

#### 1. تصنيف الأخطاء

```typescript
enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  NETWORK = 'NETWORK',
  SYSTEM = 'SYSTEM'
}

interface ApplicationError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: Date;
  context?: Record<string, any>;
  stackTrace?: string;
  userId?: string;
}
```

#### 2. أنواع الأخطاء المخصصة

```typescript
class AuthorizationError extends Error {
  constructor(message: string, public authorizationId?: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

class ScopeViolationError extends Error {
  constructor(
    message: string,
    public target: string,
    public scope: Scope
  ) {
    super(message);
    this.name = 'ScopeViolationError';
  }
}

class ExpiredAuthorizationError extends Error {
  constructor(
    message: string,
    public authorizationId: string,
    public expiredAt: Date
  ) {
    super(message);
    this.name = 'ExpiredAuthorizationError';
  }
}
```

#### 3. معالج الأخطاء المركزي

```typescript
interface ErrorHandler {
  handleError(error: Error): ErrorResponse;
  logError(error: ApplicationError): Promise<void>;
  notifyAdministrators(error: ApplicationError): Promise<void>;
}

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
  requestId: string;
}
```

#### 4. سياسات إعادة المحاولة

```typescript
interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'LINEAR' | 'EXPONENTIAL';
  initialDelay: number;
  maxDelay: number;
  retryableErrors: ErrorCategory[];
}

const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  backoffStrategy: 'EXPONENTIAL',
  initialDelay: 1000,
  maxDelay: 30000,
  retryableErrors: [
    ErrorCategory.EXTERNAL_SERVICE,
    ErrorCategory.NETWORK
  ]
};
```

### سيناريوهات معالجة الأخطاء

#### 1. فشل التحقق من التصريح

```typescript
// عند فشل التحقق من التصريح
if (!authorization || !authorization.isValid()) {
  throw new AuthorizationError(
    'No valid authorization found for this operation',
    authorizationId
  );
}

// الاستجابة للمستخدم
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_REQUIRED",
    "message": "This operation requires a valid authorization document",
    "details": {
      "requiredScope": ["example.com"],
      "operationType": "WEB_SCAN"
    }
  }
}
```

#### 2. هدف خارج النطاق المصرح به

```typescript
// عند محاولة فحص هدف خارج النطاق
if (!isTargetInScope(target, authorization.scope)) {
  // تسجيل المحاولة
  await auditLogger.logEvent({
    eventType: 'SCOPE_VIOLATION',
    userId: userId,
    target: target,
    result: 'FAILURE'
  });
  
  // إيقاف العملية
  throw new ScopeViolationError(
    'Target is outside authorized scope',
    target,
    authorization.scope
  );
}

// الاستجابة للمستخدم
{
  "success": false,
  "error": {
    "code": "SCOPE_VIOLATION",
    "message": "The target is outside the authorized scope",
    "details": {
      "target": "unauthorized-domain.com",
      "authorizedScope": ["example.com", "test.example.com"]
    }
  }
}
```

#### 3. انتهاء صلاحية التصريح أثناء العملية

```typescript
// مراقبة دورية لصلاحية التصريح
setInterval(async () => {
  const activeOperations = await getActiveOperations();
  
  for (const operation of activeOperations) {
    const authorization = await getAuthorization(operation.authorizationId);
    
    if (authorization.isExpired()) {
      // إيقاف العملية
      await stopOperation(operation.id);
      
      // إشعار المستخدم
      await notifyUser(operation.userId, {
        type: 'AUTHORIZATION_EXPIRED',
        message: 'Your authorization has expired. Please renew it to continue.',
        operationId: operation.id
      });
      
      // تسجيل الحدث
      await auditLogger.logEvent({
        eventType: 'AUTHORIZATION_EXPIRED',
        userId: operation.userId,
        authorizationId: authorization.id,
        result: 'OPERATION_STOPPED'
      });
    }
  }
}, 60000); // كل دقيقة
```

#### 4. فشل الاتصال بخدمة خارجية

```typescript
async function sendPhishingEmail(
  email: EmailTarget,
  template: EmailTemplate
): Promise<void> {
  let attempt = 0;
  const policy = defaultRetryPolicy;
  
  while (attempt < policy.maxAttempts) {
    try {
      await emailService.send(email, template);
      return;
    } catch (error) {
      attempt++;
      
      if (attempt >= policy.maxAttempts) {
        // تسجيل الفشل النهائي
        await errorHandler.logError({
          code: 'EMAIL_SEND_FAILED',
          message: 'Failed to send phishing email after retries',
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.EXTERNAL_SERVICE,
          context: { email, attempt }
        });
        
        throw error;
      }
      
      // انتظار قبل إعادة المحاولة
      const delay = calculateBackoff(attempt, policy);
      await sleep(delay);
    }
  }
}
```

#### 5. خطأ في قاعدة البيانات

```typescript
try {
  await database.transaction(async (trx) => {
    await trx('scan_sessions').insert(scanData);
    await trx('vulnerabilities').insert(vulnerabilities);
  });
} catch (error) {
  // تسجيل الخطأ
  await errorHandler.logError({
    code: 'DATABASE_TRANSACTION_FAILED',
    message: 'Failed to save scan results',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.DATABASE,
    context: { scanId: scanData.id },
    stackTrace: error.stack
  });
  
  // إشعار المسؤولين
  await errorHandler.notifyAdministrators({
    code: 'DATABASE_TRANSACTION_FAILED',
    message: 'Critical database error occurred',
    severity: ErrorSeverity.CRITICAL,
    category: ErrorCategory.DATABASE
  });
  
  // إرجاع رسالة عامة للمستخدم
  throw new Error('Failed to save scan results. Please try again later.');
}
```

### التعافي من الأخطاء

#### 1. استئناف العمليات المتوقفة

```typescript
interface OperationCheckpoint {
  operationId: string;
  operationType: OperationType;
  state: any;
  timestamp: Date;
}

async function resumeOperation(
  checkpoint: OperationCheckpoint
): Promise<void> {
  // التحقق من صلاحية التصريح
  const authorization = await getAuthorizationForOperation(
    checkpoint.operationId
  );
  
  if (!authorization.isValid()) {
    throw new ExpiredAuthorizationError(
      'Cannot resume operation with expired authorization',
      authorization.id,
      authorization.validUntil
    );
  }
  
  // استئناف العملية من آخر نقطة
  switch (checkpoint.operationType) {
    case 'WEB_SCAN':
      await resumeWebScan(checkpoint);
      break;
    case 'PHISHING_CAMPAIGN':
      await resumePhishingCampaign(checkpoint);
      break;
    case 'NETWORK_ANALYSIS':
      await resumeNetworkAnalysis(checkpoint);
      break;
  }
}
```

#### 2. التنظيف بعد الفشل

```typescript
async function cleanupFailedOperation(
  operationId: string
): Promise<void> {
  try {
    // حذف البيانات المؤقتة
    await deleteTempData(operationId);
    
    // تحرير الموارد
    await releaseResources(operationId);
    
    // تحديث حالة العملية
    await updateOperationStatus(operationId, 'FAILED');
    
    // تسجيل التنظيف
    await auditLogger.logEvent({
      eventType: 'OPERATION_CLEANUP',
      operationId: operationId,
      result: 'SUCCESS'
    });
  } catch (error) {
    // تسجيل فشل التنظيف
    await errorHandler.logError({
      code: 'CLEANUP_FAILED',
      message: 'Failed to cleanup after operation failure',
      severity: ErrorSeverity.WARNING,
      category: ErrorCategory.SYSTEM,
      context: { operationId }
    });
  }
}
```


## استراتيجية الاختبار (Testing Strategy)

### نهج الاختبار المزدوج

تتبع المنصة نهج اختبار مزدوج يجمع بين:

1. **اختبارات الوحدة (Unit Tests)**: للتحقق من أمثلة محددة وحالات حافة وشروط الأخطاء
2. **اختبارات قائمة على الخصائص (Property-Based Tests)**: للتحقق من الخصائص العامة عبر جميع المدخلات

هذان النوعان من الاختبارات متكاملان وضروريان للتغطية الشاملة:
- اختبارات الوحدة تكتشف أخطاء محددة وتوثق السلوك المتوقع
- اختبارات الخصائص تتحقق من الصحة العامة عبر مدخلات عشوائية متنوعة

### مكتبات الاختبار

#### اختبارات قائمة على الخصائص

سنستخدم مكتبة **fast-check** لـ TypeScript/JavaScript لاختبارات الخصائص:

```bash
npm install --save-dev fast-check @types/fast-check
```

#### اختبارات الوحدة

سنستخدم **Jest** كإطار اختبار رئيسي:

```bash
npm install --save-dev jest @types/jest ts-jest
```

### تكوين اختبارات الخصائص

#### الحد الأدنى للتكرارات

- كل اختبار خاصية يجب أن يعمل لـ **100 تكرار على الأقل**
- يمكن زيادة العدد للخصائص الحرجة (500-1000 تكرار)

#### وسم الاختبارات

كل اختبار خاصية يجب أن يحتوي على تعليق يشير إلى الخاصية في وثيقة التصميم:

```typescript
/**
 * Feature: penetration-testing-platform
 * Property 1: التحقق الإلزامي من التصريح قبل أي عملية
 * 
 * لأي عملية اختبار اختراق، يجب على النظام رفض العملية
 * إذا لم يكن هناك تصريح صالح يغطي الهدف المحدد
 */
test('property: authorization required for all operations', () => {
  fc.assert(
    fc.property(
      fc.record({
        operationType: fc.constantFrom('WEB_SCAN', 'PHISHING_CAMPAIGN', 'NETWORK_ANALYSIS'),
        target: fc.webUrl(),
        userId: fc.uuid()
      }),
      async (operation) => {
        // محاولة تنفيذ العملية بدون تصريح
        await expect(
          executeOperation(operation.operationType, operation.target, operation.userId)
        ).rejects.toThrow(AuthorizationError);
      }
    ),
    { numRuns: 100 }
  );
});
```

### أمثلة على اختبارات الخصائص

#### الخاصية 2: التحقق من النطاق المصرح به

```typescript
/**
 * Feature: penetration-testing-platform
 * Property 2: التحقق من النطاق المصرح به
 */
test('property: scope validation', () => {
  fc.assert(
    fc.property(
      fc.record({
        authorization: arbitraryAuthorization(),
        target: fc.webUrl()
      }),
      async ({ authorization, target }) => {
        const isInScope = await authorizationManager.isTargetInScope(
          authorization.id,
          { url: target }
        );
        
        const targetDomain = new URL(target).hostname;
        const expectedInScope = authorization.scope.domains.some(
          domain => targetDomain === domain || targetDomain.endsWith('.' + domain)
        );
        
        expect(isInScope).toBe(expectedInScope);
      }
    ),
    { numRuns: 100 }
  );
});
```

#### الخاصية 5: التسجيل الشامل لجميع العمليات

```typescript
/**
 * Feature: penetration-testing-platform
 * Property 5: التسجيل الشامل لجميع العمليات
 */
test('property: comprehensive logging', () => {
  fc.assert(
    fc.property(
      fc.record({
        userId: fc.uuid(),
        operationType: fc.constantFrom('WEB_SCAN', 'PHISHING_CAMPAIGN', 'NETWORK_ANALYSIS'),
        target: fc.webUrl()
      }),
      async (operation) => {
        const beforeCount = await auditLogger.getEventCount();
        
        try {
          await executeOperation(
            operation.operationType,
            operation.target,
            operation.userId
          );
        } catch (error) {
          // نتوقع فشل العملية بسبب عدم وجود تصريح
        }
        
        const afterCount = await auditLogger.getEventCount();
        
        // يجب أن يكون هناك سجل جديد على الأقل
        expect(afterCount).toBeGreaterThan(beforeCount);
        
        // التحقق من محتوى السجل
        const logs = await auditLogger.searchLogs({
          userId: operation.userId,
          eventTypes: [operation.operationType]
        });
        
        expect(logs.length).toBeGreaterThan(0);
        const lastLog = logs[logs.length - 1];
        expect(lastLog.userId).toBe(operation.userId);
        expect(lastLog.resource).toBe(operation.target);
      }
    ),
    { numRuns: 100 }
  );
});
```

#### الخاصية 17: تشفير البيانات الحساسة المجمعة

```typescript
/**
 * Feature: penetration-testing-platform
 * Property 17: تشفير البيانات الحساسة المجمعة
 */
test('property: sensitive data encryption', () => {
  fc.assert(
    fc.property(
      fc.record({
        username: fc.string(),
        password: fc.string(),
        campaignId: fc.uuid()
      }),
      async (credentials) => {
        // تخزين بيانات الاعتماد
        await phishingEngine.storeCredentials(
          credentials.campaignId,
          credentials.username,
          credentials.password
        );
        
        // قراءة البيانات المخزنة مباشرة من قاعدة البيانات
        const stored = await database
          .select('captured_data')
          .from('campaign_interactions')
          .where('campaign_id', credentials.campaignId)
          .first();
        
        // يجب أن تكون البيانات مشفرة (لا تحتوي على النص الأصلي)
        const storedString = stored.captured_data.toString();
        expect(storedString).not.toContain(credentials.password);
        expect(storedString).not.toContain(credentials.username);
        
        // يجب أن نتمكن من فك التشفير والحصول على البيانات الأصلية
        const decrypted = await phishingEngine.getCredentials(
          credentials.campaignId
        );
        expect(decrypted.username).toBe(credentials.username);
        expect(decrypted.password).toBe(credentials.password);
      }
    ),
    { numRuns: 100 }
  );
});
```

#### الخاصية 19: الحذف التلقائي للبيانات الحساسة

```typescript
/**
 * Feature: penetration-testing-platform
 * Property 19: الحذف التلقائي للبيانات الحساسة
 */
test('property: automatic data deletion', async () => {
  fc.assert(
    fc.property(
      arbitraryCampaign(),
      async (campaign) => {
        // إنشاء حملة وإكمالها
        const campaignId = await phishingEngine.createCampaign(campaign);
        await phishingEngine.completeCampaign(campaignId);
        
        // محاكاة مرور 30 يوماً
        await timeTravel(30, 'days');
        
        // تشغيل مهمة الحذف التلقائي
        await dataRetentionService.cleanupExpiredData();
        
        // التحقق من حذف بيانات الاعتماد
        const credentials = await phishingEngine.getCredentials(campaignId);
        expect(credentials).toBeNull();
        
        // التحقق من بقاء البيانات الإحصائية
        const stats = await phishingEngine.getCampaignStats(campaignId);
        expect(stats).toBeDefined();
        expect(stats.totalTargets).toBeGreaterThan(0);
      }
    ),
    { numRuns: 50 } // عدد أقل بسبب تكلفة العملية
  );
});
```

### مولدات البيانات العشوائية (Arbitraries)

```typescript
// مولد تصريح عشوائي
function arbitraryAuthorization(): fc.Arbitrary<AuthorizationDocument> {
  return fc.record({
    organizationName: fc.string({ minLength: 3, maxLength: 50 }),
    scope: fc.record({
      domains: fc.array(fc.domain(), { minLength: 1, maxLength: 5 }),
      ipRanges: fc.array(fc.ipV4(), { maxLength: 3 }),
      networks: fc.array(arbitraryNetworkIdentifier(), { maxLength: 3 }),
      emailDomains: fc.array(fc.domain(), { maxLength: 3 })
    }),
    validFrom: fc.date({ min: new Date('2024-01-01') }),
    validUntil: fc.date({ min: new Date('2024-12-31') }),
    signedBy: fc.fullName(),
    digitalSignature: fc.hexaString({ minLength: 64, maxLength: 64 }),
    allowedOperations: fc.array(
      fc.constantFrom('WEB_SCAN', 'PHISHING_CAMPAIGN', 'NETWORK_ANALYSIS'),
      { minLength: 1, maxLength: 3 }
    )
  });
}

// مولد حملة تصيد عشوائية
function arbitraryCampaign(): fc.Arbitrary<PhishingCampaign> {
  return fc.record({
    name: fc.string({ minLength: 5, maxLength: 50 }),
    authorizationId: fc.uuid(),
    targets: fc.array(
      fc.record({
        email: fc.emailAddress(),
        name: fc.fullName(),
        department: fc.constantFrom('IT', 'HR', 'Finance', 'Sales')
      }),
      { minLength: 1, maxLength: 10 }
    ),
    emailTemplate: fc.record({
      subject: fc.string({ minLength: 10, maxLength: 100 }),
      body: fc.lorem({ maxCount: 3 }),
      senderName: fc.fullName(),
      senderEmail: fc.emailAddress(),
      trackingEnabled: fc.boolean(),
      disclaimer: fc.constant('This is a security awareness test...')
    }),
    landingPage: fc.record({
      pageType: fc.constantFrom('CREDENTIAL_HARVEST', 'DOWNLOAD_PROMPT', 'SURVEY'),
      captureFields: fc.array(
        fc.constantFrom('username', 'password', 'email', 'phone'),
        { minLength: 1, maxLength: 4 }
      )
    }),
    schedule: fc.record({
      startDate: fc.date({ min: new Date() }),
      endDate: fc.date({ min: new Date(Date.now() + 86400000) }),
      sendingPattern: fc.constantFrom('IMMEDIATE', 'STAGGERED', 'SCHEDULED')
    })
  });
}

// مولد ثغرة عشوائية
function arbitraryVulnerability(): fc.Arbitrary<Vulnerability> {
  return fc.record({
    id: fc.uuid(),
    type: fc.constantFrom(
      'SQL_INJECTION',
      'XSS',
      'CSRF',
      'DIRECTORY_TRAVERSAL',
      'COMMAND_INJECTION'
    ),
    severity: fc.constantFrom('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
    location: fc.webUrl(),
    description: fc.lorem({ maxCount: 2 }),
    evidence: fc.lorem({ maxCount: 1 }),
    remediation: fc.lorem({ maxCount: 2 }),
    cvssScore: fc.float({ min: 0, max: 10, noNaN: true })
  });
}
```

### اختبارات الوحدة

#### أمثلة محددة

```typescript
describe('AuthorizationManager', () => {
  test('should reject operation without authorization', async () => {
    const result = await authorizationManager.validateAuthorization(
      'user-123',
      { url: 'https://example.com' },
      'WEB_SCAN'
    );
    
    expect(result.authorized).toBe(false);
    expect(result.reason).toContain('No authorization found');
  });
  
  test('should accept operation with valid authorization', async () => {
    const authId = await authorizationManager.uploadAuthorization(
      'user-123',
      {
        organizationName: 'Test Corp',
        scope: {
          domains: ['example.com'],
          ipRanges: [],
          networks: [],
          emailDomains: []
        },
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000 * 30),
        signedBy: 'John Doe',
        digitalSignature: 'abc123...',
        allowedOperations: ['WEB_SCAN']
      }
    );
    
    const result = await authorizationManager.validateAuthorization(
      'user-123',
      { url: 'https://example.com' },
      'WEB_SCAN'
    );
    
    expect(result.authorized).toBe(true);
    expect(result.authorizationId).toBe(authId);
  });
});

describe('WebScanner', () => {
  test('should respect robots.txt', async () => {
    const mockRobotsTxt = `
      User-agent: *
      Disallow: /admin/
      Disallow: /private/
    `;
    
    // إعداد mock للاستجابة
    nock('https://example.com')
      .get('/robots.txt')
      .reply(200, mockRobotsTxt);
    
    const scanner = new WebScanner();
    const allowed = await scanner.isPathAllowed(
      'https://example.com/admin/users'
    );
    
    expect(allowed).toBe(false);
  });
  
  test('should detect SQL injection vulnerability', async () => {
    // إعداد mock لاستجابة تحتوي على خطأ SQL
    nock('https://example.com')
      .get('/search?q=test\'')
      .reply(500, 'SQL syntax error near \'test\'\'');
    
    const scanner = new WebScanner();
    const vulnerabilities = await scanner.testSqlInjection(
      'https://example.com/search?q=test'
    );
    
    expect(vulnerabilities.length).toBeGreaterThan(0);
    expect(vulnerabilities[0].type).toBe('SQL_INJECTION');
  });
});
```

#### حالات الحافة

```typescript
describe('Edge Cases', () => {
  test('should handle empty scan results', async () => {
    const scanner = new WebScanner();
    const results = await scanner.getResults('non-existent-session');
    
    expect(results).toBeNull();
  });
  
  test('should handle authorization expiring during scan', async () => {
    const authId = await createAuthorizationExpiringIn(5000); // 5 ثواني
    const scanSession = await webScanner.startScan(
      'user-123',
      { url: 'https://example.com', authorizationId: authId },
      { vulnerabilityTypes: ['SQL_INJECTION'], maxDepth: 3, maxRequests: 100 }
    );
    
    // انتظار انتهاء الصلاحية
    await sleep(6000);
    
    // التحقق من إيقاف الفحص
    const status = await webScanner.getScanStatus(scanSession.sessionId);
    expect(status.status).toBe('STOPPED');
  });
  
  test('should handle malformed email addresses in phishing campaign', async () => {
    await expect(
      phishingEngine.createCampaign({
        name: 'Test Campaign',
        authorizationId: 'auth-123',
        targets: [
          { email: 'invalid-email', name: 'Test User' }
        ],
        emailTemplate: { /* ... */ },
        landingPage: { /* ... */ },
        schedule: { /* ... */ }
      })
    ).rejects.toThrow(ValidationError);
  });
});
```

### تغطية الاختبار

#### الأهداف

- **تغطية الكود**: 80% كحد أدنى
- **تغطية الفروع**: 75% كحد أدنى
- **تغطية الخصائص**: 100% من الخصائص المحددة في التصميم

#### التقارير

```bash
# تشغيل جميع الاختبارات مع تقرير التغطية
npm test -- --coverage

# تشغيل اختبارات الخصائص فقط
npm test -- --testNamePattern="property:"

# تشغيل اختبارات الوحدة فقط
npm test -- --testPathPattern="unit"
```

### الاختبار المستمر

#### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --testPathPattern="unit"
      
      - name: Run property tests
        run: npm test -- --testNamePattern="property:" --maxWorkers=2
      
      - name: Generate coverage report
        run: npm test -- --coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v2
```

### ملاحظات مهمة

1. **توازن الاختبارات**: لا تكتب عدداً كبيراً من اختبارات الوحدة - اختبارات الخصائص تغطي الكثير من المدخلات
2. **التركيز**: اختبارات الوحدة للأمثلة المحددة وحالات الحافة، اختبارات الخصائص للقواعد العامة
3. **الأداء**: اختبارات الخصائص قد تستغرق وقتاً أطول بسبب التكرارات المتعددة
4. **التوثيق**: كل اختبار خاصية يجب أن يشير بوضوح إلى الخاصية في وثيقة التصميم

