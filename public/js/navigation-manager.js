/**
 * Navigation Manager - إدارة التنقل بين الأقسام مع دعم Hash-based Routing
 */
class NavigationManager {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.breadcrumbs = [];
    this.beforeNavigateCallbacks = [];
    this.afterNavigateCallbacks = [];
  }

  /**
   * تسجيل route جديد
   */
  registerRoute(path, config) {
    this.routes.set(path, {
      title: config.title,
      handler: config.handler,
      breadcrumb: config.breadcrumb || config.title,
      requiresAuth: config.requiresAuth !== false
    });
  }

  /**
   * تهيئة Navigation Manager
   */
  initialize() {
    // إعداد روابط القائمة
    this.setupMenuLinks();
    
    // التنقل إلى الصفحة الافتراضية
    this.navigateTo('dashboard', false);
  }

  /**
   * معالجة تغيير hash
   */
  handleHashChange() {
    // لم نعد نستخدم hash-based routing
  }

  /**
   * التنقل إلى route محدد
   */
  async navigateTo(path, updateHash = false) {
    // التحقق من وجود route
    if (!this.routes.has(path)) {
      console.warn(`Route not found: ${path}`);
      path = 'dashboard';
    }

    const route = this.routes.get(path);

    // التحقق من المصادقة
    if (route.requiresAuth && !this.isAuthenticated()) {
      window.location.href = '/login.html';
      return;
    }

    // تنفيذ callbacks قبل التنقل
    for (const callback of this.beforeNavigateCallbacks) {
      try {
        const canNavigate = await callback(path, this.currentRoute);
        if (canNavigate === false) {
          return; // إلغاء التنقل
        }
      } catch (error) {
        console.error('Error in beforeNavigate callback:', error);
      }
    }

    // تحديث الحالة
    const previousRoute = this.currentRoute;
    this.currentRoute = path;

    // تحديث breadcrumbs
    this.updateBreadcrumbs(path, route);

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
      pageTitle.textContent = route.title;
    }

    // تحديث القائمة النشطة
    this.updateActiveMenu(path);

    // إخفاء جميع الأقسام
    this.hideAllSections();

    // تنفيذ handler
    try {
      await route.handler();
    } catch (error) {
      console.error(`Error in route handler for ${path}:`, error);
      this.showError('حدث خطأ أثناء تحميل الصفحة');
    }

    // تحديث State Manager
    if (window.stateManager) {
      window.stateManager.setCurrentSection(path);
    }

    // تنفيذ callbacks بعد التنقل
    for (const callback of this.afterNavigateCallbacks) {
      try {
        await callback(path, previousRoute);
      } catch (error) {
        console.error('Error in afterNavigate callback:', error);
      }
    }

    window.appLogger?.debug(`✓ Navigated to: ${path}`);
  }

  /**
   * إخفاء جميع الأقسام
   */
  hideAllSections() {
    const sections = document.querySelectorAll('.page');
    sections.forEach(section => {
      section.classList.remove('active');
    });
  }

  /**
   * عرض قسم محدد
   */
  showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
    } else {
      console.warn(`Section not found: ${sectionId}`);
    }
  }

  /**
   * تحديث breadcrumbs
   */
  updateBreadcrumbs(path, route) {
    this.breadcrumbs = [
      { title: 'الرئيسية', path: 'dashboard' }
    ];

    if (path !== 'dashboard') {
      this.breadcrumbs.push({
        title: route.breadcrumb,
        path: path
      });
    }

    this.renderBreadcrumbs();
  }

  /**
   * عرض breadcrumbs
   */
  renderBreadcrumbs() {
    const container = document.getElementById('breadcrumbs');
    if (!container) return;

    const html = this.breadcrumbs.map((crumb, index) => {
      const isLast = index === this.breadcrumbs.length - 1;
      if (isLast) {
        return `<span class="breadcrumb-item active">${crumb.title}</span>`;
      } else {
        return `<a href="javascript:void(0)" class="breadcrumb-item" onclick="window.navigationManager.navigateTo('${crumb.path}')">${crumb.title}</a>`;
      }
    }).join(' <span class="breadcrumb-separator">/</span> ');

    container.innerHTML = html;
  }

  /**
   * تحديث القائمة النشطة
   */
  updateActiveMenu(path) {
    // إزالة active من جميع العناصر
    const menuItems = document.querySelectorAll('.sidebar-nav .nav-item');
    menuItems.forEach(item => {
      item.classList.remove('active');
    });

    // إضافة active للعنصر الحالي
    const activeItem = document.querySelector(`.sidebar-nav .nav-item[data-page="${path}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }
  }

  /**
   * إعداد روابط القائمة
   */
  setupMenuLinks() {
    const menuLinks = document.querySelectorAll('.sidebar-nav .nav-item');
    menuLinks.forEach(link => {
      // تجاهل الروابط التي تحتوي على href حقيقي (مثل /ip-scanner.html)
      const href = link.getAttribute('href');
      if (href && href !== 'javascript:void(0)' && !href.startsWith('#')) {
        // هذا رابط خارجي، اتركه يعمل بشكل طبيعي
        return;
      }
      
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = link.getAttribute('data-page');
        if (path) {
          this.navigateTo(path);
        }
      });
    });
  }

  /**
   * التحقق من المصادقة
   */
  isAuthenticated() {
    return !!localStorage.getItem('auth_token');
  }

  /**
   * عرض رسالة خطأ
   */
  showError(message) {
    if (window.notificationManager) {
      window.notificationManager.error(message);
    } else {
      alert(message);
    }
  }

  /**
   * إضافة callback قبل التنقل
   */
  beforeNavigate(callback) {
    this.beforeNavigateCallbacks.push(callback);
  }

  /**
   * إضافة callback بعد التنقل
   */
  afterNavigate(callback) {
    this.afterNavigateCallbacks.push(callback);
  }

  /**
   * الحصول على route الحالي
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * الحصول على breadcrumbs
   */
  getBreadcrumbs() {
    return this.breadcrumbs;
  }

  /**
   * العودة للصفحة السابقة
   */
  goBack() {
    window.history.back();
  }
}

// تصدير instance واحد (Singleton)
window.navigationManager = new NavigationManager();

