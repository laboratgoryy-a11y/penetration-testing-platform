# Design Document: Operational Platform Activation

## Overview

هذا التصميم يحول منصة اختبار الاختراق من واجهة عرض ثابتة إلى نظام تشغيلي فعلي بالكامل. التصميم يركز على:

1. **ربط Frontend بـ Backend** عبر API Client محسّن
2. **تحديثات فورية** باستخدام Polling كل 30 ثانية
3. **تفعيل جميع الأقسام** مع واجهات مستخدم تفاعلية
4. **إدارة الحالة** المركزية للبيانات
5. **معالجة الأخطاء** الشاملة

المنصة الحالية تحتوي على:
- Frontend: HTML, CSS, JavaScript (Vanilla)
- Backend: Node.js, Express
- Database: PostgreSQL
- ملفات موجودة: `public/js/main.js`, `public/js/dashboard.js`, `public/js/api.js`, `public/js/auth.js`

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Operations  │  │   Reports    │      │
│  │   Manager    │  │   Manager    │  │   Manager    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  State Manager  │                        │
│                   └────────┬────────┘                        │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │   API Client    │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTP/REST
┌────────────────────────────▼─────────────────────────────────┐
│                        Backend Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Scanner    │  │   Campaign   │  │   Network    │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│                   ┌────────▼────────┐                        │
│                   │  Data Access    │                        │
│                   │     Layer       │                        │
│                   └────────┬────────┘                        │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   PostgreSQL    │
                    │    Database     │
                    └─────────────────┘
```

### Component Interaction Flow

```
User Action → UI Component → State Manager → API Client → Backend API
                                    ↓
                            Update UI State
                                    ↓
                            Re-render Component
```

## Components and Interfaces

### 1. State Manager

مدير الحالة المركزي الذي يحتفظ بجميع بيانات التطبيق ويدير التحديثات.

```javascript
class StateManager {
  constructor() {
    this.state = {
      dashboard: {
        stats: { scans: 0, vulnerabilities: 0, campaigns: 0 },
        lastUpdate: null
      },
      operations: {
        scans: [],
        campaigns: [],
        analyses: []
      },
      permissions: [],
      reports: [],
      auditLogs: [],
      currentUser: null,
      loading: false,
      error: null
    };
    this.listeners = [];
    this.pollingIntervals = new Map();
  }

  // Get current state
  getState() { return this.state; }

  // Update state and notify listeners
  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Start polling for updates
  startPolling(key, fetchFunction, interval) {
    if (this.pollingIntervals.has(key)) {
      return; // Already polling
    }
    
    const intervalId = setInterval(async () => {
      try {
        const data = await fetchFunction();
        this.setState({ [key]: data });
      } catch (error) {
        console.error(`Polling error for ${key}:`, error);
      }
    }, interval);
    
    this.pollingIntervals.set(key, intervalId);
  }

  // Stop polling
  stopPolling(key) {
    if (this.pollingIntervals.has(key)) {
      clearInterval(this.pollingIntervals.get(key));
      this.pollingIntervals.delete(key);
    }
  }

  // Stop all polling
  stopAllPolling() {
    this.pollingIntervals.forEach(intervalId => clearInterval(intervalId));
    this.pollingIntervals.clear();
  }
}
```

### 2. Enhanced API Client

عميل API محسّن مع إعادة المحاولة ومعالجة الأخطاء.

```javascript
class EnhancedAPIClient {
  constructor(baseURL, authManager) {
    this.baseURL = baseURL;
    this.authManager = authManager;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  // Make API request with retry logic
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.authManager.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };

    let lastError;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers
        });

        if (response.status === 401) {
          // Authentication failed
          this.authManager.logout();
          throw new Error('Authentication failed');
        }

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Request failed');
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries - 1) {
          // Wait before retry with exponential backoff
          await this.sleep(this.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // API Methods
  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }

  async getScans() {
    return this.request('/api/scans');
  }

  async createScan(scanData) {
    return this.request('/api/scans', {
      method: 'POST',
      body: JSON.stringify(scanData)
    });
  }

  async getScanDetails(scanId) {
    return this.request(`/api/scans/${scanId}`);
  }

  async stopScan(scanId) {
    return this.request(`/api/scans/${scanId}/stop`, {
      method: 'POST'
    });
  }

  async getCampaigns() {
    return this.request('/api/campaigns');
  }

  async createCampaign(campaignData) {
    return this.request('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData)
    });
  }

  async getCampaignStats(campaignId) {
    return this.request(`/api/campaigns/${campaignId}/stats`);
  }

  async getNetworkAnalyses() {
    return this.request('/api/network-analyses');
  }

  async createNetworkAnalysis(analysisData) {
    return this.request('/api/network-analyses', {
      method: 'POST',
      body: JSON.stringify(analysisData)
    });
  }

  async getPermissions() {
    return this.request('/api/permissions');
  }

  async createPermission(permissionData) {
    return this.request('/api/permissions', {
      method: 'POST',
      body: JSON.stringify(permissionData)
    });
  }

  async uploadPermissionDocument(permissionId, file) {
    const formData = new FormData();
    formData.append('document', file);
    
    return this.request(`/api/permissions/${permissionId}/documents`, {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set Content-Type for FormData
    });
  }

  async getReports(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    return this.request(`/api/reports?${queryString}`);
  }

  async generateReport(reportData) {
    return this.request('/api/reports', {
      method: 'POST',
      body: JSON.stringify(reportData)
    });
  }

  async downloadReport(reportId, format) {
    const response = await fetch(
      `${this.baseURL}/api/reports/${reportId}/download?format=${format}`,
      {
        headers: {
          'Authorization': `Bearer ${this.authManager.getToken()}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to download report');
    }
    
    return response.blob();
  }

  async getAuditLogs(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    return this.request(`/api/audit-logs?${queryString}`);
  }

  async exportAuditLogs(filters = {}) {
    const queryString = new URLSearchParams(filters).toString();
    const response = await fetch(
      `${this.baseURL}/api/audit-logs/export?${queryString}`,
      {
        headers: {
          'Authorization': `Bearer ${this.authManager.getToken()}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to export logs');
    }
    
    return response.blob();
  }
}
```

### 3. Dashboard Manager

مدير لوحة التحكم مع التحديثات التلقائية.

```javascript
class DashboardManager {
  constructor(stateManager, apiClient) {
    this.stateManager = stateManager;
    this.apiClient = apiClient;
    this.updateInterval = 30000; // 30 seconds
  }

  async initialize() {
    // Load initial data
    await this.loadDashboardData();
    
    // Start polling for updates
    this.stateManager.startPolling(
      'dashboard',
      () => this.apiClient.getDashboardStats(),
      this.updateInterval
    );
    
    // Subscribe to state changes
    this.stateManager.subscribe(state => {
      this.renderDashboard(state.dashboard);
    });
  }

  async loadDashboardData() {
    try {
      this.stateManager.setState({ loading: true, error: null });
      const stats = await this.apiClient.getDashboardStats();
      this.stateManager.setState({
        dashboard: {
          stats,
          lastUpdate: new Date()
        },
        loading: false
      });
    } catch (error) {
      this.stateManager.setState({
        loading: false,
        error: error.message
      });
    }
  }

  renderDashboard(dashboardData) {
    // Update stats cards
    document.getElementById('total-scans').textContent = 
      dashboardData.stats.scans || 0;
    document.getElementById('total-vulnerabilities').textContent = 
      dashboardData.stats.vulnerabilities || 0;
    document.getElementById('active-campaigns').textContent = 
      dashboardData.stats.campaigns || 0;
    
    // Update last update timestamp
    if (dashboardData.lastUpdate) {
      document.getElementById('last-update').textContent = 
        `آخر تحديث: ${this.formatTime(dashboardData.lastUpdate)}`;
    }
  }

  formatTime(date) {
    return new Intl.DateTimeFormat('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }

  destroy() {
    this.stateManager.stopPolling('dashboard');
  }
}
```

### 4. Operations Manager

مدير العمليات (فحوصات، حملات، تحليلات).

```javascript
class OperationsManager {
  constructor(stateManager, apiClient) {
    this.stateManager = stateManager;
    this.apiClient = apiClient;
    this.currentSection = null;
  }

  // Show new operation modal
  showNewOperationModal() {
    const modal = document.getElementById('new-operation-modal');
    modal.style.display = 'block';
    
    // Setup operation type selector
    document.getElementById('operation-type').addEventListener('change', (e) => {
      this.showOperationForm(e.target.value);
    });
  }

  showOperationForm(operationType) {
    // Hide all forms
    document.querySelectorAll('.operation-form').forEach(form => {
      form.style.display = 'none';
    });
    
    // Show selected form
    const formId = `${operationType}-form`;
    document.getElementById(formId).style.display = 'block';
  }

  async createWebScan(formData) {
    try {
      this.stateManager.setState({ loading: true, error: null });
      
      const scanData = {
        target_url: formData.get('target-url'),
        scan_depth: parseInt(formData.get('scan-depth')),
        scan_type: formData.get('scan-type')
      };
      
      const result = await this.apiClient.createScan(scanData);
      
      // Show success notification
      this.showNotification('تم إنشاء الفحص بنجاح', 'success');
      
      // Navigate to scan details
      this.navigateToScanDetails(result.id);
      
      this.stateManager.setState({ loading: false });
    } catch (error) {
      this.stateManager.setState({
        loading: false,
        error: error.message
      });
      this.showNotification(error.message, 'error');
    }
  }

  async createPhishingCampaign(formData) {
    try {
      this.stateManager.setState({ loading: true, error: null });
      
      const campaignData = {
        name: formData.get('campaign-name'),
        targets: formData.get('target-emails').split('\n').filter(e => e.trim()),
        template: formData.get('email-template')
      };
      
      const result = await this.apiClient.createCampaign(campaignData);
      
      this.showNotification('تم إنشاء الحملة بنجاح', 'success');
      this.navigateToCampaignDetails(result.id);
      
      this.stateManager.setState({ loading: false });
    } catch (error) {
      this.stateManager.setState({
        loading: false,
        error: error.message
      });
      this.showNotification(error.message, 'error');
    }
  }

  async createNetworkAnalysis(formData) {
    try {
      this.stateManager.setState({ loading: true, error: null });
      
      const analysisData = {
        ssid: formData.get('ssid'),
        bssid: formData.get('bssid')
      };
      
      const result = await this.apiClient.createNetworkAnalysis(analysisData);
      
      this.showNotification('تم بدء التحليل بنجاح', 'success');
      this.navigateToAnalysisDetails(result.id);
      
      this.stateManager.setState({ loading: false });
    } catch (error) {
      this.stateManager.setState({
        loading: false,
        error: error.message
      });
      this.showNotification(error.message, 'error');
    }
  }

  showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  navigateToScanDetails(scanId) {
    window.location.hash = `#/scans/${scanId}`;
  }

  navigateToCampaignDetails(campaignId) {
    window.location.hash = `#/campaigns/${campaignId}`;
  }

  navigateToAnalysisDetails(analysisId) {
    window.location.hash = `#/analyses/${analysisId}`;
  }
}
```

### 5. Navigation Manager

مدير التنقل بين الأقسام.

```javascript
class NavigationManager {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.routes = new Map();
    this.currentRoute = null;
  }

  initialize() {
    // Register routes
    this.registerRoute('/', () => this.loadDashboard());
    this.registerRoute('/scans', () => this.loadScans());
    this.registerRoute('/scans/:id', (params) => this.loadScanDetails(params.id));
    this.registerRoute('/campaigns', () => this.loadCampaigns());
    this.registerRoute('/campaigns/:id', (params) => this.loadCampaignDetails(params.id));
    this.registerRoute('/network', () => this.loadNetworkAnalyses());
    this.registerRoute('/permissions', () => this.loadPermissions());
    this.registerRoute('/reports', () => this.loadReports());
    this.registerRoute('/audit-logs', () => this.loadAuditLogs());
    
    // Listen to hash changes
    window.addEventListener('hashchange', () => this.handleRouteChange());
    
    // Handle initial route
    this.handleRouteChange();
  }

  registerRoute(path, handler) {
    this.routes.set(path, handler);
  }

  handleRouteChange() {
    const hash = window.location.hash.slice(1) || '/';
    
    // Find matching route
    for (const [path, handler] of this.routes) {
      const params = this.matchRoute(path, hash);
      if (params !== null) {
        this.currentRoute = path;
        this.updateBreadcrumbs(hash);
        this.highlightActiveMenuItem(hash);
        handler(params);
        return;
      }
    }
    
    // No route found, redirect to dashboard
    window.location.hash = '#/';
  }

  matchRoute(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    
    if (patternParts.length !== pathParts.length) {
      return null;
    }
    
    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const paramName = patternParts[i].slice(1);
        params[paramName] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    
    return params;
  }

  updateBreadcrumbs(path) {
    const breadcrumbsContainer = document.getElementById('breadcrumbs');
    const parts = path.split('/').filter(p => p);
    
    let html = '<a href="#/">الرئيسية</a>';
    let currentPath = '';
    
    parts.forEach((part, index) => {
      currentPath += '/' + part;
      const isLast = index === parts.length - 1;
      
      if (isLast) {
        html += ` / <span>${this.translatePath(part)}</span>`;
      } else {
        html += ` / <a href="#${currentPath}">${this.translatePath(part)}</a>`;
      }
    });
    
    breadcrumbsContainer.innerHTML = html;
  }

  translatePath(path) {
    const translations = {
      'scans': 'فحوصات الويب',
      'campaigns': 'حملات التصيد',
      'network': 'تحليل الشبكات',
      'permissions': 'التصاريح',
      'reports': 'التقارير',
      'audit-logs': 'سجلات التدقيق'
    };
    return translations[path] || path;
  }

  highlightActiveMenuItem(path) {
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
      link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`.sidebar-menu a[href="#${path}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }

  loadDashboard() {
    document.getElementById('main-content').innerHTML = 
      document.getElementById('dashboard-template').innerHTML;
  }

  loadScans() {
    document.getElementById('main-content').innerHTML = 
      document.getElementById('scans-template').innerHTML;
  }

  loadScanDetails(scanId) {
    document.getElementById('main-content').innerHTML = 
      document.getElementById('scan-details-template').innerHTML;
  }

  loadCampaigns() {
    document.getElementById('main-content').innerHTML = 
      document.getElementById('campaigns-template').innerHTML;
  }

  loadCampaignDetails(campaignId) {
    document.getElementById('main-content').innerHTML = 
      document.getElementById('campaign-details-template').innerHTML;
  }

  loadNetworkAnalyses() {
    document.getElementById('main-content').innerHTML = 
      document.getElementById('network-template').innerHTML;
  }

  loadPermissions() {
    document.getElementById('main-content').innerHTML = 
      document.getElementById('permissions-template').innerHTML;
  }

  loadReports() {
    document.getElementById('main-content').innerHTML = 
      document.getElementById('reports-template').innerHTML;
  }

  loadAuditLogs() {
    document.getElementById('main-content').innerHTML = 
      document.getElementById('audit-logs-template').innerHTML;
  }
}
```

## Data Models

### Scan Model

```javascript
{
  id: string,
  target_url: string,
  scan_type: 'quick' | 'full' | 'custom',
  scan_depth: number,
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped',
  progress: number, // 0-100
  vulnerabilities: [
    {
      id: string,
      type: string,
      severity: 'low' | 'medium' | 'high' | 'critical',
      description: string,
      url: string,
      recommendation: string
    }
  ],
  created_at: timestamp,
  started_at: timestamp,
  completed_at: timestamp
}
```

### Campaign Model

```javascript
{
  id: string,
  name: string,
  status: 'draft' | 'active' | 'completed' | 'paused',
  targets: [
    {
      email: string,
      status: 'sent' | 'opened' | 'clicked' | 'failed',
      sent_at: timestamp,
      opened_at: timestamp,
      clicked_at: timestamp
    }
  ],
  template: {
    subject: string,
    body: string,
    sender_name: string,
    sender_email: string
  },
  stats: {
    total: number,
    sent: number,
    opened: number,
    clicked: number,
    failed: number
  },
  created_at: timestamp,
  launched_at: timestamp
}
```

### Network Analysis Model

```javascript
{
  id: string,
  ssid: string,
  bssid: string,
  status: 'pending' | 'scanning' | 'completed' | 'failed',
  devices: [
    {
      mac_address: string,
      ip_address: string,
      device_type: string,
      manufacturer: string,
      vulnerabilities: [
        {
          type: string,
          severity: 'low' | 'medium' | 'high' | 'critical',
          description: string
        }
      ]
    }
  ],
  created_at: timestamp,
  completed_at: timestamp
}
```

### Permission Model

```javascript
{
  id: string,
  client_name: string,
  scope: string,
  start_date: date,
  expiry_date: date,
  status: 'active' | 'expired' | 'revoked',
  documents: [
    {
      id: string,
      filename: string,
      file_path: string,
      uploaded_at: timestamp
    }
  ],
  created_at: timestamp
}
```

### Report Model

```javascript
{
  id: string,
  type: 'scan' | 'campaign' | 'network',
  reference_id: string, // ID of scan/campaign/analysis
  title: string,
  status: 'generating' | 'completed' | 'failed',
  formats: ['pdf', 'json', 'html'],
  created_at: timestamp,
  generated_at: timestamp
}
```

### Audit Log Model

```javascript
{
  id: string,
  user_id: string,
  user_email: string,
  action: string,
  resource_type: string,
  resource_id: string,
  details: object,
  ip_address: string,
  priority: 'low' | 'medium' | 'high',
  timestamp: timestamp
}
```

## Correctness Properties

*الخصائص (Properties) هي مواصفات رسمية تصف السلوك المتوقع للنظام عبر جميع الحالات الممكنة. تُستخدم هذه الخصائص كأساس لاختبارات Property-Based Testing التي تتحقق من صحة النظام عبر مدخلات متنوعة ومُولّدة تلقائياً.*


### Property 1: Operation Type Form Display

*For any* operation type selection (Web Scan, Phishing Campaign, Network Analysis), when a user selects that type, the platform should display the correct form with all required input fields for that specific operation type.

**Validates: Requirements 1.4**

### Property 2: Valid Operation Creation

*For any* valid operation data (scan, campaign, or analysis), when a user submits the operation form, the platform should successfully create the operation, store it in the database, and return a valid operation ID.

**Validates: Requirements 1.5, 3.3, 4.3, 5.3, 6.3, 7.3**

### Property 3: Invalid Input Rejection

*For any* invalid operation data (missing required fields, invalid formats, out-of-range values), when a user attempts to submit the form, the platform should reject the submission, display validation errors, and prevent the API call.

**Validates: Requirements 1.6, 11.6**

### Property 4: Dashboard Statistics Update

*For any* time interval while the dashboard is open, the platform should poll the API every 30 seconds and update the displayed statistics with the latest data from the database.

**Validates: Requirements 2.3, 2.4, 12.1**

### Property 5: Operation List Completeness

*For any* set of operations (scans, campaigns, or analyses) in the database, when a user views the corresponding list page, all operations should be displayed with their current status.

**Validates: Requirements 3.4, 4.4**

### Property 6: Operation Details Display

*For any* operation (scan, campaign, or analysis), when a user clicks on it, the platform should display all relevant details including status, results, and any discovered issues or statistics.

**Validates: Requirements 3.5, 4.5, 5.4, 5.5**

### Property 7: Real-Time Status Updates

*For any* active operation being viewed, the platform should poll for status updates every 10 seconds and reflect any status changes in the UI immediately.

**Validates: Requirements 4.6, 10.3, 12.2**

### Property 8: Permission Validation

*For any* permission with an expiry date in the past, the Permission System should mark it as expired, and any attempt to start an operation without a valid permission should be blocked with a warning message.

**Validates: Requirements 6.5, 6.6**

### Property 9: Document Upload

*For any* permission and any valid file, the platform should allow uploading the file as a supporting document and store it with the correct association to the permission.

**Validates: Requirements 6.4**

### Property 10: Filter Functionality

*For any* list view with filters (reports, audit logs), applying a filter should return only items that match the filter criteria, and the filtered list should be a subset of the unfiltered list.

**Validates: Requirements 7.5, 8.3**

### Property 11: Audit Log Recording

*For any* user action (login, operation creation, report generation, permission creation), the Audit Logger should create a log entry with all required fields (timestamp, user, action, resource) and store it in the database.

**Validates: Requirements 8.2**

### Property 12: Critical Action Priority

*For any* critical action (operation deletion, permission revocation, system configuration change), the Audit Logger should mark the log entry with high priority.

**Validates: Requirements 8.6**

### Property 13: Log Details Completeness

*For any* audit log entry, when displayed, it should include all required fields: timestamp, user, action, and affected resources.

**Validates: Requirements 8.4**

### Property 14: Navigation Routing

*For any* sidebar menu item, when clicked, the platform should navigate to the correct section, update the URL hash, display the correct breadcrumbs, and highlight the active menu item.

**Validates: Requirements 9.1, 9.3, 9.4, 9.6**

### Property 15: Dynamic Content Loading

*For any* navigation action, the platform should load the new section content without triggering a full page reload, maintaining the SPA behavior.

**Validates: Requirements 9.2**

### Property 16: Browser History Integration

*For any* navigation using browser back/forward buttons, the platform should navigate to the correct section and update the UI state accordingly.

**Validates: Requirements 9.5**

### Property 17: Table Sorting and Filtering

*For any* data table, the platform should support sorting by any column and filtering by any field, with the results correctly ordered or filtered.

**Validates: Requirements 10.1**

### Property 18: Operation Completion Notification

*For any* operation that completes (successfully or with failure), the platform should display a notification to the user with the operation result.

**Validates: Requirements 10.4**

### Property 19: Pagination Functionality

*For any* large data set, the platform should provide pagination with configurable page size, and navigating between pages should display the correct subset of data.

**Validates: Requirements 10.5**

### Property 20: Loading Indicators

*For any* API call, while the request is in progress, the platform should display a loading indicator, and hide it when the response is received or an error occurs.

**Validates: Requirements 10.6**

### Property 21: API Retry Logic

*For any* failed API request (network error, timeout, 5xx error), the API Client should retry the request up to 3 times with exponential backoff before reporting the error to the user.

**Validates: Requirements 11.2**

### Property 22: Authentication Token Inclusion

*For any* API request (except login), the API Client should include the authentication token in the request headers.

**Validates: Requirements 11.3**

### Property 23: Error Message User-Friendliness

*For any* network error or API error, the platform should display a user-friendly error message (not technical stack traces) that helps the user understand what went wrong.

**Validates: Requirements 11.5**

### Property 24: Last Update Timestamp

*For any* data update from polling, the platform should display a timestamp showing when the data was last updated.

**Validates: Requirements 12.4**

### Property 25: Inactivity Polling Pause

*For any* user inactivity period of 5 minutes, the platform should pause all polling to save resources, and resume polling immediately when the user becomes active again.

**Validates: Requirements 12.5, 12.6**

## Error Handling

### Frontend Error Handling

1. **API Errors**:
   - Network errors: Display "فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت."
   - 401 Unauthorized: Redirect to login page
   - 403 Forbidden: Display "ليس لديك صلاحية للقيام بهذا الإجراء"
   - 404 Not Found: Display "المورد المطلوب غير موجود"
   - 500 Server Error: Display "حدث خطأ في الخادم. يرجى المحاولة لاحقاً"
   - Timeout: Display "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى"

2. **Validation Errors**:
   - Display inline validation messages next to form fields
   - Highlight invalid fields with red border
   - Prevent form submission until all errors are resolved

3. **State Errors**:
   - If state becomes corrupted, reload from API
   - Log errors to console for debugging
   - Display generic error message to user

### Backend Error Handling

1. **Database Errors**:
   - Connection failures: Retry with exponential backoff
   - Query errors: Log error and return 500 status
   - Constraint violations: Return 400 with specific error message

2. **Business Logic Errors**:
   - Invalid operation state: Return 400 with error message
   - Permission denied: Return 403 with error message
   - Resource not found: Return 404 with error message

3. **External Service Errors**:
   - Scanner failures: Mark operation as failed and log error
   - Email service failures: Mark campaign as failed and retry
   - Network analysis failures: Mark analysis as failed and log error

## Testing Strategy

### Dual Testing Approach

المنصة تتطلب نهج اختبار مزدوج يجمع بين:

1. **Unit Tests**: للتحقق من أمثلة محددة، حالات حدية، وشروط الأخطاء
2. **Property-Based Tests**: للتحقق من الخصائص العامة عبر جميع المدخلات

كلا النوعين ضروري للتغطية الشاملة:
- Unit tests تكتشف أخطاء محددة في حالات معروفة
- Property tests تتحقق من الصحة العامة عبر مدخلات عشوائية متنوعة

### Unit Testing Focus

Unit tests يجب أن تركز على:
- **أمثلة محددة**: اختبار سيناريوهات محددة توضح السلوك الصحيح
- **نقاط التكامل**: اختبار التفاعل بين المكونات
- **حالات حدية**: اختبار الحالات الاستثنائية والحدود
- **شروط الأخطاء**: اختبار معالجة الأخطاء المختلفة

تجنب كتابة عدد كبير من unit tests - property tests تتعامل مع تغطية المدخلات المتنوعة.

### Property-Based Testing Configuration

**المكتبة المستخدمة**: fast-check (JavaScript/TypeScript)

**التكوين**:
- كل property test يجب أن يعمل لـ 100 iteration على الأقل
- كل property test يجب أن يشير إلى الخاصية في وثيقة التصميم
- صيغة التعليق: `// Feature: operational-platform-activation, Property N: [property text]`

**مثال على Property Test**:

```javascript
const fc = require('fast-check');

// Feature: operational-platform-activation, Property 2: Valid Operation Creation
test('Valid operation creation', () => {
  fc.assert(
    fc.property(
      fc.record({
        target_url: fc.webUrl(),
        scan_type: fc.constantFrom('quick', 'full', 'custom'),
        scan_depth: fc.integer({ min: 1, max: 10 })
      }),
      async (scanData) => {
        const result = await apiClient.createScan(scanData);
        expect(result).toHaveProperty('id');
        expect(result.status).toBe('pending');
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Coverage Requirements

1. **Frontend Tests**:
   - State Manager: 90%+ coverage
   - API Client: 90%+ coverage
   - Navigation Manager: 80%+ coverage
   - UI Components: 70%+ coverage

2. **Backend Tests**:
   - API Routes: 90%+ coverage
   - Business Logic: 95%+ coverage
   - Data Access Layer: 90%+ coverage

3. **Integration Tests**:
   - End-to-end flows for each operation type
   - Authentication and authorization flows
   - Real-time update flows

### Testing Tools

- **Unit Testing**: Jest
- **Property-Based Testing**: fast-check
- **E2E Testing**: Playwright or Cypress
- **API Testing**: Supertest
- **Coverage**: Istanbul/nyc

## Implementation Notes

### Phase 1: Core Infrastructure (Week 1)
- Implement State Manager
- Enhance API Client with retry logic
- Setup polling mechanism
- Implement Navigation Manager

### Phase 2: Dashboard & Operations (Week 2)
- Connect Dashboard to database
- Implement new operation modal
- Implement Web Scanner section
- Implement Phishing Campaign section

### Phase 3: Additional Sections (Week 3)
- Implement Network Analyzer section
- Implement Permission System section
- Implement Reports section
- Implement Audit Logs section

### Phase 4: Polish & Testing (Week 4)
- Implement real-time updates
- Add notifications
- Comprehensive testing
- Performance optimization

### Performance Considerations

1. **Polling Optimization**:
   - Use different intervals for different data types
   - Pause polling when user is inactive
   - Batch multiple API calls when possible

2. **Data Caching**:
   - Cache static data (operation types, scan types)
   - Cache user permissions
   - Invalidate cache on updates

3. **Lazy Loading**:
   - Load section content only when navigated to
   - Paginate large lists
   - Load details on demand

4. **Bundle Optimization**:
   - Code splitting by section
   - Lazy load heavy components
   - Minimize JavaScript bundle size

### Security Considerations

1. **Authentication**:
   - Store tokens securely (httpOnly cookies preferred)
   - Implement token refresh mechanism
   - Clear tokens on logout

2. **Authorization**:
   - Validate permissions on every operation
   - Check permission expiry before operations
   - Log all authorization failures

3. **Input Validation**:
   - Validate all inputs on frontend
   - Re-validate all inputs on backend
   - Sanitize inputs to prevent XSS

4. **API Security**:
   - Use HTTPS only
   - Implement rate limiting
   - Add CSRF protection

### Accessibility Considerations

1. **Keyboard Navigation**:
   - All interactive elements accessible via keyboard
   - Logical tab order
   - Visible focus indicators

2. **Screen Readers**:
   - Proper ARIA labels
   - Semantic HTML
   - Alt text for images

3. **RTL Support**:
   - Full RTL layout support for Arabic
   - Proper text direction
   - Mirrored UI elements where appropriate

4. **Color Contrast**:
   - WCAG AA compliance
   - High contrast mode support
   - Color-blind friendly palette
