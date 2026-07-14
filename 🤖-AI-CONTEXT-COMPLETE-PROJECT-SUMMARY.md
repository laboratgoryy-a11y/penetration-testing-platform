# 🤖 ملخص شامل للمشروع للذكاء الاصطناعي
# Complete Project Summary for AI

## 📋 معلومات أساسية | Basic Information

**اسم المشروع**: منصة اختبار الاختراق والأمن الهجومي
**Project Name**: Penetration Testing Platform
**Version**: 1.0.0
**Status**: Production Ready (Educational)
**Port**: 3001

---

## 🏗️ البنية التقنية | Tech Stack

### Backend:
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.9.3
- **Framework**: Express.js 4.18.2
- **Database**: MySQL 8.0+ (current: "web scanner")
- **Cache**: Redis 4.6.12
- **Auth**: JWT + bcrypt + MFA (speakeasy)

### Frontend:
- **Pure JavaScript** (Vanilla JS)
- **HTML5 + CSS3**
- **No Framework** - Custom Manager classes

### Key Libraries:
```json
{
  "axios": "HTTP client",
  "cheerio": "HTML parsing",
  "helmet": "Security headers",
  "express-rate-limit": "Rate limiting",
  "nodemailer": "Email",
  "pdfkit": "PDF reports",
  "node-nmap": "Network scanning",
  "uuid": "ID generation"
}
```

---

## 📁 هيكل المشروع | Project Structure

```
src/
├── api/routes/          # API endpoints
├── services/            # Business logic
│   ├── AuthenticationService.ts
│   ├── WebScanner.ts
│   ├── PhishingEngine.ts
│   ├── NetworkAnalyzer.ts
│   ├── ReportGenerator.ts
│   └── ip-scanner/
├── repositories/        # Data access
├── models/              # Data models
├── database/            # DB connection & migrations
├── types/               # TypeScript types
├── utils/               # Helpers
└── __tests__/           # Tests

public/
├── js/                  # Frontend JavaScript
│   ├── api.js
│   ├── auth.js
│   ├── operations-manager.js
│   ├── web-scanner-manager.js
│   ├── phishing-campaign-manager.js
│   └── network-analyzer-manager.js
└── css/                 # Styles
```

---

## 💾 قاعدة البيانات | Database Schema

### Current Database:
- **Name**: `web scanner` (with space)
- **Type**: MySQL
- **Port**: 3306
- **User**: root
- **Password**: admin (or empty)

### Main Tables (18 tables):

**Users & Auth:**
- users, sessions, roles, permissions
- role_permissions, user_roles

**Authorizations:**
- authorizations, authorization_scopes
- authorization_operations

**Web Scanning:**
- scan_sessions, vulnerabilities

**Phishing:**
- phishing_campaigns, campaign_targets
- campaign_interactions

**Network:**
- network_test_sessions, network_vulnerabilities
- discovered_devices

**System:**
- audit_logs, reports

---

## 🔌 API Endpoints | نقاط النهاية

### Base URL: `/api/v1`

**Authentication:**
```
POST   /auth/login
POST   /auth/logout
GET    /auth/me
POST   /auth/mfa/enable
```

**Dashboard:**
```
GET    /dashboard/stats
GET    /dashboard/vulnerability-distribution
```

**Authorizations:**
```
GET    /authorizations
POST   /authorizations
GET    /authorizations/:id
POST   /authorizations/:id/validate
POST   /authorizations/:id/revoke
```

**Web Scanning:**
```
GET    /scans/web
POST   /scans/web
GET    /scans/web/:id
GET    /scans/web/:id/vulnerabilities
POST   /scans/web/:id/stop
```

**Phishing:**
```
GET    /phishing/campaigns
POST   /phishing/campaigns
GET    /phishing/campaigns/:id
POST   /phishing/campaigns/:id/launch
GET    /phishing/campaigns/:id/results
```

**Network:**
```
GET    /network/tests
POST   /network/tests
GET    /network/tests/:id
GET    /network/tests/:id/results
POST   /network/discover
```

**Reports:**
```
GET    /reports
POST   /reports
GET    /reports/:id/download
```

---

## 🎯 الميزات الرئيسية | Core Features

### 1. Web Vulnerability Scanner
**Vulnerability Types:**
- SQL_INJECTION, XSS, CSRF
- DIRECTORY_TRAVERSAL, COMMAND_INJECTION
- XXE, SSRF, OPEN_REDIRECT

**Severity Levels:**
- CRITICAL (9.0-10.0)
- HIGH (7.0-8.9)
- MEDIUM (4.0-6.9)
- LOW (0.1-3.9)
- INFO (0.0)

### 2. Phishing Campaign System
**Email Templates:**
- password-reset, security-alert
- invoice, package-delivery

**Landing Pages:**
- office365, gmail, bank

**Interaction Types:**
- EMAIL_SENT, EMAIL_OPENED
- LINK_CLICKED, DATA_SUBMITTED

### 3. Network Analyzer
**Test Types:**
- WEP_CRACK, WPA_HANDSHAKE
- WPS_ATTACK, DEAUTH_ATTACK
- EVIL_TWIN

**Network Info:**
- SSID, BSSID, Encryption
- Channel, Frequency, Signal Strength
- Manufacturer, Security Score

### 4. IP Scanner
**Scan Types:**
- QUICK (top-100 ports)
- STANDARD (top-1000 ports)
- FULL (all 65535 ports)
- CUSTOM (user-defined)

**Features:**
- Port scanning
- Service detection
- OS detection
- NSE scripts
- Vulnerability scanning

### 5. Report Generator
**Formats:**
- PDF, HTML, JSON, CSV, XML

**Types:**
- SCAN, PHISHING, NETWORK
- IP_SCAN, COMPLIANCE
- EXECUTIVE, TECHNICAL

---

## 🔐 نظام الأمان | Security System

### Authentication:
- JWT tokens (30min access, 7days refresh)
- bcrypt password hashing (12 rounds)
- MFA/TOTP support
- Account lockout (5 failed attempts)

### Authorization:
- Role-Based Access Control (RBAC)
- 4 default roles: ADMIN, AUDITOR, PENTESTER, ANALYST
- 13 permissions across 7 resources
- Authorization validation before operations

### Encryption:
- AES-256-GCM for sensitive data
- TLS/SSL for transport
- Encrypted campaign data (BLOB)

### Rate Limiting:
- 100 requests per 15 minutes (general)
- 5 requests per 15 minutes (auth)

### Audit Logging:
- All operations logged
- User, timestamp, action, result
- IP address, user agent
- 7-year retention

---

## 🧪 الاختبارات | Testing

### Test Types:
- **Unit Tests**: Service logic
- **Integration Tests**: API endpoints
- **Property Tests**: fast-check

### Coverage:
- Statements: 85%
- Branches: 78%
- Functions: 82%
- Lines: 85%

### Test Files: 50+ test files
- auth.test.ts
- authorization.test.ts
- webscanner.test.ts
- phishing.test.ts
- network-analyzer.test.ts
- integration-*.test.ts
- *.property.test.ts

---

## 🚀 التشغيل | Running

### Development:
```bash
npm run dev
# or
docker-compose -f docker-compose.dev.yml up
```

### Production:
```bash
npm run build
npm start
# or
docker-compose up -d
```

### Database:
```bash
npm run db:migrate
```

### Tests:
```bash
npm test
npm run test:coverage
```

---

## 📊 الحالة الحالية | Current Status

### ✅ Working:
- Authentication & Authorization
- Authorization Management
- Web Scanning (simulated)
- Phishing Campaigns (simulated)
- Network Analysis (simulated)
- IP Scanning (real with Nmap)
- Report Generation
- Audit Logging
- Dashboard
- Frontend UI

### 🔄 Needs Development:
- Real web vulnerability scanning
- Real network cracking (impossible from browser)
- Integration with external tools
- Performance optimization
- More tests

### ⚠️ Important Notes:
- Results are SIMULATED for educational purposes
- Real network cracking requires specialized tools
- Cannot crack WiFi passwords from web browser
- Requires authorization before any operation

---

## 💡 للذكاء الاصطناعي | For AI

### عند طلب كود جديد:
1. **اتبع البنية الحالية**: TypeScript, Express, MySQL
2. **استخدم الأنماط الموجودة**: Services, Repositories, Models
3. **احترم الأمان**: Always validate authorization
4. **اكتب اختبارات**: Unit + Integration tests
5. **وثق الكود**: JSDoc comments
6. **اتبع المعايير**: ESLint + Prettier

### الملفات المهمة للقراءة:
```
src/services/AuthenticationService.ts
src/services/AuthorizationService.ts
src/api/routes/*.routes.ts
src/database/schema-mysql-complete.sql
public/js/operations-manager.js
server-full-mysql.js
```

### أنماط الكود:
```typescript
// Service Pattern
class MyService {
  async doSomething(params: Params): Promise<Result> {
    // Validate authorization
    await this.validateAuth(params.authId);
    
    // Business logic
    const result = await this.process(params);
    
    // Audit log
    await this.auditLogger.log({...});
    
    return result;
  }
}

// API Route Pattern
router.post('/endpoint', async (req, res) => {
  try {
    const result = await service.doSomething(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: { message: error.message } 
    });
  }
});
```

### قواعد مهمة:
1. **Always use TypeScript** for backend
2. **Always validate input**
3. **Always check authorization**
4. **Always log to audit**
5. **Always handle errors**
6. **Always write tests**
7. **Never expose sensitive data**
8. **Never skip validation**

---

## 📞 معلومات إضافية | Additional Info

### Environment Variables (.env):
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=web scanner
DB_USER=root
DB_PASSWORD=admin

PORT=3001
JWT_SECRET=your_secret
ENCRYPTION_KEY=your_key
```

### Default Users:
```
admin / 123456 (ADMIN role)
user1 / 123456 (USER role)
user2 / 123456 (USER role)
```

### URLs:
```
Frontend: http://localhost:3001
Login: http://localhost:3001/login.html
API: http://localhost:3001/api/v1
API Docs: http://localhost:3001/api-docs
```

---

## 🎯 خلاصة سريعة | Quick Summary

**المشروع**: منصة اختبار اختراق تعليمية شاملة
**التقنيات**: TypeScript + Express + MySQL + Vanilla JS
**الميزات**: Web Scan + Phishing + Network Analysis + IP Scan
**الأمان**: JWT + RBAC + MFA + Encryption + Audit
**الحالة**: جاهز للاستخدام التعليمي
**النتائج**: محاكاة (لا يمكن اختراق حقيقي من المتصفح)

---

**تاريخ التحليل**: 2026-02-28
**الإصدار**: 1.0.0
**الحالة**: Production Ready (Educational)

