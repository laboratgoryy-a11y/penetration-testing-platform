# وثيقة التصميم - ماسح IP باستخدام Nmap

## نظرة عامة

ميزة متكاملة لفحص عناوين IP باستخدام أداة Nmap القوية، مع واجهة مستخدم سهلة الاستخدام وAPI شامل. تم تصميم الميزة لتوفير فحوصات أمنية شاملة مع ضمان الاستخدام القانوني والأخلاقي.

### الأهداف الرئيسية

1. توفير واجهة سهلة لتنفيذ جميع أنواع فحوصات Nmap
2. دعم الفحوصات الأساسية والمتقدمة
3. عرض النتائج بشكل واضح ومنظم
4. التكامل السلس مع مكونات المنصة الحالية
5. دعم الفحوصات المجدولة والمستمرة
6. توفير تحليلات ذكية باستخدام التعلم الآلي

### المبادئ التصميمية

- **البساطة**: واجهة سهلة للمستخدمين المبتدئين
- **القوة**: خيارات متقدمة للمحترفين
- **الأمان**: التحقق من التصاريح والحماية من حقن الأوامر
- **الأداء**: فحوصات سريعة ومتوازية
- **القابلية للتوسع**: بنية معيارية تدعم إضافة ميزات جديدة
- **التكامل**: توافق كامل مع النظام الحالي

## البنية المعمارية

### نظرة عامة على البنية

```
┌─────────────────────────────────────────────────────────────┐
│                    طبقة العرض (Presentation)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web UI      │  │  REST API    │  │  WebSocket   │      │
│  │  (React)     │  │  Endpoints   │  │  (Real-time) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│              طبقة التحكم (Controller Layer)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  IP Scanner Controller - التحكم في عمليات الفحص    │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                  طبقة منطق الأعمال (Business)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Nmap Service │  │   Scheduler  │  │   ML Engine  │      │
│  │              │  │   Service    │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  CVE Service │  │   Report     │  │  Notification│      │
│  │              │  │   Generator  │  │   Service    │      │
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

### تدفق البيانات

1. **طلب الفحص**: المستخدم يرسل طلب فحص عبر الواجهة أو API
2. **التحقق من التصريح**: التحقق من وجود تصريح صالح للهدف
3. **إنشاء الجلسة**: إنشاء جلسة فحص جديدة في قاعدة البيانات
4. **تنفيذ Nmap**: تنفيذ أوامر Nmap بشكل آمن
5. **معالجة النتائج**: تحليل مخرجات Nmap وتخزينها
6. **الإثراء**: إضافة معلومات CVE والتحليلات الذكية
7. **الإشعارات**: إرسال إشعارات للمستخدم
8. **التقارير**: توليد تقارير شاملة

## المكونات والواجهات

### 1. Nmap Service - خدمة Nmap الأساسية

المكون المسؤول عن تنفيذ أوامر Nmap ومعالجة النتائج.

#### الواجهات الرئيسية

```typescript
interface NmapService {
  // بدء فحص جديد
  startScan(
    userId: string,
    target: ScanTarget,
    config: ScanConfiguration
  ): Promise<ScanSession>;
  
  // الحصول على حالة الفحص
  getScanStatus(sessionId: string): Promise<ScanStatus>;
  
  // إيقاف الفحص
  stopScan(sessionId: string): Promise<void>;
  
  // الحصول على النتائج
  getResults(sessionId: string): Promise<ScanResults>;
  
  // تنفيذ أمر Nmap مخصص
  executeCustomScan(
    userId: string,
    target: string,
    nmapArgs: string[]
  ): Promise<ScanSession>;
}

interface ScanTarget {
  type: 'SINGLE_IP' | 'IP_RANGE' | 'CIDR' | 'HOSTNAME';
  value: string;
  authorizationId: string;
}

interface ScanConfiguration {
  scanType: ScanType;
  portRange?: PortRange;
  timing: TimingTemplate;
  serviceDetection: boolean;
  osDetection: boolean;
  vulnerabilityScan: boolean;
  nseScripts?: string[];
  stealthMode: boolean;
  customOptions?: string[];
}

type ScanType = 
  | 'QUICK_SCAN'           // -F -T4
  | 'COMPREHENSIVE_SCAN'   // -A -p- -T4
  | 'PORT_SCAN'            // -sS
  | 'SERVICE_SCAN'         // -sV
  | 'OS_DETECTION'         // -O
  | 'VULNERABILITY_SCAN'   // --script vuln
  | 'STEALTH_SCAN'         // -sS -T0
  | 'CUSTOM';              // معاملات مخصصة

interface PortRange {
  type: 'ALL' | 'TOP_100' | 'TOP_1000' | 'CUSTOM';
  customPorts?: string; // "80,443,8080" or "1-1000"
}

type TimingTemplate = 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5';

interface ScanSession {
  id: string;
  userId: string;
  target: ScanTarget;
  config: ScanConfiguration;
  status: ScanSessionStatus;
  startedAt: Date;
  completedAt?: Date;
  progress: number; // 0-100
  estimatedTimeRemaining?: number; // بالثواني
}

type ScanSessionStatus = 
  | 'PENDING'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

interface ScanResults {
  sessionId: string;
  target: string;
  scanType: ScanType;
  hosts: HostResult[];
  summary: ScanSummary;
  rawOutput: string;
  completedAt: Date;
}

interface HostResult {
  ip: string;
  hostname?: string;
  status: 'up' | 'down' | 'unknown';
  ports: PortInfo[];
  os?: OSDetection;
  services: ServiceInfo[];
  vulnerabilities: VulnerabilityInfo[];
}

interface PortInfo {
  port: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered' | 'unfiltered';
  service?: string;
  version?: string;
}

interface OSDetection {
  name: string;
  accuracy: number; // 0-100
  type?: string; // router, server, workstation
  vendor?: string;
  osFamily?: string;
}

interface ServiceInfo {
  port: number;
  name: string;
  product?: string;
  version?: string;
  extraInfo?: string;
  cpe?: string; // Common Platform Enumeration
}

interface VulnerabilityInfo {
  id: string;
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  cveIds?: string[];
  cvssScore?: number;
  affectedService?: string;
  affectedPort?: number;
  remediation?: string;
  references?: string[];
}

interface ScanSummary {
  totalHosts: number;
  hostsUp: number;
  hostsDown: number;
  totalPorts: number;
  openPorts: number;
  closedPorts: number;
  filteredPorts: number;
  servicesDetected: number;
  vulnerabilitiesFound: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  scanDuration: number; // بالثواني
}
```

#### آلية تنفيذ Nmap

1. **التحقق من الأمان**: التحقق من صحة المدخلات ومنع حقن الأوامر
2. **بناء الأمر**: بناء أمر Nmap بناءً على الإعدادات
3. **التنفيذ**: تنفيذ الأمر في عملية منفصلة
4. **المراقبة**: مراقبة التقدم وتحديث الحالة
5. **التحليل**: تحليل مخرجات XML من Nmap
6. **التخزين**: حفظ النتائج في قاعدة البيانات


### 2. CVE Service - خدمة قاعدة بيانات الثغرات

المكون المسؤول عن إثراء النتائج بمعلومات CVE.

```typescript
interface CVEService {
  // البحث عن CVEs لخدمة معينة
  searchCVEs(
    service: string,
    version: string
  ): Promise<CVEInfo[]>;
  
  // الحصول على تفاصيل CVE
  getCVEDetails(cveId: string): Promise<CVEDetails>;
  
  // تحديث قاعدة البيانات المحلية
  updateCVEDatabase(): Promise<void>;
  
  // البحث عن exploits متاحة
  searchExploits(cveId: string): Promise<ExploitInfo[]>;
}

interface CVEInfo {
  cveId: string;
  description: string;
  cvssScore: number;
  cvssVector: string;
  publishedDate: Date;
  lastModifiedDate: Date;
  affectedVersions: string[];
}

interface CVEDetails extends CVEInfo {
  references: Reference[];
  cweId?: string;
  exploitAvailable: boolean;
  patchAvailable: boolean;
  vendorAdvisory?: string;
}

interface Reference {
  url: string;
  source: string;
  tags: string[];
}

interface ExploitInfo {
  id: string;
  title: string;
  source: 'exploit-db' | 'metasploit' | 'github' | 'other';
  url: string;
  verified: boolean;
}
```

### 3. Scheduler Service - خدمة الجدولة

المكون المسؤول عن جدولة الفحوصات التلقائية.

```typescript
interface SchedulerService {
  // إنشاء جدول فحص جديد
  createSchedule(
    userId: string,
    schedule: ScanSchedule
  ): Promise<ScheduleId>;
  
  // تحديث جدول
  updateSchedule(
    scheduleId: string,
    updates: Partial<ScanSchedule>
  ): Promise<void>;
  
  // حذف جدول
  deleteSchedule(scheduleId: string): Promise<void>;
  
  // الحصول على جميع الجداول
  getSchedules(userId: string): Promise<ScanSchedule[]>;
  
  // تفعيل/تعطيل جدول
  toggleSchedule(
    scheduleId: string,
    enabled: boolean
  ): Promise<void>;
}

interface ScanSchedule {
  id: string;
  userId: string;
  name: string;
  target: ScanTarget;
  config: ScanConfiguration;
  frequency: ScheduleFrequency;
  enabled: boolean;
  lastRun?: Date;
  nextRun: Date;
  notifyOnCompletion: boolean;
  notifyOnChanges: boolean;
  compareWithPrevious: boolean;
}

interface ScheduleFrequency {
  type: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  interval?: number; // للنوع CUSTOM
  dayOfWeek?: number; // 0-6 للنوع WEEKLY
  dayOfMonth?: number; // 1-31 للنوع MONTHLY
  time?: string; // "HH:MM" للأنواع DAILY, WEEKLY, MONTHLY
}

type ScheduleId = string;
```

### 4. ML Engine - محرك التعلم الآلي

المكون المسؤول عن التحليلات الذكية والكشف عن الأنماط.

```typescript
interface MLEngine {
  // تحليل نتائج الفحص
  analyzeResults(
    sessionId: string
  ): Promise<MLAnalysis>;
  
  // اكتشاف الأنماط غير العادية
  detectAnomalies(
    results: ScanResults
  ): Promise<Anomaly[]>;
  
  // تقييم المخاطر
  assessRisk(
    target: string
  ): Promise<RiskAssessment>;
  
  // توليد توصيات
  generateRecommendations(
    sessionId: string
  ): Promise<Recommendation[]>;
  
  // التعلم من التغذية الراجعة
  learnFromFeedback(
    sessionId: string,
    feedback: UserFeedback
  ): Promise<void>;
}

interface MLAnalysis {
  sessionId: string;
  riskScore: number; // 0-100
  anomaliesDetected: Anomaly[];
  recommendations: Recommendation[];
  similarTargets: string[];
  trendAnalysis: TrendAnalysis;
}

interface Anomaly {
  type: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number; // 0-100
  affectedHost?: string;
  affectedPort?: number;
}

interface RiskAssessment {
  overallRisk: number; // 0-100
  factors: RiskFactor[];
  timeline: RiskTimeline[];
}

interface RiskFactor {
  name: string;
  impact: number; // 0-100
  description: string;
}

interface RiskTimeline {
  date: Date;
  riskScore: number;
}

interface Recommendation {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  actionItems: ActionItem[];
  estimatedEffort: string;
  expectedImpact: string;
}

interface ActionItem {
  step: number;
  description: string;
  completed: boolean;
}

interface TrendAnalysis {
  direction: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  changePercentage: number;
  keyChanges: string[];
}

interface UserFeedback {
  anomalyId?: string;
  recommendationId?: string;
  rating: number; // 1-5
  isAccurate: boolean;
  comments?: string;
}
```

### 5. Notification Service - خدمة الإشعارات

المكون المسؤول عن إرسال الإشعارات والتنبيهات.

```typescript
interface NotificationService {
  // إرسال إشعار
  sendNotification(
    userId: string,
    notification: Notification
  ): Promise<void>;
  
  // إرسال إشعار بالبريد الإلكتروني
  sendEmailNotification(
    email: string,
    subject: string,
    body: string,
    attachments?: Attachment[]
  ): Promise<void>;
  
  // إرسال إشعار Slack
  sendSlackNotification(
    webhookUrl: string,
    message: SlackMessage
  ): Promise<void>;
  
  // إرسال webhook
  sendWebhook(
    url: string,
    payload: any
  ): Promise<void>;
  
  // الحصول على إعدادات الإشعارات
  getNotificationSettings(
    userId: string
  ): Promise<NotificationSettings>;
  
  // تحديث إعدادات الإشعارات
  updateNotificationSettings(
    userId: string,
    settings: NotificationSettings
  ): Promise<void>;
}

interface Notification {
  type: NotificationType;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  data?: any;
  timestamp: Date;
}

type NotificationType = 
  | 'SCAN_COMPLETED'
  | 'SCAN_FAILED'
  | 'VULNERABILITY_FOUND'
  | 'CRITICAL_VULNERABILITY'
  | 'SCHEDULE_EXECUTED'
  | 'ANOMALY_DETECTED'
  | 'CHANGE_DETECTED';

interface NotificationSettings {
  email: {
    enabled: boolean;
    address: string;
    events: NotificationType[];
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    events: NotificationType[];
  };
  webhook: {
    enabled: boolean;
    url: string;
    events: NotificationType[];
  };
  inApp: {
    enabled: boolean;
    events: NotificationType[];
  };
}


## نماذج البيانات

### مخطط قاعدة البيانات

#### جدول جلسات فحص IP (ip_scan_sessions)

```sql
CREATE TABLE ip_scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  authorization_id UUID REFERENCES authorizations(id),
  target_type VARCHAR(20) NOT NULL,
  target_value TEXT NOT NULL,
  scan_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  progress INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  estimated_time_remaining INTEGER,
  config JSONB NOT NULL,
  raw_output TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ip_scan_sessions_user ON ip_scan_sessions(user_id);
CREATE INDEX idx_ip_scan_sessions_status ON ip_scan_sessions(status);
CREATE INDEX idx_ip_scan_sessions_created ON ip_scan_sessions(created_at DESC);
```

#### جدول نتائج المضيفين (ip_scan_hosts)

```sql
CREATE TABLE ip_scan_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ip_scan_sessions(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  hostname VARCHAR(255),
  status VARCHAR(20) NOT NULL,
  os_name VARCHAR(255),
  os_accuracy INTEGER,
  os_type VARCHAR(100),
  os_vendor VARCHAR(255),
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ip_scan_hosts_session ON ip_scan_hosts(session_id);
CREATE INDEX idx_ip_scan_hosts_ip ON ip_scan_hosts(ip_address);
```

#### جدول المنافذ المكتشفة (ip_scan_ports)

```sql
CREATE TABLE ip_scan_ports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES ip_scan_hosts(id) ON DELETE CASCADE,
  port INTEGER NOT NULL,
  protocol VARCHAR(10) NOT NULL,
  state VARCHAR(20) NOT NULL,
  service_name VARCHAR(100),
  service_product VARCHAR(255),
  service_version VARCHAR(100),
  service_extra_info TEXT,
  cpe VARCHAR(255),
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ip_scan_ports_host ON ip_scan_ports(host_id);
CREATE INDEX idx_ip_scan_ports_port ON ip_scan_ports(port);
CREATE INDEX idx_ip_scan_ports_state ON ip_scan_ports(state);
```

#### جدول الثغرات المكتشفة (ip_scan_vulnerabilities)

```sql
CREATE TABLE ip_scan_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES ip_scan_hosts(id) ON DELETE CASCADE,
  port_id UUID REFERENCES ip_scan_ports(id) ON DELETE SET NULL,
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  cvss_score DECIMAL(3,1),
  cve_ids TEXT[], -- مصفوفة من CVE IDs
  remediation TEXT,
  references TEXT[], -- مصفوفة من الروابط
  discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ip_scan_vulns_host ON ip_scan_vulnerabilities(host_id);
CREATE INDEX idx_ip_scan_vulns_severity ON ip_scan_vulnerabilities(severity);
CREATE INDEX idx_ip_scan_vulns_cve ON ip_scan_vulnerabilities USING GIN(cve_ids);
```

#### جدول جداول الفحص (ip_scan_schedules)

```sql
CREATE TABLE ip_scan_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_value TEXT NOT NULL,
  authorization_id UUID REFERENCES authorizations(id),
  config JSONB NOT NULL,
  frequency_type VARCHAR(20) NOT NULL,
  frequency_config JSONB,
  enabled BOOLEAN DEFAULT TRUE,
  last_run TIMESTAMP,
  next_run TIMESTAMP NOT NULL,
  notify_on_completion BOOLEAN DEFAULT TRUE,
  notify_on_changes BOOLEAN DEFAULT TRUE,
  compare_with_previous BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ip_scan_schedules_user ON ip_scan_schedules(user_id);
CREATE INDEX idx_ip_scan_schedules_next_run ON ip_scan_schedules(next_run);
CREATE INDEX idx_ip_scan_schedules_enabled ON ip_scan_schedules(enabled);
```

#### جدول قاعدة بيانات CVE المحلية (cve_database)

```sql
CREATE TABLE cve_database (
  cve_id VARCHAR(20) PRIMARY KEY,
  description TEXT NOT NULL,
  cvss_score DECIMAL(3,1),
  cvss_vector VARCHAR(100),
  published_date DATE,
  last_modified_date DATE,
  affected_products TEXT[],
  affected_versions TEXT[],
  references JSONB,
  cwe_id VARCHAR(20),
  exploit_available BOOLEAN DEFAULT FALSE,
  patch_available BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cve_cvss_score ON cve_database(cvss_score DESC);
CREATE INDEX idx_cve_published ON cve_database(published_date DESC);
CREATE INDEX idx_cve_products ON cve_database USING GIN(affected_products);
```

#### جدول الإشعارات (ip_scan_notifications)

```sql
CREATE TABLE ip_scan_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ip_scan_sessions(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ip_scan_notifs_user ON ip_scan_notifications(user_id);
CREATE INDEX idx_ip_scan_notifs_read ON ip_scan_notifications(read);
CREATE INDEX idx_ip_scan_notifs_created ON ip_scan_notifications(created_at DESC);
```


## تصميم واجهة برمجة التطبيقات (API Design)

### نقاط النهاية الرئيسية

#### 1. إدارة الفحوصات

```
POST   /api/v1/ip-scans
GET    /api/v1/ip-scans
GET    /api/v1/ip-scans/:id
GET    /api/v1/ip-scans/:id/status
POST   /api/v1/ip-scans/:id/stop
POST   /api/v1/ip-scans/:id/pause
POST   /api/v1/ip-scans/:id/resume
DELETE /api/v1/ip-scans/:id
```

#### 2. النتائج والتقارير

```
GET    /api/v1/ip-scans/:id/results
GET    /api/v1/ip-scans/:id/hosts
GET    /api/v1/ip-scans/:id/ports
GET    /api/v1/ip-scans/:id/vulnerabilities
GET    /api/v1/ip-scans/:id/summary
GET    /api/v1/ip-scans/:id/report
POST   /api/v1/ip-scans/:id/export
```

#### 3. الجدولة

```
POST   /api/v1/ip-scans/schedules
GET    /api/v1/ip-scans/schedules
GET    /api/v1/ip-scans/schedules/:id
PUT    /api/v1/ip-scans/schedules/:id
DELETE /api/v1/ip-scans/schedules/:id
POST   /api/v1/ip-scans/schedules/:id/toggle
GET    /api/v1/ip-scans/schedules/:id/history
```

#### 4. المقارنة والتحليل

```
POST   /api/v1/ip-scans/compare
GET    /api/v1/ip-scans/:id/analysis
GET    /api/v1/ip-scans/:id/anomalies
GET    /api/v1/ip-scans/:id/recommendations
POST   /api/v1/ip-scans/:id/feedback
```

#### 5. قاعدة بيانات CVE

```
GET    /api/v1/cve/search
GET    /api/v1/cve/:cveId
GET    /api/v1/cve/:cveId/exploits
POST   /api/v1/cve/update-database
```

#### 6. الإشعارات

```
GET    /api/v1/ip-scans/notifications
GET    /api/v1/ip-scans/notifications/:id
PUT    /api/v1/ip-scans/notifications/:id/read
DELETE /api/v1/ip-scans/notifications/:id
GET    /api/v1/ip-scans/notification-settings
PUT    /api/v1/ip-scans/notification-settings
```

### أمثلة على الطلبات والاستجابات

#### بدء فحص IP

**الطلب:**
```http
POST /api/v1/ip-scans
Authorization: Bearer <token>
Content-Type: application/json

{
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
    "vulnerabilityScan": true,
    "stealthMode": false
  }
}
```

**الاستجابة:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "status": "RUNNING",
  "startedAt": "2024-01-15T10:30:00Z",
  "progress": 0,
  "estimatedTimeRemaining": 1800
}
```


## خصائص الصحة (Correctness Properties)

الخاصية هي سمة أو سلوك يجب أن يكون صحيحاً عبر جميع عمليات التنفيذ الصالحة للنظام - في الأساس، بيان رسمي حول ما يجب أن يفعله النظام. تعمل الخصائص كجسر بين المواصفات القابلة للقراءة البشرية وضمانات الصحة القابلة للتحقق الآلي.

### Property 1: التحقق من التصريح قبل الفحص

*For any* scan request, the system should verify that a valid authorization exists for the target before starting the scan.

**Validates: Requirements 1.1**

### Property 2: التحقق من نطاق العمل

*For any* target IP address, the system should verify that it falls within the authorized scope before allowing the scan to proceed.

**Validates: Requirements 1.2, 8.2**

### Property 3: حفظ نتائج المنافذ

*For any* completed port scan, all discovered ports should be saved to the database with their state, protocol, and timestamp.

**Validates: Requirements 2.4**

### Property 4: حفظ معلومات الخدمات

*For any* service detection scan, all discovered services should be saved to the database with their name, version, and port information.

**Validates: Requirements 3.4**

### Property 5: حفظ معلومات نظام التشغيل

*For any* OS detection scan, the detected operating system information should be saved to the database with accuracy percentage.

**Validates: Requirements 4.3**

### Property 6: تسجيل معلومات الثغرات الكاملة

*For any* discovered vulnerability, the system should record its type, severity, location, and description.

**Validates: Requirements 5.3**

### Property 7: تصنيف الثغرات بمستوى خطورة صالح

*For any* vulnerability, it should be classified with a valid severity level (CRITICAL, HIGH, MEDIUM, LOW).

**Validates: Requirements 5.4**

### Property 8: حد المنافذ في الفحص السريع

*For any* quick scan, the number of ports scanned should not exceed 100.

**Validates: Requirements 6.1**

### Property 9: نطاق المنافذ في الفحص الشامل

*For any* comprehensive scan, all ports from 1 to 65535 should be included in the scan range.

**Validates: Requirements 7.1**

### Property 10: إنشاء جلسة فريدة لكل فحص

*For any* scan request, the system should create a new scan session with a unique identifier.

**Validates: Requirements 9.1**

### Property 11: حفظ إعدادات الفحص

*For any* scan session, all scan configuration settings should be saved with the session.

**Validates: Requirements 9.2**

### Property 12: حفظ النتائج تلقائياً

*For any* completed scan, all results should be automatically saved to the database.

**Validates: Requirements 11.1**

### Property 13: التحقق من صحة مدخلات API

*For any* API request with invalid input, the system should reject it and return an appropriate error response.

**Validates: Requirements 13.2**

### Property 14: رسائل خطأ واضحة

*For any* failed scan, the system should provide a clear error message explaining the failure reason.

**Validates: Requirements 14.1**

### Property 15: منع حقن الأوامر

*For any* user input used in Nmap commands, the system should sanitize it to prevent command injection attacks.

**Validates: Requirements 16.2**


## معالجة الأخطاء (Error Handling)

### أنواع الأخطاء

#### 1. أخطاء التصريح (Authorization Errors)

```typescript
class AuthorizationError extends Error {
  constructor(
    message: string,
    public target: string,
    public authorizationId?: string
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}
```

**الحالات:**
- تصريح غير موجود
- تصريح منتهي الصلاحية
- الهدف خارج نطاق العمل المصرح به

**المعالجة:**
- رفض الطلب فوراً
- تسجيل المحاولة في سجلات التدقيق
- إرجاع رمز HTTP 403 Forbidden

#### 2. أخطاء التحقق من الصحة (Validation Errors)

```typescript
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
```

**الحالات:**
- عنوان IP غير صالح
- نطاق منافذ غير صالح
- إعدادات فحص غير صالحة

**المعالجة:**
- رفض الطلب
- إرجاع رسالة خطأ واضحة تحدد الحقل والمشكلة
- إرجاع رمز HTTP 400 Bad Request

#### 3. أخطاء تنفيذ Nmap (Nmap Execution Errors)

```typescript
class NmapExecutionError extends Error {
  constructor(
    message: string,
    public exitCode: number,
    public stderr: string
  ) {
    super(message);
    this.name = 'NmapExecutionError';
  }
}
```

**الحالات:**
- Nmap غير مثبت
- صلاحيات غير كافية
- الهدف غير قابل للوصول
- مهلة التنفيذ انتهت

**المعالجة:**
- تسجيل الخطأ الكامل
- تحديث حالة الجلسة إلى FAILED
- إرسال إشعار للمستخدم
- حفظ رسالة الخطأ في قاعدة البيانات

#### 4. أخطاء قاعدة البيانات (Database Errors)

```typescript
class DatabaseError extends Error {
  constructor(
    message: string,
    public operation: string,
    public originalError: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}
```

**الحالات:**
- فشل الاتصال بقاعدة البيانات
- انتهاك قيود البيانات
- مهلة الاستعلام انتهت

**المعالجة:**
- إعادة المحاولة تلقائياً (حتى 3 مرات)
- تسجيل الخطأ
- إرجاع رمز HTTP 500 Internal Server Error

### استراتيجية إعادة المحاولة

```typescript
interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number; // milliseconds
  maxDelay: number;
  backoffMultiplier: number;
}

const defaultRetryPolicy: RetryPolicy = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};
```

**العمليات القابلة لإعادة المحاولة:**
- استعلامات قاعدة البيانات
- طلبات CVE API
- إرسال الإشعارات

**العمليات غير القابلة لإعادة المحاولة:**
- فحوصات Nmap (يجب أن يبدأها المستخدم يدوياً)
- عمليات التحقق من التصريح


## استراتيجية الاختبار (Testing Strategy)

### نهج الاختبار المزدوج

تستخدم الميزة نهجاً مزدوجاً للاختبار يجمع بين:

1. **اختبارات الوحدة (Unit Tests)**: للتحقق من أمثلة محددة وحالات الحافة وشروط الخطأ
2. **اختبارات الخصائص (Property Tests)**: للتحقق من الخصائص العامة عبر جميع المدخلات

كلا النوعين ضروري ومكمل لبعضهما البعض لتحقيق تغطية شاملة.

### اختبارات الوحدة (Unit Tests)

**التركيز:**
- أمثلة محددة توضح السلوك الصحيح
- حالات الحافة (edge cases)
- شروط الخطأ
- نقاط التكامل بين المكونات

**أمثلة:**

```typescript
describe('NmapService', () => {
  describe('startScan', () => {
    it('should reject scan without valid authorization', async () => {
      const target = { type: 'SINGLE_IP', value: '192.168.1.1', authorizationId: 'invalid' };
      await expect(nmapService.startScan(userId, target, config))
        .rejects.toThrow(AuthorizationError);
    });
    
    it('should handle Nmap not installed error', async () => {
      // Mock Nmap not being installed
      await expect(nmapService.startScan(userId, target, config))
        .rejects.toThrow('Nmap is not installed');
    });
    
    it('should create session with unique ID', async () => {
      const session1 = await nmapService.startScan(userId, target, config);
      const session2 = await nmapService.startScan(userId, target, config);
      expect(session1.id).not.toBe(session2.id);
    });
  });
});
```

### اختبارات الخصائص (Property-Based Tests)

**التركيز:**
- الخصائص العامة التي تنطبق على جميع المدخلات
- التغطية الشاملة من خلال التوليد العشوائي
- اكتشاف حالات حافة غير متوقعة

**المكتبة المستخدمة:** fast-check (لـ TypeScript/JavaScript)

**التكوين:**
- الحد الأدنى 100 تكرار لكل اختبار خاصية
- كل اختبار يجب أن يشير إلى خاصية التصميم المقابلة
- تنسيق العلامة: `Feature: ip-nmap-scanner, Property {number}: {property_text}`

**أمثلة:**

```typescript
import * as fc from 'fast-check';

describe('Property Tests - IP Scanner', () => {
  // Feature: ip-nmap-scanner, Property 2: التحقق من نطاق العمل
  it('should reject any target outside authorized scope', () => {
    fc.assert(
      fc.property(
        fc.ipV4(),
        fc.array(fc.ipV4Range()),
        async (targetIp, authorizedRanges) => {
          const isInScope = authorizedRanges.some(range => 
            ipInRange(targetIp, range)
          );
          
          if (!isInScope) {
            await expect(
              nmapService.startScan(userId, { 
                type: 'SINGLE_IP', 
                value: targetIp,
                authorizationId: authId 
              }, config)
            ).rejects.toThrow(AuthorizationError);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: ip-nmap-scanner, Property 3: حفظ نتائج المنافذ
  it('should save all discovered ports to database', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          port: fc.integer({ min: 1, max: 65535 }),
          protocol: fc.constantFrom('tcp', 'udp'),
          state: fc.constantFrom('open', 'closed', 'filtered')
        })),
        async (ports) => {
          const sessionId = await createTestScan();
          await savePorts(sessionId, ports);
          
          const savedPorts = await getPortsFromDatabase(sessionId);
          expect(savedPorts).toHaveLength(ports.length);
          
          ports.forEach((port, index) => {
            expect(savedPorts[index]).toMatchObject(port);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: ip-nmap-scanner, Property 7: تصنيف الثغرات بمستوى خطورة صالح
  it('should classify all vulnerabilities with valid severity', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          type: fc.string(),
          title: fc.string(),
          description: fc.string()
        })),
        async (vulnerabilities) => {
          const sessionId = await createTestScan();
          await saveVulnerabilities(sessionId, vulnerabilities);
          
          const saved = await getVulnerabilitiesFromDatabase(sessionId);
          const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
          
          saved.forEach(vuln => {
            expect(validSeverities).toContain(vuln.severity);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Feature: ip-nmap-scanner, Property 15: منع حقن الأوامر
  it('should prevent command injection in all inputs', () => {
    fc.assert(
      fc.property(
        fc.string(),
        async (maliciousInput) => {
          const dangerousChars = [';', '|', '&', '$', '`', '\n', '$(', '&&', '||'];
          const containsDangerous = dangerousChars.some(char => 
            maliciousInput.includes(char)
          );
          
          if (containsDangerous) {
            await expect(
              nmapService.executeCustomScan(userId, maliciousInput, [])
            ).rejects.toThrow(ValidationError);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### اختبارات التكامل (Integration Tests)

**التركيز:**
- التدفقات الكاملة من البداية إلى النهاية
- التكامل بين المكونات المختلفة
- التكامل مع قاعدة البيانات الحقيقية
- التكامل مع Nmap الفعلي (في بيئة اختبار آمنة)

**أمثلة:**

```typescript
describe('Integration Tests - Full Scan Flow', () => {
  it('should complete full scan workflow', async () => {
    // 1. Create authorization
    const auth = await createTestAuthorization();
    
    // 2. Start scan
    const session = await nmapService.startScan(userId, {
      type: 'SINGLE_IP',
      value: '127.0.0.1', // localhost for safe testing
      authorizationId: auth.id
    }, {
      scanType: 'QUICK_SCAN',
      timing: 'T4',
      serviceDetection: true,
      osDetection: false,
      vulnerabilityScan: false
    });
    
    // 3. Wait for completion
    await waitForScanCompletion(session.id, 60000);
    
    // 4. Verify results saved
    const results = await nmapService.getResults(session.id);
    expect(results.hosts).toBeDefined();
    expect(results.summary).toBeDefined();
    
    // 5. Verify database persistence
    const dbSession = await getScanSessionFromDB(session.id);
    expect(dbSession.status).toBe('COMPLETED');
    
    // 6. Verify notification sent
    const notifications = await getNotifications(userId);
    expect(notifications).toContainEqual(
      expect.objectContaining({
        type: 'SCAN_COMPLETED',
        sessionId: session.id
      })
    );
  });
});
```

### تغطية الاختبار (Test Coverage)

**الأهداف:**
- تغطية الأسطر: > 80%
- تغطية الفروع: > 75%
- تغطية الدوال: > 85%

**الأدوات:**
- Jest للاختبارات
- fast-check للاختبارات القائمة على الخصائص
- Istanbul/nyc لقياس التغطية

### بيئة الاختبار

**المتطلبات:**
- Nmap مثبت (الإصدار 7.80 أو أحدث)
- PostgreSQL لاختبارات قاعدة البيانات
- Redis لاختبارات التخزين المؤقت
- Docker لبيئة اختبار معزولة

**الإعداد:**
```bash
# تشغيل بيئة الاختبار
docker-compose -f docker-compose.test.yml up -d

# تشغيل الاختبارات
npm test

# تشغيل اختبارات الخصائص فقط
npm run test:properties

# تشغيل اختبارات التكامل
npm run test:integration

# قياس التغطية
npm run test:coverage
```
