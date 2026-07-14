# وثيقة التصميم - تحسين واجهة الويب لمنصة اختبار الاختراق

## نظرة عامة

واجهة ويب تفاعلية متكاملة تمثل طبقة التشغيل المرئي لمنصة اختبار الاختراق والأمن الهجومي. **الواجهة ليست Demo أو Presentation، بل واجهة تشغيل فعلية مرتبطة بجميع مكونات المنصة الأمنية.**

### الأهداف الرئيسية

1. توفير واجهة تشغيل فعلية لجميع قدرات المنصة
2. ربط كامل مع API الخلفي دون بيانات تجريبية
3. عرض حالة العمليات الأمنية بشكل فوري
4. تجربة مستخدم عملية وواضحة بالعربية (RTL)
5. التحقق الإلزامي من التصاريح والصلاحيات

### المبادئ التصميمية

- **وظيفية بالكامل**: كل عنصر مرتبط بوظيفة حقيقية في النظام الخلفي
- **بيانات حقيقية**: لا توجد بيانات تجريبية، كل شيء من قاعدة البيانات
- **أمان أولاً**: التحقق من التصريح والصلاحيات قبل كل عملية
- **شفافية كاملة**: عرض حالات التنفيذ الحقيقية
- **تجربة عملية**: موجهة للاستخدام الفعلي وليس العرض

## البنية المعمارية

### نظرة عامة على البنية

```
┌─────────────────────────────────────────────────────────────┐
│                    طبقة العرض (Presentation)                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  HTML5 + CSS3 + Vanilla JavaScript (SPA)            │   │
│  │  - لوحة التحكم                                       │   │
│  │  - فحص الويب                                         │   │
│  │  - حملات التصيد                                      │   │
│  │  - تحليل الشبكات                                     │   │
│  │  - إدارة التصاريح                                    │   │
│  │  - التقارير                                          │   │
│  │  - سجلات التدقيق                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                    Fetch API / AJAX
                            │
┌─────────────────────────────────────────────────────────────┐
│                  طبقة API (Backend Integration)             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  REST API (Express.js)                               │   │
│  │  - /api/v1/auth/*                                    │   │
│  │  - /api/v1/scans/web/*                               │   │
│  │  - /api/v1/phishing/campaigns/*                      │   │
│  │  - /api/v1/network/*                                 │   │
│  │  - /api/v1/authorizations/*                          │   │
│  │  - /api/v1/reports/*                                 │   │
│  │  - /api/v1/audit/logs/*                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### نمط المعمارية

- **Single Page Application (SPA)**: تطبيق صفحة واحدة مع تنقل ديناميكي
- **Client-Side Rendering**: عرض المحتوى في المتصفح
- **RESTful API Integration**: ربط كامل مع API الخلفي
- **Polling for Updates**: تحديث دوري للبيانات (قابل للترقية إلى WebSocket)


## تصميم المكونات والواجهات

### 1. عميل API (API Client)

المكون المركزي المسؤول عن جميع الاتصالات مع API الخلفي.

#### الواجهة الرئيسية

```javascript
class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL || '/api/v1';
    this.token = localStorage.getItem('auth_token');
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

  // طلب عام
  async request(method, endpoint, data = null, options = {}) {
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

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      // معالجة أخطاء المصادقة
      if (response.status === 401) {
        this.clearToken();
        window.location.href = '/login';
        throw new Error('انتهت صلاحية الجلسة');
      }

      // معالجة أخطاء التفويض
      if (response.status === 403) {
        throw new Error('غير مصرح لك بهذه العملية');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'حدث خطأ في الطلب');
      }

      return result;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
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
}

// إنشاء نسخة عامة
const api = new APIClient();
```

#### المسؤوليات

1. إدارة التوكن (تخزين، استرجاع، حذف)
2. إرسال جميع طلبات HTTP إلى API
3. معالجة الأخطاء المركزية (401، 403، 500)
4. إضافة التوكن تلقائياً لكل طلب
5. تحويل الاستجابات إلى JSON
6. تحميل الملفات من API


### 2. مدير المصادقة (Authentication Manager)

مكون مسؤول عن إدارة المصادقة والجلسات.

#### الواجهة الرئيسية

```javascript
class AuthManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.currentUser = null;
  }

  // تسجيل الدخول
  async login(username, password, mfaToken = null) {
    try {
      const data = { username, password };
      if (mfaToken) {
        data.mfaToken = mfaToken;
      }

      const response = await this.api.post('/auth/login', data);
      
      this.api.setToken(response.accessToken);
      this.currentUser = response.user;
      
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // تسجيل الخروج
  async logout() {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.api.clearToken();
      this.currentUser = null;
      window.location.href = '/login';
    }
  }

  // التحقق من الجلسة
  async checkSession() {
    try {
      const response = await this.api.get('/auth/me');
      this.currentUser = response.user;
      return true;
    } catch (error) {
      this.api.clearToken();
      return false;
    }
  }

  // الحصول على المستخدم الحالي
  getCurrentUser() {
    return this.currentUser;
  }

  // التحقق من تسجيل الدخول
  isAuthenticated() {
    return !!this.api.token;
  }

  // التحقق من الصلاحية
  hasPermission(permission) {
    if (!this.currentUser || !this.currentUser.permissions) {
      return false;
    }
    return this.currentUser.permissions.includes(permission);
  }
}

// إنشاء نسخة عامة
const auth = new AuthManager(api);
```

#### المسؤوليات

1. تسجيل الدخول والخروج
2. التحقق من صلاحية الجلسة
3. إدارة معلومات المستخدم الحالي
4. التحقق من الصلاحيات
5. دعم MFA


### 3. مدير الإشعارات (Notification Manager)

مكون مسؤول عن عرض إشعارات Toast للمستخدم.

#### الواجهة الرئيسية

```javascript
class NotificationManager {
  constructor() {
    this.container = null;
    this.init();
  }

  // تهيئة الحاوية
  init() {
    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);
  }

  // عرض إشعار
  show(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = this.getIcon(type);
    notification.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${message}</span>
      <button class="notification-close" onclick="this.parentElement.remove()">
        <i class="fas fa-times"></i>
      </button>
    `;

    this.container.appendChild(notification);

    // إخفاء تلقائي
    if (duration > 0) {
      setTimeout(() => {
        notification.classList.add('notification-fade-out');
        setTimeout(() => notification.remove(), 300);
      }, duration);
    }

    return notification;
  }

  // الحصول على الأيقونة حسب النوع
  getIcon(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  // إشعار نجاح
  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  // إشعار خطأ
  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  // إشعار تحذير
  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  // إشعار معلومات
  info(message, duration) {
    return this.show(message, 'info', duration);
  }

  // مسح جميع الإشعارات
  clearAll() {
    this.container.innerHTML = '';
  }
}

// إنشاء نسخة عامة
const notifications = new NotificationManager();
```

#### المسؤوليات

1. عرض إشعارات Toast
2. دعم أربعة أنواع (نجاح، خطأ، تحذير، معلومات)
3. إخفاء تلقائي بعد مدة محددة
4. إغلاق يدوي
5. أيقونات مميزة لكل نوع


### 4. مدير التحميل (Loading Manager)

مكون مسؤول عن عرض شاشات التحميل.

#### الواجهة الرئيسية

```javascript
class LoadingManager {
  // عرض شاشة تحميل
  show(container, message = 'جاري التحميل...') {
    const loader = document.createElement('div');
    loader.className = 'loading-overlay';
    loader.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>${message}</p>
      </div>
    `;

    if (typeof container === 'string') {
      container = document.querySelector(container);
    }

    container.style.position = 'relative';
    container.appendChild(loader);

    return loader;
  }

  // إخفاء شاشة تحميل
  hide(loader) {
    if (loader && loader.parentElement) {
      loader.remove();
    }
  }

  // تنفيذ عملية مع تحميل
  async withLoading(container, asyncFunction, message) {
    const loader = this.show(container, message);
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      this.hide(loader);
    }
  }
}

// إنشاء نسخة عامة
const loading = new LoadingManager();
```

#### المسؤوليات

1. عرض شاشة تحميل مع spinner
2. إخفاء شاشة التحميل
3. تنفيذ عمليات async مع تحميل تلقائي
4. دعم رسائل تحميل مخصصة


### 5. مدير التطبيق (Application Manager)

المكون الرئيسي المسؤول عن إدارة التطبيق والتنقل.

#### الواجهة الرئيسية

```javascript
class App {
  constructor() {
    this.currentPage = null;
    this.updateIntervals = {};
    this.init();
  }

  // تهيئة التطبيق
  async init() {
    // التحقق من المصادقة
    if (!auth.isAuthenticated()) {
      window.location.href = '/login.html';
      return;
    }

    // التحقق من الجلسة
    const isValid = await auth.checkSession();
    if (!isValid) {
      window.location.href = '/login.html';
      return;
    }

    // تهيئة التنقل
    this.initNavigation();

    // تحميل الصفحة الأولية
    const initialPage = this.getPageFromURL() || 'dashboard';
    this.navigateTo(initialPage);

    // الاستماع لأحداث المتصفح
    window.addEventListener('popstate', (e) => {
      const page = e.state?.page || 'dashboard';
      this.navigateTo(page, false);
    });
  }

  // تهيئة التنقل
  initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        this.navigateTo(page);
      });
    });

    // زر تسجيل الخروج
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => auth.logout());
    }
  }

  // التنقل إلى صفحة
  navigateTo(page, pushState = true) {
    // إيقاف التحديثات التلقائية للصفحة السابقة
    this.stopAutoUpdates();

    // تحديث القائمة الجانبية
    this.updateActiveNav(page);

    // تحديث المحتوى
    this.loadPage(page);

    // تحديث URL
    if (pushState) {
      history.pushState({ page }, '', `#${page}`);
    }

    // حفظ الصفحة الحالية
    this.currentPage = page;
    localStorage.setItem('last_page', page);
  }

  // تحديث القائمة النشطة
  updateActiveNav(page) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.dataset.page === page) {
        link.classList.add('active');
      }
    });
  }

  // تحميل صفحة
  async loadPage(page) {
    const content = document.getElementById('main-content');
    
    try {
      switch (page) {
        case 'dashboard':
          await this.loadDashboard(content);
          break;
        case 'web-scan':
          await this.loadWebScan(content);
          break;
        case 'phishing':
          await this.loadPhishing(content);
          break;
        case 'network':
          await this.loadNetwork(content);
          break;
        case 'authorizations':
          await this.loadAuthorizations(content);
          break;
        case 'reports':
          await this.loadReports(content);
          break;
        case 'audit':
          await this.loadAudit(content);
          break;
        default:
          content.innerHTML = '<h2>الصفحة غير موجودة</h2>';
      }
    } catch (error) {
      console.error('Error loading page:', error);
      notifications.error('فشل تحميل الصفحة: ' + error.message);
    }
  }

  // الحصول على الصفحة من URL
  getPageFromURL() {
    const hash = window.location.hash.slice(1);
    return hash || null;
  }

  // إيقاف التحديثات التلقائية
  stopAutoUpdates() {
    Object.values(this.updateIntervals).forEach(interval => {
      clearInterval(interval);
    });
    this.updateIntervals = {};
  }

  // بدء تحديث تلقائي
  startAutoUpdate(key, callback, interval) {
    this.updateIntervals[key] = setInterval(callback, interval);
  }

  // تحميل لوحة التحكم
  async loadDashboard(container) {
    // سيتم تنفيذها في DashboardManager
  }

  // تحميل فحص الويب
  async loadWebScan(container) {
    // سيتم تنفيذها في WebScanManager
  }

  // ... باقي الصفحات
}

// إنشاء نسخة عامة وبدء التطبيق
const app = new App();
```

#### المسؤوليات

1. إدارة التنقل بين الصفحات
2. التحقق من المصادقة عند البدء
3. تحديث URL والتاريخ
4. إدارة التحديثات التلقائية
5. تحميل المحتوى الديناميكي
6. حفظ حالة المستخدم


### 6. مدير لوحة التحكم (Dashboard Manager)

مكون مسؤول عن عرض وإدارة لوحة التحكم.

#### الواجهة الرئيسية

```javascript
class DashboardManager {
  constructor(apiClient, app) {
    this.api = apiClient;
    this.app = app;
  }

  // تحميل لوحة التحكم
  async load(container) {
    container.innerHTML = this.getTemplate();

    // تحميل البيانات
    await this.loadStats();
    await this.loadRecentActivity();
    await this.loadVulnerabilityChart();

    // بدء التحديث التلقائي
    this.app.startAutoUpdate('dashboard', () => {
      this.loadStats();
      this.loadRecentActivity();
    }, 30000); // كل 30 ثانية

    // ربط الأحداث
    this.bindEvents();
  }

  // قالب HTML
  getTemplate() {
    return `
      <div class="dashboard">
        <h1>لوحة التحكم</h1>
        
        <!-- الإحصائيات -->
        <div class="stats-grid">
          <div class="stat-card">
            <i class="fas fa-search"></i>
            <h3 id="total-scans">-</h3>
            <p>عمليات الفحص</p>
          </div>
          <div class="stat-card">
            <i class="fas fa-bug"></i>
            <h3 id="total-vulnerabilities">-</h3>
            <p>الثغرات المكتشفة</p>
          </div>
          <div class="stat-card">
            <i class="fas fa-envelope"></i>
            <h3 id="total-campaigns">-</h3>
            <p>حملات التصيد</p>
          </div>
          <div class="stat-card">
            <i class="fas fa-wifi"></i>
            <h3 id="total-network-tests">-</h3>
            <p>اختبارات الشبكات</p>
          </div>
        </div>

        <!-- الرسم البياني -->
        <div class="chart-container">
          <h2>توزيع الثغرات حسب الخطورة</h2>
          <canvas id="vulnerability-chart"></canvas>
        </div>

        <!-- النشاط الأخير -->
        <div class="recent-activity">
          <h2>النشاط الأخير</h2>
          <div id="activity-list"></div>
        </div>

        <!-- إجراءات سريعة -->
        <div class="quick-actions">
          <h2>إجراءات سريعة</h2>
          <button class="btn btn-primary" data-action="new-scan">
            <i class="fas fa-plus"></i> فحص جديد
          </button>
          <button class="btn btn-primary" data-action="new-campaign">
            <i class="fas fa-plus"></i> حملة جديدة
          </button>
          <button class="btn btn-primary" data-action="new-test">
            <i class="fas fa-plus"></i> اختبار جديد
          </button>
        </div>
      </div>
    `;
  }

  // تحميل الإحصائيات
  async loadStats() {
    try {
      const [scans, campaigns, tests, vulnerabilities] = await Promise.all([
        this.api.get('/scans/web'),
        this.api.get('/phishing/campaigns'),
        this.api.get('/network/tests'),
        this.api.get('/scans/web/vulnerabilities')
      ]);

      document.getElementById('total-scans').textContent = scans.length;
      document.getElementById('total-campaigns').textContent = campaigns.length;
      document.getElementById('total-network-tests').textContent = tests.length;
      document.getElementById('total-vulnerabilities').textContent = vulnerabilities.length;
    } catch (error) {
      console.error('Error loading stats:', error);
      notifications.error('فشل تحميل الإحصائيات');
    }
  }

  // تحميل النشاط الأخير
  async loadRecentActivity() {
    try {
      const logs = await this.api.get('/audit/logs', { limit: 10 });
      const activityList = document.getElementById('activity-list');

      if (logs.length === 0) {
        activityList.innerHTML = '<p class="no-data">لا توجد أنشطة حديثة</p>';
        return;
      }

      activityList.innerHTML = logs.map(log => `
        <div class="activity-item">
          <i class="fas ${this.getActivityIcon(log.eventType)}"></i>
          <div class="activity-details">
            <p class="activity-title">${this.getActivityTitle(log)}</p>
            <p class="activity-time">${this.formatTime(log.timestamp)}</p>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Error loading activity:', error);
    }
  }

  // تحميل رسم الثغرات
  async loadVulnerabilityChart() {
    try {
      const vulnerabilities = await this.api.get('/scans/web/vulnerabilities');
      
      const severityCounts = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0
      };

      vulnerabilities.forEach(vuln => {
        severityCounts[vuln.severity]++;
      });

      // استخدام Chart.js لرسم البيانات
      const ctx = document.getElementById('vulnerability-chart').getContext('2d');
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['حرج', 'عالي', 'متوسط', 'منخفض'],
          datasets: [{
            data: [
              severityCounts.CRITICAL,
              severityCounts.HIGH,
              severityCounts.MEDIUM,
              severityCounts.LOW
            ],
            backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    } catch (error) {
      console.error('Error loading chart:', error);
    }
  }

  // ربط الأحداث
  bindEvents() {
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleAction(action);
      });
    });
  }

  // معالجة الإجراءات
  handleAction(action) {
    switch (action) {
      case 'new-scan':
        this.app.navigateTo('web-scan');
        break;
      case 'new-campaign':
        this.app.navigateTo('phishing');
        break;
      case 'new-test':
        this.app.navigateTo('network');
        break;
    }
  }

  // الحصول على أيقونة النشاط
  getActivityIcon(eventType) {
    const icons = {
      SCAN_STARTED: 'fa-search',
      SCAN_COMPLETED: 'fa-check',
      CAMPAIGN_LAUNCHED: 'fa-envelope',
      NETWORK_TEST_STARTED: 'fa-wifi',
      AUTHORIZATION_UPLOADED: 'fa-file-upload'
    };
    return icons[eventType] || 'fa-info-circle';
  }

  // الحصول على عنوان النشاط
  getActivityTitle(log) {
    const titles = {
      SCAN_STARTED: 'بدء فحص جديد',
      SCAN_COMPLETED: 'اكتمال فحص',
      CAMPAIGN_LAUNCHED: 'إطلاق حملة تصيد',
      NETWORK_TEST_STARTED: 'بدء اختبار شبكة',
      AUTHORIZATION_UPLOADED: 'رفع تصريح جديد'
    };
    return titles[log.eventType] || log.eventType;
  }

  // تنسيق الوقت
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  }
}
```

#### المسؤوليات

1. عرض الإحصائيات الحقيقية من API
2. عرض النشاط الأخير من سجلات التدقيق
3. رسم توزيع الثغرات بيانياً
4. توفير إجراءات سريعة
5. التحديث التلقائي كل 30 ثانية


### 7. مدير فحص الويب (Web Scan Manager)

```javascript
class WebScanManager {
  constructor(apiClient, app) {
    this.api = apiClient;
    this.app = app;
  }

  async load(container) {
    container.innerHTML = this.getTemplate();
    await this.loadScans();
    await this.loadAuthorizations();
    this.bindEvents();
    
    // تحديث تلقائي للفحوصات الجارية
    this.app.startAutoUpdate('web-scan', () => this.updateRunningScans(), 10000);
  }

  getTemplate() {
    return `
      <div class="web-scan-page">
        <h1>فحص تطبيقات الويب</h1>
        
        <!-- نموذج فحص جديد -->
        <div class="scan-form card">
          <h2>فحص جديد</h2>
          <form id="new-scan-form">
            <div class="form-group">
              <label>URL الهدف</label>
              <input type="url" id="scan-url" required>
            </div>
            <div class="form-group">
              <label>التصريح</label>
              <select id="scan-authorization" required></select>
            </div>
            <div class="form-group">
              <label>أنواع الثغرات</label>
              <div class="checkbox-group">
                <label><input type="checkbox" value="SQL_INJECTION" checked> SQL Injection</label>
                <label><input type="checkbox" value="XSS" checked> XSS</label>
                <label><input type="checkbox" value="CSRF" checked> CSRF</label>
                <label><input type="checkbox" value="DIRECTORY_TRAVERSAL"> Directory Traversal</label>
              </div>
            </div>
            <button type="submit" class="btn btn-primary">بدء الفحص</button>
          </form>
        </div>

        <!-- قائمة الفحوصات -->
        <div class="scans-list card">
          <h2>عمليات الفحص</h2>
          <div id="scans-container"></div>
        </div>
      </div>
    `;
  }

  async loadScans() {
    try {
      const scans = await this.api.get('/scans/web');
      this.renderScans(scans);
    } catch (error) {
      notifications.error('فشل تحميل الفحوصات');
    }
  }

  async loadAuthorizations() {
    try {
      const authorizations = await this.api.get('/authorizations');
      const select = document.getElementById('scan-authorization');
      select.innerHTML = authorizations
        .filter(auth => auth.status === 'ACTIVE')
        .map(auth => `<option value="${auth.id}">${auth.organizationName}</option>`)
        .join('');
    } catch (error) {
      notifications.error('فشل تحميل التصاريح');
    }
  }

  renderScans(scans) {
    const container = document.getElementById('scans-container');
    if (scans.length === 0) {
      container.innerHTML = '<p class="no-data">لا توجد عمليات فحص</p>';
      return;
    }

    container.innerHTML = scans.map(scan => `
      <div class="scan-item" data-scan-id="${scan.id}">
        <div class="scan-header">
          <h3>${scan.targetUrl}</h3>
          <span class="status-badge status-${scan.status.toLowerCase()}">${this.getStatusText(scan.status)}</span>
        </div>
        <div class="scan-details">
          <p>بدأ في: ${new Date(scan.startedAt).toLocaleString('ar')}</p>
          <p>الثغرات: ${scan.totalVulnerabilities || 0}</p>
        </div>
        <div class="scan-actions">
          <button class="btn btn-sm" onclick="webScanManager.viewScan('${scan.id}')">عرض</button>
          ${scan.status === 'RUNNING' ? `<button class="btn btn-sm btn-danger" onclick="webScanManager.stopScan('${scan.id}')">إيقاف</button>` : ''}
          ${scan.status === 'COMPLETED' ? `<button class="btn btn-sm" onclick="webScanManager.downloadReport('${scan.id}')">تحميل التقرير</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  bindEvents() {
    document.getElementById('new-scan-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.startScan();
    });
  }

  async startScan() {
    const url = document.getElementById('scan-url').value;
    const authorizationId = document.getElementById('scan-authorization').value;
    const vulnerabilityTypes = Array.from(document.querySelectorAll('.checkbox-group input:checked'))
      .map(cb => cb.value);

    try {
      // التحقق من التصريح
      const authValid = await this.api.post(`/authorizations/${authorizationId}/validate`, { target: url });
      if (!authValid.authorized) {
        notifications.error('التصريح غير صالح لهذا الهدف');
        return;
      }

      // بدء الفحص
      const scan = await this.api.post('/scans/web', {
        target: { url, authorizationId },
        config: { vulnerabilityTypes }
      });

      notifications.success('تم بدء الفحص بنجاح');
      await this.loadScans();
      document.getElementById('new-scan-form').reset();
    } catch (error) {
      notifications.error('فشل بدء الفحص: ' + error.message);
    }
  }

  async stopScan(scanId) {
    try {
      await this.api.post(`/scans/web/${scanId}/stop`);
      notifications.success('تم إيقاف الفحص');
      await this.loadScans();
    } catch (error) {
      notifications.error('فشل إيقاف الفحص');
    }
  }

  async viewScan(scanId) {
    // عرض تفاصيل الفحص والثغرات
    try {
      const [scan, vulnerabilities] = await Promise.all([
        this.api.get(`/scans/web/${scanId}`),
        this.api.get(`/scans/web/${scanId}/vulnerabilities`)
      ]);

      this.showScanDetails(scan, vulnerabilities);
    } catch (error) {
      notifications.error('فشل تحميل تفاصيل الفحص');
    }
  }

  showScanDetails(scan, vulnerabilities) {
    // عرض modal مع التفاصيل
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <span class="modal-close">&times;</span>
        <h2>تفاصيل الفحص</h2>
        <p><strong>الهدف:</strong> ${scan.targetUrl}</p>
        <p><strong>الحالة:</strong> ${this.getStatusText(scan.status)}</p>
        <p><strong>الثغرات:</strong> ${vulnerabilities.length}</p>
        
        <h3>الثغرات المكتشفة</h3>
        <div class="vulnerabilities-list">
          ${vulnerabilities.map(vuln => `
            <div class="vulnerability-item severity-${vuln.severity.toLowerCase()}">
              <h4>${vuln.type}</h4>
              <p><strong>الخطورة:</strong> ${this.getSeverityText(vuln.severity)}</p>
              <p><strong>الموقع:</strong> ${vuln.location}</p>
              <p>${vuln.description}</p>
              <details>
                <summary>التوصيات</summary>
                <p>${vuln.remediation}</p>
              </details>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  }

  async downloadReport(scanId) {
    try {
      await this.api.downloadFile(`/scans/web/${scanId}/report?format=pdf`, `scan-report-${scanId}.pdf`);
      notifications.success('تم تحميل التقرير');
    } catch (error) {
      notifications.error('فشل تحميل التقرير');
    }
  }

  async updateRunningScans() {
    const runningScans = document.querySelectorAll('.scan-item .status-running');
    for (const element of runningScans) {
      const scanId = element.closest('.scan-item').dataset.scanId;
      try {
        const status = await this.api.get(`/scans/web/${scanId}/status`);
        if (status.status !== 'RUNNING') {
          await this.loadScans();
        }
      } catch (error) {
        console.error('Error updating scan:', error);
      }
    }
  }

  getStatusText(status) {
    const texts = {
      RUNNING: 'قيد التشغيل',
      COMPLETED: 'مكتمل',
      FAILED: 'فاشل',
      STOPPED: 'متوقف'
    };
    return texts[status] || status;
  }

  getSeverityText(severity) {
    const texts = {
      CRITICAL: 'حرج',
      HIGH: 'عالي',
      MEDIUM: 'متوسط',
      LOW: 'منخفض'
    };
    return texts[severity] || severity;
  }
}
```

#### المسؤوليات

1. عرض نموذج إنشاء فحص جديد
2. التحقق من التصريح قبل بدء الفحص
3. عرض قائمة الفحوصات الحقيقية
4. عرض تفاصيل الفحص والثغرات
5. إيقاف الفحص الجاري
6. تحميل التقارير
7. التحديث التلقائي للفحوصات الجارية


### 8-11. باقي المكونات (ملخص)

#### 8. مدير حملات التصيد (Phishing Manager)
- نموذج إنشاء حملة جديدة مع قالب البريد وصفحة الهبوط
- إدارة الأهداف (إضافة، حذف، استيراد CSV)
- التحقق من التصريح للنطاقات
- عرض إحصائيات الحملة الجارية (مرسل، مفتوح، نقر، بيانات)
- رسم بياني للتفاعل
- إنهاء الحملة وتحميل التقرير

#### 9. مدير تحليل الشبكات (Network Manager)
- زر اكتشاف نقاط الوصول
- عرض نقاط الوصول المكتشفة
- نموذج إنشاء اختبار جديد مع أنواع الاختبارات
- التحقق من التصريح للشبكة
- عرض حالة الاختبار مع شريط تقدم
- عرض الأجهزة المكتشفة والثغرات
- إيقاف الاختبار وتحميل التقرير

#### 10. مدير التصاريح (Authorization Manager)
- نموذج رفع تصريح جديد مع ملف رقمي
- عرض قائمة التصاريح مع الحالة
- عرض تفاصيل التصريح
- التحقق من صحة التصريح
- إلغاء التصريح مع سبب
- تحذير للتصاريح القريبة من الانتهاء

#### 11. مدير التقارير (Reports Manager)
- عرض قائمة التقارير مع التصفية
- إنشاء تقرير امتثال
- تحميل التقارير بصيغ متعددة
- معاينة التقرير

#### 12. مدير سجلات التدقيق (Audit Manager)
- عرض سجلات التدقيق مع التصفية
- بحث نصي في السجلات
- تصدير السجلات
- ضوابط الوصول (مدققين فقط)

## نماذج البيانات

### بنية البيانات في localStorage

```javascript
// التوكن
localStorage.setItem('auth_token', token);

// الصفحة الأخيرة
localStorage.setItem('last_page', 'dashboard');

// التصفيات المحفوظة
localStorage.setItem('filters_web_scan', JSON.stringify({
  status: 'RUNNING',
  dateRange: '7days'
}));

// معلومات المستخدم (مؤقتة)
localStorage.setItem('user_info', JSON.stringify({
  id: 'user-123',
  username: 'admin',
  permissions: ['READ', 'WRITE', 'EXECUTE']
}));
```

### بنية الاستجابات من API

```javascript
// استجابة تسجيل الدخول
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "user": {
    "id": "user-123",
    "username": "admin",
    "email": "admin@example.com",
    "permissions": ["READ", "WRITE", "EXECUTE"]
  }
}

// استجابة قائمة الفحوصات
{
  "success": true,
  "data": [
    {
      "id": "scan-123",
      "targetUrl": "https://example.com",
      "status": "RUNNING",
      "startedAt": "2024-01-15T10:00:00Z",
      "totalVulnerabilities": 5,
      "authorizationId": "auth-456"
    }
  ]
}

// استجابة الثغرات
{
  "success": true,
  "data": [
    {
      "id": "vuln-789",
      "type": "SQL_INJECTION",
      "severity": "CRITICAL",
      "location": "/api/users?id=1",
      "description": "SQL injection vulnerability found",
      "evidence": "Error: SQL syntax error...",
      "remediation": "Use prepared statements",
      "cvssScore": 9.8
    }
  ]
}

// استجابة خطأ
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_REQUIRED",
    "message": "This operation requires a valid authorization",
    "details": {
      "requiredScope": ["example.com"]
    }
  }
}
```


## خصائص الصحة (Correctness Properties)

الخاصية هي سمة أو سلوك يجب أن يكون صحيحاً عبر جميع عمليات التنفيذ الصالحة للنظام - في الأساس، بيان رسمي حول ما يجب أن تفعله الواجهة. تعمل الخصائص كجسر بين المواصفات المقروءة للإنسان وضمانات الصحة القابلة للتحقق آلياً.

### الخصائص الأساسية

#### الخاصية 1: استدعاء API الصحيح لتحميل البيانات

*لأي* صفحة في الواجهة، عند تحميل البيانات، يجب على الواجهة استدعاء نقطة النهاية الصحيحة في API وعرض البيانات المستلمة

**يتحقق من: المتطلبات 1.1، 2.3، 3.5، 4.2، 5.2، 6.1، 7.1**

#### الخاصية 2: التحقق الإلزامي من التصريح قبل العمليات

*لأي* عملية (فحص، حملة، اختبار شبكة)، يجب على الواجهة استدعاء `/api/v1/authorizations/:id/validate` والتحقق من الاستجابة قبل إرسال طلب بدء العملية

**يتحقق من: المتطلبات 2.2، 3.3، 4.5، 5.7**

#### الخاصية 3: عرض جميع البيانات المستلمة من API

*لأي* قائمة بيانات مستلمة من API، يجب على الواجهة عرض جميع العناصر دون حذف أو تعديل

**يتحقق من: المتطلبات 1.3، 2.3، 3.5، 4.2، 5.2، 6.1، 7.1**

#### الخاصية 4: التحديث التلقائي بالفترة الصحيحة

*لأي* صفحة تتطلب تحديثاً تلقائياً، يجب على الواجهة استخدام `setInterval` بالفترة المحددة (30 ثانية للوحة التحكم، 10 ثوان للفحوصات، 15 ثانية للحملات، 10 ثوان للاختبارات)

**يتحقق من: المتطلبات 1.5، 12.1، 12.2، 12.3، 12.4**

#### الخاصية 5: إيقاف التحديث عند مغادرة الصفحة

*لأي* صفحة بها تحديث تلقائي، عند التنقل إلى صفحة أخرى، يجب على الواجهة استدعاء `clearInterval` لجميع المؤقتات النشطة

**يتحقق من: المتطلبات 12.5**

#### الخاصية 6: معالجة أخطاء API بشكل صحيح

*لأي* طلب API فاشل، يجب على الواجهة عرض رسالة خطأ واضحة بالعربية باستخدام نظام الإشعارات

**يتحقق من: المتطلبات 1.6، 8.3، 11.3، 11.4، 11.5**

#### الخاصية 7: التوجيه عند انتهاء الجلسة

*لأي* استجابة API بحالة 401، يجب على الواجهة حذف التوكن من localStorage وتوجيه المستخدم إلى `/login.html`

**يتحقق من: المتطلبات 8.6، 11.6**

#### الخاصية 8: عرض رسالة عدم التفويض

*لأي* استجابة API بحالة 403، يجب على الواجهة عرض رسالة "غير مصرح لك بهذه العملية"

**يتحقق من: المتطلبات 7.6، 11.7**

#### الخاصية 9: تخزين التوكن عند تسجيل الدخول الناجح

*لأي* استجابة تسجيل دخول ناجحة من `/api/v1/auth/login`، يجب على الواجهة تخزين `accessToken` في localStorage تحت مفتاح `auth_token`

**يتحقق من: المتطلبات 8.2**

#### الخاصية 10: إضافة التوكن لجميع طلبات API

*لأي* طلب API (باستثناء `/auth/login`)، يجب على الواجهة إضافة header `Authorization: Bearer <token>` إذا كان التوكن موجوداً في localStorage

**يتحقق من: المتطلبات 8.5**

#### الخاصية 11: حذف التوكن عند تسجيل الخروج

*لأي* عملية تسجيل خروج، يجب على الواجهة إرسال POST إلى `/api/v1/auth/logout`، حذف التوكن من localStorage، وتوجيه المستخدم إلى `/login.html`

**يتحقق من: المتطلبات 8.7**

#### الخاصية 12: تصنيف الثغرات بالألوان الصحيحة

*لأي* ثغرة معروضة، يجب أن يكون لون العرض مطابقاً للخطورة (أحمر للحرج، برتقالي للعالي، أصفر للمتوسط، أزرق للمنخفض)

**يتحقق من: المتطلبات 2.5**

#### الخاصية 13: تحميل الملفات من API

*لأي* طلب تحميل تقرير، يجب على الواجهة استدعاء نقطة النهاية الصحيحة وتحميل الملف باستخدام `downloadFile` method

**يتحقق من: المتطلبات 2.7، 3.8، 4.9، 6.4**

#### الخاصية 14: التنقل بدون إعادة تحميل الصفحة

*لأي* نقرة على رابط تنقل، يجب على الواجهة منع السلوك الافتراضي، تحديث المحتوى ديناميكياً، وتحديث URL باستخدام `history.pushState`

**يتحقق من: المتطلبات 13.3، 13.4**

#### الخاصية 15: دعم أزرار الرجوع والتقدم

*لأي* حدث `popstate` من المتصفح، يجب على الواجهة تحميل الصفحة المناسبة من `event.state.page`

**يتحقق من: المتطلبات 13.5**

#### الخاصية 16: حفظ حالة المستخدم

*لأي* تنقل بين الصفحات، يجب على الواجهة حفظ الصفحة الحالية في localStorage تحت مفتاح `last_page`

**يتحقق من: المتطلبات 13.6**

#### الخاصية 17: التحقق من صحة المدخلات

*لأي* حقل إدخال مطلوب، يجب على الواجهة منع إرسال النموذج إذا كان الحقل فارغاً أو غير صالح

**يتحقق من: المتطلبات 14.1، 14.2، 14.3، 14.4**

#### الخاصية 18: عرض إشعارات Toast بالنوع الصحيح

*لأي* عملية ناجحة أو فاشلة، يجب على الواجهة عرض إشعار Toast بالنوع المناسب (نجاح باللون الأخضر، خطأ باللون الأحمر)

**يتحقق من: المتطلبات 9.3، 9.4**

#### الخاصية 19: إخفاء الإشعارات تلقائياً

*لأي* إشعار Toast معروض، يجب على الواجهة إخفاؤه تلقائياً بعد 5 ثوان باستخدام `setTimeout`

**يتحقق من: المتطلبات 9.5**

#### الخاصية 20: عرض شاشة تحميل أثناء العمليات

*لأي* عملية async تستغرق وقتاً، يجب على الواجهة عرض شاشة تحميل مع spinner حتى اكتمال العملية

**يتحقق من: المتطلبات 11.1، 11.2**


## معالجة الأخطاء (Error Handling)

### استراتيجية معالجة الأخطاء

#### 1. أخطاء API

```javascript
// في APIClient.request()
try {
  const response = await fetch(url, config);
  
  // معالجة أخطاء HTTP
  if (response.status === 401) {
    this.clearToken();
    window.location.href = '/login.html';
    throw new Error('انتهت صلاحية الجلسة');
  }
  
  if (response.status === 403) {
    throw new Error('غير مصرح لك بهذه العملية');
  }
  
  if (response.status === 404) {
    throw new Error('المورد غير موجود');
  }
  
  if (response.status >= 500) {
    throw new Error('خطأ في الخادم، يرجى المحاولة لاحقاً');
  }
  
  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error?.message || 'حدث خطأ في الطلب');
  }
  
  return result;
} catch (error) {
  // معالجة أخطاء الشبكة
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    throw new Error('فشل الاتصال بالخادم');
  }
  
  throw error;
}
```

#### 2. أخطاء التحقق من المدخلات

```javascript
// في النماذج
function validateURL(url) {
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: 'عنوان URL غير صالح' };
  }
}

function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return { valid: false, error: 'البريد الإلكتروني غير صالح' };
  }
  return { valid: true };
}

function validateRequired(value, fieldName) {
  if (!value || value.trim() === '') {
    return { valid: false, error: `${fieldName} مطلوب` };
  }
  return { valid: true };
}
```

#### 3. أخطاء التحميل

```javascript
// في المكونات
async loadData() {
  try {
    const data = await this.api.get('/endpoint');
    this.renderData(data);
  } catch (error) {
    console.error('Error loading data:', error);
    notifications.error('فشل تحميل البيانات: ' + error.message);
    
    // عرض رسالة خطأ في الواجهة
    this.container.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>${error.message}</p>
        <button onclick="this.loadData()">إعادة المحاولة</button>
      </div>
    `;
  }
}
```

### سيناريوهات معالجة الأخطاء

#### 1. فشل تسجيل الدخول

```javascript
async login(username, password) {
  try {
    const response = await this.api.post('/auth/login', { username, password });
    this.api.setToken(response.accessToken);
    window.location.href = '/';
  } catch (error) {
    notifications.error('فشل تسجيل الدخول: ' + error.message);
    // عرض رسالة خطأ تحت النموذج
    document.getElementById('login-error').textContent = error.message;
  }
}
```

#### 2. فشل التحقق من التصريح

```javascript
async startScan() {
  try {
    // التحقق من التصريح أولاً
    const authValid = await this.api.post(`/authorizations/${authId}/validate`, { target: url });
    
    if (!authValid.authorized) {
      notifications.error('التصريح غير صالح لهذا الهدف');
      return;
    }
    
    // بدء الفحص
    await this.api.post('/scans/web', data);
    notifications.success('تم بدء الفحص بنجاح');
  } catch (error) {
    notifications.error('فشل بدء الفحص: ' + error.message);
  }
}
```

#### 3. فشل تحميل ملف

```javascript
async downloadReport(scanId) {
  try {
    await this.api.downloadFile(`/scans/web/${scanId}/report?format=pdf`, `report-${scanId}.pdf`);
    notifications.success('تم تحميل التقرير');
  } catch (error) {
    notifications.error('فشل تحميل التقرير: ' + error.message);
  }
}
```

## استراتيجية الاختبار (Testing Strategy)

### نهج الاختبار المزدوج

تتبع الواجهة نهج اختبار مزدوج يجمع بين:

1. **اختبارات الوحدة (Unit Tests)**: للتحقق من أمثلة محددة وحالات حافة وشروط الأخطاء
2. **اختبارات قائمة على الخصائص (Property-Based Tests)**: للتحقق من الخصائص العامة عبر جميع المدخلات

هذان النوعان من الاختبارات متكاملان وضروريان للتغطية الشاملة:
- اختبارات الوحدة تكتشف أخطاء محددة وتوثق السلوك المتوقع
- اختبارات الخصائص تتحقق من الصحة العامة عبر مدخلات عشوائية متنوعة

### مكتبات الاختبار

#### اختبارات قائمة على الخصائص

سنستخدم مكتبة **fast-check** لـ JavaScript لاختبارات الخصائص:

```bash
npm install --save-dev fast-check
```

#### اختبارات الوحدة

سنستخدم **Jest** كإطار اختبار رئيسي:

```bash
npm install --save-dev jest @types/jest
```

### تكوين اختبارات الخصائص

#### الحد الأدنى للتكرارات

- كل اختبار خاصية يجب أن يعمل لـ **100 تكرار على الأقل**
- يمكن زيادة العدد للخصائص الحرجة (500-1000 تكرار)

#### وسم الاختبارات

كل اختبار خاصية يجب أن يحتوي على تعليق يشير إلى الخاصية في وثيقة التصميم:

```javascript
/**
 * Feature: web-interface-enhancement
 * Property 2: التحقق الإلزامي من التصريح قبل العمليات
 * 
 * لأي عملية، يجب على الواجهة استدعاء validate API
 * والتحقق من الاستجابة قبل إرسال طلب بدء العملية
 */
test('property: authorization validation before operations', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.record({
        operationType: fc.constantFrom('WEB_SCAN', 'PHISHING_CAMPAIGN', 'NETWORK_ANALYSIS'),
        target: fc.webUrl(),
        authorizationId: fc.uuid()
      }),
      async (operation) => {
        // Mock API
        const mockApi = {
          post: jest.fn()
            .mockResolvedValueOnce({ authorized: true }) // validate call
            .mockResolvedValueOnce({ id: 'operation-123' }) // start operation call
        };

        const manager = new WebScanManager(mockApi, {});
        
        await manager.startOperation(operation);
        
        // التحقق من أن validate تم استدعاؤه أولاً
        expect(mockApi.post).toHaveBeenNthCalledWith(
          1,
          `/authorizations/${operation.authorizationId}/validate`,
          expect.any(Object)
        );
        
        // التحقق من أن start operation تم استدعاؤه ثانياً
        expect(mockApi.post).toHaveBeenNthCalledWith(
          2,
          expect.stringContaining('/'),
          expect.any(Object)
        );
      }
    ),
    { numRuns: 100 }
  );
});
```

### أمثلة على اختبارات الخصائص

#### الخاصية 1: استدعاء API الصحيح

```javascript
/**
 * Feature: web-interface-enhancement
 * Property 1: استدعاء API الصحيح لتحميل البيانات
 */
test('property: correct API endpoint called for data loading', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.constantFrom('dashboard', 'web-scan', 'phishing', 'network'),
      async (page) => {
        const mockApi = {
          get: jest.fn().mockResolvedValue([])
        };

        const app = new App();
        app.api = mockApi;
        
        await app.loadPage(page);
        
        // التحقق من أن API تم استدعاؤه
        expect(mockApi.get).toHaveBeenCalled();
        
        // التحقق من أن نقطة النهاية صحيحة
        const endpoint = mockApi.get.mock.calls[0][0];
        expect(endpoint).toMatch(/^\/[a-z-/]+$/);
      }
    ),
    { numRuns: 100 }
  );
});
```

#### الخاصية 7: التوجيه عند انتهاء الجلسة

```javascript
/**
 * Feature: web-interface-enhancement
 * Property 7: التوجيه عند انتهاء الجلسة
 */
test('property: redirect to login on 401 response', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.webUrl(),
      async (endpoint) => {
        // Mock fetch to return 401
        global.fetch = jest.fn().mockResolvedValue({
          status: 401,
          ok: false,
          json: async () => ({ error: { message: 'Unauthorized' } })
        });

        const api = new APIClient();
        api.setToken('test-token');
        
        // Mock window.location
        delete window.location;
        window.location = { href: '' };
        
        try {
          await api.get(endpoint);
        } catch (error) {
          // نتوقع خطأ
        }
        
        // التحقق من حذف التوكن
        expect(localStorage.getItem('auth_token')).toBeNull();
        
        // التحقق من التوجيه
        expect(window.location.href).toBe('/login.html');
      }
    ),
    { numRuns: 100 }
  );
});
```

#### الخاصية 10: إضافة التوكن لجميع الطلبات

```javascript
/**
 * Feature: web-interface-enhancement
 * Property 10: إضافة التوكن لجميع طلبات API
 */
test('property: token added to all API requests', async () => {
  fc.assert(
    fc.asyncProperty(
      fc.record({
        endpoint: fc.webUrl(),
        token: fc.hexaString({ minLength: 32, maxLength: 64 })
      }),
      async ({ endpoint, token }) => {
        // Mock fetch
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ success: true })
        });

        const api = new APIClient();
        api.setToken(token);
        
        await api.get(endpoint);
        
        // التحقق من إضافة التوكن في header
        const fetchCall = global.fetch.mock.calls[0];
        const headers = fetchCall[1].headers;
        
        expect(headers['Authorization']).toBe(`Bearer ${token}`);
      }
    ),
    { numRuns: 100 }
  );
});
```

### اختبارات الوحدة

#### أمثلة محددة

```javascript
describe('APIClient', () => {
  test('should store token in localStorage on setToken', () => {
    const api = new APIClient();
    const token = 'test-token-123';
    
    api.setToken(token);
    
    expect(localStorage.getItem('auth_token')).toBe(token);
    expect(api.token).toBe(token);
  });
  
  test('should clear token from localStorage on clearToken', () => {
    const api = new APIClient();
    api.setToken('test-token');
    
    api.clearToken();
    
    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(api.token).toBeNull();
  });
  
  test('should throw error on 403 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 403,
      ok: false,
      json: async () => ({ error: { message: 'Forbidden' } })
    });

    const api = new APIClient();
    
    await expect(api.get('/test')).rejects.toThrow('غير مصرح لك بهذه العملية');
  });
});

describe('NotificationManager', () => {
  test('should show success notification with green color', () => {
    const notifications = new NotificationManager();
    
    const notification = notifications.success('تم بنجاح');
    
    expect(notification.classList.contains('notification-success')).toBe(true);
    expect(notification.textContent).toContain('تم بنجاح');
  });
  
  test('should auto-hide notification after duration', (done) => {
    const notifications = new NotificationManager();
    
    const notification = notifications.info('رسالة', 1000);
    
    setTimeout(() => {
      expect(notification.parentElement).toBeNull();
      done();
    }, 1500);
  });
});

describe('AuthManager', () => {
  test('should store token and user on successful login', async () => {
    const mockApi = {
      post: jest.fn().mockResolvedValue({
        accessToken: 'token-123',
        user: { id: 'user-1', username: 'admin' }
      }),
      setToken: jest.fn()
    };

    const auth = new AuthManager(mockApi);
    
    const result = await auth.login('admin', 'password');
    
    expect(result.success).toBe(true);
    expect(mockApi.setToken).toHaveBeenCalledWith('token-123');
    expect(auth.currentUser).toEqual({ id: 'user-1', username: 'admin' });
  });
  
  test('should return error on failed login', async () => {
    const mockApi = {
      post: jest.fn().mockRejectedValue(new Error('Invalid credentials'))
    };

    const auth = new AuthManager(mockApi);
    
    const result = await auth.login('admin', 'wrong');
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });
});
```

### استراتيجية التغطية

1. **اختبارات الوحدة**: تغطية 80% من الكود على الأقل
2. **اختبارات الخصائص**: تغطية جميع الخصائص المحددة في التصميم
3. **اختبارات التكامل**: اختبار التفاعل بين المكونات
4. **اختبارات E2E**: اختبار السيناريوهات الكاملة (اختياري)

### أدوات الاختبار الإضافية

- **Jest DOM**: لاختبار عناصر DOM
- **Testing Library**: لاختبار تفاعل المستخدم
- **MSW (Mock Service Worker)**: لمحاكاة API
