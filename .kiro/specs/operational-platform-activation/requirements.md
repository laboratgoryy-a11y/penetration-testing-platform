# Requirements Document

## Introduction

هذا المستند يحدد متطلبات تحويل منصة اختبار الاختراق من واجهة عرض ثابتة إلى نظام تشغيلي فعلي بالكامل. المنصة الحالية تحتوي على واجهة مستخدم وبنية تحتية للـ Backend، لكنها غير مربوطة بشكل كامل. الهدف هو تفعيل جميع الوظائف وجعل المنصة قابلة للاستخدام الفعلي لإجراء اختبارات الأمن السيبراني.

## Glossary

- **Platform**: منصة اختبار الاختراق الكاملة (Frontend + Backend + Database)
- **Dashboard**: لوحة التحكم الرئيسية التي تعرض الإحصائيات والبيانات
- **Operation**: عملية اختبار أمني (فحص ويب، تحليل شبكة، حملة تصيد)
- **Web_Scanner**: نظام فحص تطبيقات الويب للكشف عن الثغرات
- **Phishing_Campaign**: حملة تصيد إلكتروني لاختبار الوعي الأمني
- **Network_Analyzer**: نظام تحليل الشبكات اللاسلكية
- **Permission_System**: نظام إدارة التصاريح القانونية
- **Report_Generator**: نظام توليد التقارير
- **Audit_Logger**: نظام تسجيل سجلات التدقيق
- **Real_Time_Update**: تحديث البيانات تلقائياً كل 30 ثانية
- **API_Client**: عميل API للتواصل بين Frontend و Backend
- **Database**: قاعدة بيانات PostgreSQL

## Requirements

### Requirement 1: نقطة دخول تشغيلية واضحة

**User Story:** كمستخدم للمنصة، أريد نقطة دخول واضحة لبدء عمليات جديدة، حتى أتمكن من استخدام المنصة بسهولة دون الحاجة للبحث عن كيفية البدء.

#### Acceptance Criteria

1. WHEN a user views the Dashboard, THE Platform SHALL display a prominent "بدء عملية جديدة" button
2. WHEN a user clicks the "بدء عملية جديدة" button, THE Platform SHALL display a unified form with operation type selection
3. THE Platform SHALL provide three operation types: Web Scan, Network Analysis, and Phishing Campaign
4. WHEN a user selects an operation type, THE Platform SHALL display relevant input fields for that operation type
5. WHEN a user submits the operation form with valid data, THE Platform SHALL create the operation and display execution status immediately
6. WHEN a user submits the operation form with invalid data, THE Platform SHALL display validation errors and prevent submission

### Requirement 2: ربط لوحة التحكم بقاعدة البيانات

**User Story:** كمستخدم للمنصة، أريد رؤية إحصائيات حقيقية في لوحة التحكم، حتى أتمكن من متابعة حالة العمليات والنتائج بشكل دقيق.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Platform SHALL fetch statistics from the Database
2. THE Dashboard SHALL display the total count of scans, vulnerabilities discovered, and active campaigns
3. WHILE the Dashboard is open, THE Platform SHALL update statistics automatically every 30 seconds
4. WHEN new operations complete, THE Dashboard SHALL reflect the updated counts within 30 seconds
5. IF the Database connection fails, THEN THE Platform SHALL display an error message and retry after 30 seconds

### Requirement 3: تفعيل قسم فحص الويب

**User Story:** كمختبر اختراق، أريد إنشاء وإدارة فحوصات الويب، حتى أتمكن من اكتشاف الثغرات في تطبيقات الويب المستهدفة.

#### Acceptance Criteria

1. WHEN a user navigates to the Web Scanner section, THE Platform SHALL display a form to create a new scan
2. THE Web_Scanner form SHALL accept target URL, scan depth, and scan type as inputs
3. WHEN a user submits a valid scan request, THE Web_Scanner SHALL create the scan and start execution
4. THE Platform SHALL display a list of all scans with their current status (running, completed, failed)
5. WHEN a user clicks on a scan, THE Platform SHALL display detailed information including discovered vulnerabilities
6. WHEN a scan is running, THE Platform SHALL provide an option to stop the scan
7. WHEN a scan is completed, THE Platform SHALL provide an option to download the report in PDF format

### Requirement 4: تفعيل قسم حملات التصيد

**User Story:** كمختبر اختراق، أريد إنشاء وإدارة حملات التصيد الإلكتروني، حتى أتمكن من اختبار الوعي الأمني للموظفين.

#### Acceptance Criteria

1. WHEN a user navigates to the Phishing Campaign section, THE Platform SHALL display a form to create a new campaign
2. THE Phishing_Campaign form SHALL accept campaign name, target emails list, and email template as inputs
3. WHEN a user submits a valid campaign request, THE Phishing_Campaign SHALL create the campaign and send emails to targets
4. THE Platform SHALL display a list of all campaigns with their current status
5. WHEN a user clicks on a campaign, THE Platform SHALL display statistics including emails sent, opened, and clicked
6. WHILE a campaign is active, THE Platform SHALL update interaction statistics in real-time
7. WHEN a campaign is completed, THE Platform SHALL provide an option to download the campaign report

### Requirement 5: تفعيل قسم تحليل الشبكات

**User Story:** كمختبر اختراق، أريد تحليل الشبكات اللاسلكية، حتى أتمكن من اكتشاف الثغرات الأمنية في الشبكات.

#### Acceptance Criteria

1. WHEN a user navigates to the Network Analyzer section, THE Platform SHALL display a form to start network analysis
2. THE Network_Analyzer form SHALL accept SSID or BSSID as input
3. WHEN a user submits a valid analysis request, THE Network_Analyzer SHALL start scanning the network
4. THE Platform SHALL display discovered devices with their MAC addresses, IP addresses, and device types
5. THE Platform SHALL display discovered vulnerabilities for each device
6. WHEN analysis is completed, THE Platform SHALL provide an option to download the analysis report

### Requirement 6: تفعيل قسم التصاريح

**User Story:** كمدير للمنصة، أريد إدارة التصاريح القانونية، حتى أتمكن من التأكد من أن جميع العمليات مصرح بها قانونياً.

#### Acceptance Criteria

1. WHEN a user navigates to the Permission System section, THE Platform SHALL display a list of all permissions
2. THE Platform SHALL provide a form to add a new permission with client name, scope, and expiry date
3. WHEN a user submits a valid permission, THE Permission_System SHALL store it in the Database
4. THE Platform SHALL allow users to upload supporting documents for each permission
5. THE Permission_System SHALL validate permission expiry dates and mark expired permissions
6. WHEN a user attempts to start an operation without valid permission, THE Platform SHALL prevent the operation and display a warning

### Requirement 7: تفعيل قسم التقارير

**User Story:** كمستخدم للمنصة، أريد توليد وتحميل التقارير، حتى أتمكن من توثيق نتائج الاختبارات ومشاركتها مع العملاء.

#### Acceptance Criteria

1. WHEN a user navigates to the Report Generator section, THE Platform SHALL display a list of all generated reports
2. THE Platform SHALL provide options to generate reports for scans, campaigns, and network analyses
3. WHEN a user requests a new report, THE Report_Generator SHALL create the report and store it in the Database
4. THE Platform SHALL provide options to download reports in PDF, JSON, and HTML formats
5. THE Platform SHALL provide filters to search reports by type, date, and status
6. WHEN a report is generated, THE Platform SHALL display a preview of the report content

### Requirement 8: تفعيل قسم السجلات

**User Story:** كمدير للمنصة، أريد عرض سجلات التدقيق، حتى أتمكن من تتبع جميع الأنشطة والعمليات على المنصة.

#### Acceptance Criteria

1. WHEN a user navigates to the Audit Logger section, THE Platform SHALL display all audit logs
2. THE Audit_Logger SHALL record all user actions including login, operation creation, and report generation
3. THE Platform SHALL provide filters to search logs by action type, user, and date range
4. THE Platform SHALL display log details including timestamp, user, action, and affected resources
5. THE Platform SHALL provide an option to export logs in CSV format
6. WHEN a critical action occurs, THE Audit_Logger SHALL mark it with high priority

### Requirement 9: التنقل الفعلي

**User Story:** كمستخدم للمنصة، أريد التنقل بسهولة بين الأقسام المختلفة، حتى أتمكن من الوصول إلى جميع الوظائف بسرعة.

#### Acceptance Criteria

1. WHEN a user clicks on any sidebar menu item, THE Platform SHALL navigate to the corresponding section
2. THE Platform SHALL load section content dynamically without full page reload
3. THE Platform SHALL maintain navigation state in the browser URL
4. THE Platform SHALL display breadcrumbs showing the current location
5. WHEN a user uses browser back/forward buttons, THE Platform SHALL navigate correctly
6. THE Platform SHALL highlight the active section in the sidebar menu

### Requirement 10: عرض النتائج الحقيقية

**User Story:** كمستخدم للمنصة، أريد رؤية النتائج بشكل واضح وتفاعلي، حتى أتمكن من تحليل البيانات واتخاذ القرارات بسرعة.

#### Acceptance Criteria

1. THE Platform SHALL display all data in interactive tables with sorting and filtering capabilities
2. THE Platform SHALL display statistics using charts and graphs
3. WHILE operations are running, THE Platform SHALL update their status in real-time
4. WHEN an operation completes, THE Platform SHALL display a notification to the user
5. THE Platform SHALL provide pagination for large data sets with configurable page size
6. THE Platform SHALL display loading indicators while fetching data from the API

### Requirement 11: API Integration

**User Story:** كمطور للمنصة، أريد تكامل كامل بين Frontend و Backend، حتى تعمل جميع الوظائف بشكل صحيح.

#### Acceptance Criteria

1. THE API_Client SHALL communicate with the Backend using RESTful API endpoints
2. WHEN an API request fails, THE API_Client SHALL retry up to 3 times with exponential backoff
3. THE API_Client SHALL include authentication tokens in all requests
4. WHEN authentication fails, THE Platform SHALL redirect the user to the login page
5. THE API_Client SHALL handle network errors gracefully and display user-friendly error messages
6. THE Platform SHALL validate all user inputs before sending them to the API

### Requirement 12: Real-Time Updates

**User Story:** كمستخدم للمنصة، أريد رؤية التحديثات الفورية، حتى أتمكن من متابعة تقدم العمليات دون الحاجة لتحديث الصفحة يدوياً.

#### Acceptance Criteria

1. WHILE a user is viewing the Dashboard, THE Platform SHALL poll the API every 30 seconds for updates
2. WHILE a user is viewing an active operation, THE Platform SHALL poll for status updates every 10 seconds
3. WHEN new data is received, THE Platform SHALL update the UI smoothly without disrupting user interaction
4. THE Platform SHALL display a timestamp showing when data was last updated
5. WHEN the user is inactive for 5 minutes, THE Platform SHALL pause polling to save resources
6. WHEN the user becomes active again, THE Platform SHALL resume polling immediately
