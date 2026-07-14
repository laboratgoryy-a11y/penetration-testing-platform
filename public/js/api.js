// API Client - عميل API موحد للتواصل مع الخادم
if (typeof window !== 'undefined' && !window.appLogger) {
  window.appLogger = {
    debug: (...args) => {
      const debugEnabled =
        window.__APP_DEBUG__ === true ||
        window.localStorage?.getItem('app_debug') === 'true';
      if (debugEnabled && typeof console !== 'undefined' && typeof console.debug === 'function') {
        console.debug(...args);
      }
    }
  };
}

class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL || '/api/v1';
    this.token = localStorage.getItem('auth_token');
  }

  normalizeStatus(status) {
    return typeof status === 'string' ? status.toUpperCase() : status;
  }

  normalizeSeverity(severity) {
    return typeof severity === 'string' ? severity.toUpperCase() : severity;
  }

  withData(response, data, extra = {}) {
    return {
      ...response,
      data,
      ...extra
    };
  }

  normalizeAuthUser(user) {
    if (!user) {
      return user;
    }

    return {
      ...user,
      permissions: user.permissions || []
    };
  }

  normalizeWebScan(scan) {
    if (!scan) {
      return scan;
    }

    const findings = Array.isArray(scan.resultSummary?.findings)
      ? scan.resultSummary.findings.map((finding) => ({
          ...finding,
          severity: this.normalizeSeverity(finding?.severity)
        }))
      : [];

    return {
      ...scan,
      status: this.normalizeStatus(scan.status),
      targetUrl: scan.targetUrl || scan.target_value || scan.targetValue,
      target_url: scan.target_url || scan.target_value || scan.targetValue,
      created_at: scan.created_at || scan.createdAt,
      started_at: scan.started_at || scan.startedAt || scan.created_at || scan.createdAt,
      completed_at: scan.completed_at || scan.completedAt || null,
      urls_scanned:
        scan.urls_scanned ||
        scan.resultSummary?.urlsScanned ||
        scan.resultSummary?.totalRequests ||
        0,
      progress:
        typeof scan.progress === 'number'
          ? scan.progress
          : typeof scan.resultSummary?.progress === 'number'
            ? scan.resultSummary.progress
            : null,
      total_vulnerabilities:
        scan.total_vulnerabilities ||
        scan.resultSummary?.totalVulnerabilities ||
        findings.length,
      findings,
      statusMessage: scan.statusMessage || scan.resultSummary?.statusMessage || null,
      pageErrors: scan.resultSummary?.pageErrors || [],
      completedChecks: scan.resultSummary?.completedChecks || [],
      limitations: scan.resultSummary?.limitations || []
    };
  }

  normalizeNetworkTest(test) {
    if (!test) {
      return test;
    }

    const target = test.payload?.target || test.target || {};
    const resultSummary = test.resultSummary || test.results || {};

    return {
      ...test,
      id: test.id,
      sessionId: test.sessionId || test.id,
      status: this.normalizeStatus(test.status),
      ssid: test.ssid || target.ssid || resultSummary.ssid || null,
      bssid: test.bssid || target.bssid || resultSummary.bssid || null,
      target,
      createdAt: test.createdAt || test.created_at || null,
      updatedAt: test.updatedAt || test.updated_at || null,
      startedAt: test.startedAt || test.started_at || test.createdAt || test.created_at || null,
      completedAt: test.completedAt || test.completed_at || null,
      requestedTestTypes:
        resultSummary.requestedTestTypes ||
        target.requestedTestTypes ||
        test.payload?.config?.testTypes ||
        [],
      results: resultSummary
    };
  }

  normalizeIpScan(scan) {
    if (!scan) {
      return scan;
    }

    return {
      ...scan,
      status: this.normalizeStatus(scan.status),
      scan_type:
        scan.scan_type ||
        scan.payload?.config?.scanType ||
        scan.payload?.config?.scan_type ||
        'IP_SCAN',
      target_value: scan.target_value || scan.targetValue || scan.payload?.target?.value,
      created_at: scan.created_at || scan.createdAt,
      started_at: scan.started_at || scan.startedAt || scan.created_at || scan.createdAt,
      completed_at: scan.completed_at || scan.completedAt || null,
      progress:
        typeof scan.progress === 'number'
          ? scan.progress
          : typeof scan.resultSummary?.progress === 'number'
            ? scan.resultSummary.progress
            : null,
      total_hosts:
        scan.totalHosts ||
        scan.resultSummary?.totalHosts ||
        (Array.isArray(scan.resultSummary?.hosts) ? scan.resultSummary.hosts.length : 0),
      total_ports:
        scan.totalPorts ||
        scan.resultSummary?.totalPorts ||
        (Array.isArray(scan.resultSummary?.ports) ? scan.resultSummary.ports.length : 0),
      total_vulnerabilities:
        scan.totalVulnerabilities ||
        scan.resultSummary?.totalVulnerabilities ||
        (Array.isArray(scan.resultSummary?.vulnerabilities)
          ? scan.resultSummary.vulnerabilities.length
          : 0),
      statusMessage: scan.statusMessage || scan.resultSummary?.statusMessage || null
    };
  }

  normalizeReport(report) {
    if (!report) {
      return report;
    }

    return {
      ...report,
      type: report.type || report.report_type,
      created_at: report.created_at || report.generated_at,
      createdAt: report.createdAt || report.generated_at
    };
  }

  // إعداد التوكن
  setToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  // حذف التوكن
  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // طلب عام مع retry logic
  async request(method, endpoint, data = null, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    const skipRetry = options.skipRetry || false;
    const isConnectivityEndpoint = endpoint.startsWith('/system/connectivity');

    if (!isConnectivityEndpoint && window.connectivityGuard?.ensureOnline) {
      await window.connectivityGuard.ensureOnline();
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const headers = {
          'Content-Type': 'application/json',
          ...options.headers
        };

        if (this.token) {
          headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
          method,
          headers,
          ...options
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          config.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, config);
        
        // معالجة أخطاء المصادقة
        if (response.status === 401) {
          this.clearToken();
          window.location.href = '/login.html';
          throw new Error('انتهت صلاحية الجلسة');
        }

        // معالجة أخطاء التفويض
        if (response.status === 403) {
          throw new Error('غير مصرح لك بهذه العملية');
        }

        const result = await response.json();

        if (!response.ok) {
          if (response.status === 503 && result.error?.code === 'INTERNET_CONNECTION_REQUIRED') {
            window.connectivityGuard?.handleApiConnectivityError(result.error.details || result.data || {});
            const error = new Error(result.error?.message || 'يلزم الاتصال بالإنترنت لاستخدام النظام.');
            error.status = response.status;
            error.response = result;
            throw error;
          }

          // إذا كان خطأ من الخادم (5xx) وليس آخر محاولة، أعد المحاولة
          if (response.status >= 500 && attempt < maxRetries - 1 && !skipRetry) {
            console.warn(`Server error (${response.status}), retrying... (${attempt + 1}/${maxRetries})`);
            await this.sleep(retryDelay * Math.pow(2, attempt)); // exponential backoff
            continue;
          }
          
          const error = new Error(result.error?.message || result.error || 'حدث خطأ في الطلب');
          error.status = response.status;
          error.response = result;
          
          // استخدام error handler لمعالجة الخطأ
          if (window.errorHandler) {
            window.errorHandler.handleAPIError(error, { endpoint, method });
          }
          
          throw error;
        }

        return result;
      } catch (error) {
        // إذا كان خطأ شبكة وليس آخر محاولة، أعد المحاولة
        if (error.name === 'TypeError' && attempt < maxRetries - 1 && !skipRetry) {
          if (navigator.onLine === false) {
            window.connectivityGuard?.handleApiConnectivityError({
              message: 'لا يوجد اتصال بالإنترنت. يرجى الاتصال بالإنترنت ثم إعادة المحاولة.'
            });
            throw error;
          }

          console.warn(`Network error, retrying... (${attempt + 1}/${maxRetries})`);
          await this.sleep(retryDelay * Math.pow(2, attempt)); // exponential backoff
          continue;
        }
        
        // استخدام error handler لمعالجة الخطأ
        if (window.errorHandler && !error.status) {
          window.errorHandler.handleAPIError(error, { endpoint, method });
        }
        
        console.error('API Error:', error);
        throw error;
      }
    }
  }

  // دالة مساعدة للانتظار
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // طلبات GET
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request('GET', url);
  }

  // طلبات POST
  async post(endpoint, data) {
    return this.request('POST', endpoint, data);
  }

  // طلبات PUT
  async put(endpoint, data) {
    return this.request('PUT', endpoint, data);
  }

  // طلبات DELETE
  async delete(endpoint) {
    return this.request('DELETE', endpoint);
  }

  // تحميل ملف
  async downloadFile(endpoint, filename) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error('فشل تحميل الملف');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // API Methods - Dashboard
  async getDashboardStats() {
    return this.get('/dashboard/stats');
  }

  async getVulnerabilityDistribution() {
    return this.get('/dashboard/vulnerability-distribution');
  }

  async getRecentActivity() {
    const response = await this.get('/dashboard/recent-activity');
    return this.withData(response, response.data?.activity || [], {
      logs: response.data?.activity || []
    });
  }

  // API Methods - Web Scans
  async getScans() {
    const response = await this.get('/scans/web');
    const scans = (response.data?.scans || []).map((scan) => this.normalizeWebScan(scan));
    return this.withData(response, { scans });
  }

  async getScan(id) {
    const response = await this.get(`/scans/web/${id}`);
    return this.withData(response, this.normalizeWebScan(response.data));
  }

  async getScanStatus(id) {
    const response = await this.get(`/scans/web/${id}/status`);
    return this.withData(response, {
      ...response.data,
      status: this.normalizeStatus(response.data?.status),
      progress:
        typeof response.data?.progress === 'number' ? response.data.progress : null,
      total_requests: response.data?.total_requests || 0,
      total_vulnerabilities: response.data?.total_vulnerabilities || 0,
      page_errors: response.data?.page_errors || 0,
      resultSummary: this.normalizeWebScan({
        status: response.data?.status,
        resultSummary: response.data?.resultSummary || {}
      })?.resultSummary || response.data?.resultSummary || {}
    });
  }

  async getScanVulnerabilities(id) {
    const response = await this.get(`/scans/web/${id}/vulnerabilities`);
    return this.withData(
      response,
      Array.isArray(response.data)
        ? response.data.map((finding) => ({
            ...finding,
            severity: this.normalizeSeverity(finding?.severity)
          }))
        : []
    );
  }

  async createScan(data) {
    // Convert frontend format to backend format
    // Backend expects: { target: { url, authorizationId }, config: { maxDepth, maxRequests, vulnerabilityTypes, respectRobotsTxt, customHeaders } }
    const backendData = {
      target: {
        url: data.target?.url || data.targetUrl,
        authorizationId: data.target?.authorizationId || data.authorizationId
      },
      config: {
        maxDepth: data.config?.maxDepth || 3,
        maxRequests: data.config?.maxRequests || 100,
        requestTimeoutMs: data.config?.requestTimeoutMs || 10000,
        vulnerabilityTypes: data.config?.vulnerabilityTypes || ['SQL_INJECTION', 'XSS', 'CSRF'],
        respectRobotsTxt: data.config?.respectRobotsTxt !== false,
        customHeaders: data.config?.customHeaders || {}
      }
    };
    const response = await this.post('/scans/web', backendData);
    return this.withData(response, {
      ...response.data,
      id: response.data?.jobId,
      sessionId: response.data?.jobId,
      status: this.normalizeStatus(response.data?.status)
    });
  }

  async getScanResults(id) {
    const response = await this.get(`/scans/web/${id}/results`);
    const results = response.data?.results || {};
    const findings = Array.isArray(results.findings)
      ? results.findings.map((finding) => ({
          ...finding,
          severity: this.normalizeSeverity(finding?.severity)
        }))
      : [];

    return this.withData(response, {
      ...results,
      findings,
      totalVulnerabilities: results.totalVulnerabilities || findings.length,
      totalRequests: results.totalRequests || results.urlsScanned || 0,
      pageErrors: Array.isArray(results.pageErrors) ? results.pageErrors : [],
      completedChecks: Array.isArray(results.completedChecks) ? results.completedChecks : [],
      limitations: Array.isArray(results.limitations) ? results.limitations : []
    });
  }

  async getScanLogs(id) {
    const response = await this.get(`/scans/web/${id}/logs`);
    return this.withData(response, {
      logs: response.data?.logs || []
    });
  }

  async getScanArtifacts(id) {
    const response = await this.get(`/scans/web/${id}/artifacts`);
    return this.withData(response, {
      artifacts: response.data?.artifacts || []
    });
  }

  async stopScan(id) {
    return this.post(`/scans/web/${id}/stop`);
  }

  async getScanReport(id, format = 'pdf') {
    return this.downloadFile(`/scans/web/${id}/report?format=${format}`, `scan-report-${id}.${format}`);
  }

  async createIpScan(data) {
    const response = await this.post('/ip-scans', data);
    return this.withData(response, {
      ...response.data,
      id: response.data?.jobId || response.data?.id,
      status: this.normalizeStatus(response.data?.status)
    });
  }

  async getIpScans() {
    const response = await this.get('/ip-scans');
    const scans = (response.data?.scans || []).map((scan) => this.normalizeIpScan(scan));
    return this.withData(response, { scans });
  }

  async getIpScan(id) {
    const response = await this.get(`/ip-scans/${id}`);
    return this.withData(response, this.normalizeIpScan(response.data));
  }

  async getIpScanStatus(id) {
    const response = await this.get(`/ip-scans/${id}/status`);
    return this.withData(response, {
      ...response.data,
      status: this.normalizeStatus(response.data?.status)
    });
  }

  async getIpScanResults(id) {
    const response = await this.get(`/ip-scans/${id}/results`);
    return this.withData(response, response.data?.results || {});
  }

  async getIpScanLogs(id) {
    const response = await this.get(`/ip-scans/${id}/logs`);
    return this.withData(response, {
      logs: response.data?.logs || []
    });
  }

  async getIpScanArtifacts(id) {
    const response = await this.get(`/ip-scans/${id}/artifacts`);
    return this.withData(response, {
      artifacts: response.data?.artifacts || []
    });
  }

  async stopIpScan(id) {
    return this.post(`/ip-scans/${id}/stop`);
  }

  async downloadIpScanReport(id, format = 'pdf') {
    return this.downloadFile(`/ip-scans/${id}/report?format=${format}`, `ip-scan-report-${id}.${format}`);
  }

  // API Methods - Phishing Campaigns
  async getCampaigns() {
    const response = await this.get('/phishing/campaigns');
    const campaigns = (response.data?.campaigns || []).map((campaign) => ({
      ...campaign,
      status: this.normalizeStatus(campaign.status),
      created_at: campaign.created_at || campaign.createdAt,
      updated_at: campaign.updated_at || campaign.updatedAt
    }));
    return this.withData(response, { campaigns });
  }

  async getCampaign(id) {
    const response = await this.get(`/phishing/campaigns/${id}`);
    return this.withData(response, {
      ...(response.data?.campaign || response.data),
      status: this.normalizeStatus(response.data?.campaign?.status || response.data?.status)
    });
  }

  async getCampaignResults(id) {
    const response = await this.get(`/phishing/campaigns/${id}/results`);
    return this.withData(response, response.data?.results || {});
  }

  async getCampaignInteractions(id) {
    const response = await this.get(`/phishing/campaigns/${id}/interactions`);
    return this.withData(response, response.data?.interactions || []);
  }

  async getCampaignTargets(id) {
    const response = await this.get(`/phishing/campaigns/${id}/targets`);
    return this.withData(response, response.data?.targets || []);
  }

  async stopCampaign(id) {
    return this.post(`/phishing/campaigns/${id}/stop`);
  }

  async downloadCampaignReport(id, format = 'pdf') {
    return this.downloadFile(`/phishing/campaigns/${id}/report?format=${format}`, `campaign-report-${id}.${format}`);
  }

  async createCampaign(data) {
    // Convert frontend format to backend format
    const backendData = {
      name: data.name,
      authorizationId: data.authorizationId,
      emailTemplate: data.emailTemplate,
      landingPage: data.landingPage,
      targets: data.targets
    };
    const response = await this.post('/phishing/campaigns', backendData);
    return this.withData(response, {
      ...response.data,
      id: response.data?.campaignId
    });
  }

  async getCampaignStats(id) {
    const response = await this.getCampaignResults(id);
    const results = response.data || {};
    const summary = results.result_summary || results.resultSummary || {};
    const interactions = Array.isArray(summary.interactions) ? summary.interactions : [];

    return this.withData(response, {
      total_sent: Array.isArray(results.targets) ? results.targets.length : 0,
      total_opened: interactions.filter((item) => item.type === 'open').length,
      total_clicked: interactions.filter((item) => item.type === 'click').length,
      total_submitted: interactions.filter((item) => item.type === 'submit').length
    });
  }

  async launchCampaign(id) {
    return this.post(`/phishing/campaigns/${id}/launch`);
  }

  async completeCampaign(id) {
    return this.post(`/phishing/campaigns/${id}/complete`);
  }

  async getCampaignReport(id, format = 'pdf') {
    return this.downloadFile(`/phishing/campaigns/${id}/report?format=${format}`, `campaign-report-${id}.${format}`);
  }

  // API Methods - Network Tests
  async discoverAccessPoints(authorizationId) {
    return this.post('/network/discover', { authorizationId });
  }

  async getNetworkRuntimeReadiness() {
    const response = await this.get('/network/runtime-readiness');
    return this.withData(response, response.data || {});
  }

  async getDiscoveryJob(id) {
    const response = await this.get(`/network/discover/${id}`);
    return this.withData(response, response.data?.discovery || response.data);
  }

  async getDiscoveryJobStatus(id) {
    const response = await this.get(`/network/discover/${id}/status`);
    return this.withData(response, {
      ...response.data,
      status: this.normalizeStatus(response.data?.status)
    });
  }

  async getDiscoveryResults(id) {
    const response = await this.get(`/network/discover/${id}/results`);
    return this.withData(response, response.data?.results || {});
  }

  async getNetworkTests() {
    const response = await this.get('/network/tests');
    const tests = (response.data?.tests || []).map((test) => this.normalizeNetworkTest(test));
    return this.withData(response, { tests });
  }

  async getNetworkTest(id) {
    const response = await this.get(`/network/tests/${id}`);
    return this.withData(response, {
      test: this.normalizeNetworkTest(response.data?.test || response.data)
    });
  }

  async getNetworkTestStatus(id) {
    const response = await this.get(`/network/tests/${id}/status`);
    return this.withData(response, {
      ...response.data,
      status: this.normalizeStatus(response.data?.status)
    });
  }

  async createNetworkTest(data) {
    // Convert frontend format to backend format
    // data should contain: { target: { ssid, bssid, authorizationId }, config: { testTypes, maxAttempts, passwordDictionary } }
    
    // التحقق من البيانات المطلوبة
    if (!data.target?.ssid || !data.target?.ssid.trim()) {
      throw new Error('يرجى إدخال اسم الشبكة (SSID)');
    }
    
    if (!data.target?.bssid || !data.target?.bssid.trim()) {
      throw new Error('يرجى إدخال عنوان MAC (BSSID)');
    }
    
    if (!data.target?.authorizationId) {
      throw new Error('يرجى اختيار تصريح نشط');
    }
    
    const backendData = {
      target: {
        ssid: data.target.ssid.trim(),
        bssid: data.target.bssid.trim(),
        authorizationId: data.target.authorizationId
      },
      config: {
        testTypes: data.config?.testTypes || ['TRAFFIC_ANALYSIS'],
        maxAttempts: data.config?.maxAttempts || 100,
        passwordDictionary: data.config?.passwordDictionary
      }
    };
    const response = await this.post('/network/tests', backendData);
    return this.withData(response, {
      ...response.data,
      id: response.data?.jobId,
      sessionId: response.data?.jobId,
      status: this.normalizeStatus(response.data?.status)
    });
  }

  async getNetworkResults(id) {
    const response = await this.get(`/network/tests/${id}/results`);
    return this.withData(response, {
      results: response.data?.results || {}
    });
  }

  async getNetworkTestLogs(id) {
    const response = await this.get(`/network/tests/${id}/logs`);
    return this.withData(response, {
      logs: response.data?.logs || []
    });
  }

  async getNetworkTestArtifacts(id) {
    const response = await this.get(`/network/tests/${id}/artifacts`);
    return this.withData(response, {
      artifacts: response.data?.artifacts || []
    });
  }

  async getNetworkStatus(id) {
    return this.getNetworkTestStatus(id);
  }

  async stopNetworkTest(id) {
    return this.post(`/network/tests/${id}/stop`);
  }

  async deleteNetworkTest(id) {
    return this.delete(`/network/tests/${id}`);
  }

  async cleanupNetworkTests(statuses = ['completed', 'failed', 'cancelled', 'unsupported']) {
    return this.post('/network/tests/cleanup', { statuses });
  }

  async downloadNetworkReport(id, format = 'PDF') {
    return this.downloadFile(`/network/tests/${id}/report?format=${format}`, `network-report-${id}.${format.toLowerCase()}`);
  }

  // API Methods - Authorizations
  async getAuthorizations() {
    return this.get('/authorizations');
  }

  async getAuthorization(id) {
    return this.get(`/authorizations/${id}`);
  }

  async createAuthorization(data) {
    return this.post('/authorizations', data);
  }

  async validateAuthorization(id, target, operationType) {
    return this.post(`/authorizations/${id}/validate`, { target, operationType });
  }

  async revokeAuthorization(id, reason) {
    return this.post(`/authorizations/${id}/revoke`, { reason });
  }

  // API Methods - Reports
  async getReports() {
    const response = await this.get('/reports');
    const reports = (response.data?.reports || []).map((report) => this.normalizeReport(report));
    return this.withData(response, { reports });
  }

  async getReport(id) {
    const response = await this.get(`/reports/${id}`);
    return this.withData(response, this.normalizeReport(response.data?.report || response.data));
  }

  async createComplianceReport(data) {
    return this.post('/reports/compliance', data);
  }

  async createReport(data) {
    return this.post('/reports', data);
  }

  async downloadReport(id, format = 'pdf') {
    return this.downloadFile(`/reports/${id}?format=${format}`, `report-${id}.${format}`);
  }

  // API Methods - Audit Logs
  async getAuditLogs(params = {}) {
    const response = await this.get('/audit/logs', params);
    return this.withData(response, {
      logs: response.data?.logs || [],
      total: response.data?.total || 0,
      limit: response.data?.limit || 0,
      offset: response.data?.offset || 0
    });
  }

  async exportAuditLogs(format = 'csv') {
    return this.downloadFile(`/audit/logs/export?format=${format}`, `audit-logs.${format}`);
  }

  // API Methods - Authentication
  async login(username, password, mfaToken = null) {
    const data = { username, password };
    if (mfaToken) {
      data.mfaToken = mfaToken;
    }
    return this.post('/auth/login', data);
  }

  async logout() {
    return this.post('/auth/logout');
  }

  async getCurrentUser() {
    const response = await this.get('/auth/me');
    const user = this.normalizeAuthUser(response.data?.user || response.user || response.data);
    return this.withData(response, user, { user });
  }

  async enableMFA() {
    return this.post('/auth/mfa/setup');
  }

  async verifyMFA(token) {
    return this.post('/auth/mfa/verify', { token });
  }
}

// إنشاء نسخة عامة
const api = new APIClient();

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
  window.api = api;
}



