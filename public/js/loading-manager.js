/**
 * Loading Manager - نظام إدارة شاشات التحميل
 * يوفر واجهة موحدة لعرض مؤشرات التحميل
 */
class LoadingManager {
  constructor() {
    this.activeLoaders = new Map();
  }

  /**
   * عرض شاشة تحميل
   * @param {string|HTMLElement} container - الحاوية أو معرفها
   * @param {string} message - رسالة التحميل
   * @param {string} type - نوع المؤشر (spinner, skeleton, overlay)
   * @returns {HTMLElement} عنصر التحميل
   */
  show(container, message = 'جاري التحميل...', type = 'spinner') {
    // الحصول على عنصر الحاوية
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }

    if (!container) {
      console.error('Loading container not found');
      return null;
    }

    // إزالة أي loader موجود في نفس الحاوية
    this.hide(container);

    // إنشاء عنصر التحميل
    const loader = document.createElement('div');
    loader.className = `loading-indicator loading-${type}`;
    loader.setAttribute('data-loading', 'true');

    // بناء محتوى التحميل حسب النوع
    if (type === 'spinner') {
      loader.innerHTML = `
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <p class="loading-message">${message}</p>
        </div>
      `;
    } else if (type === 'skeleton') {
      loader.innerHTML = this.getSkeletonHTML();
    } else if (type === 'overlay') {
      loader.innerHTML = `
        <div class="loading-overlay-content">
          <div class="loading-spinner">
            <i class="fas fa-spinner fa-spin"></i>
            <p class="loading-message">${message}</p>
          </div>
        </div>
      `;
    }

    // إضافة للحاوية
    container.style.position = 'relative';
    container.appendChild(loader);

    // حفظ المرجع
    this.activeLoaders.set(container, loader);

    return loader;
  }

  /**
   * إخفاء شاشة تحميل
   * @param {string|HTMLElement} container - الحاوية أو معرفها
   */
  hide(container) {
    // الحصول على عنصر الحاوية
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }

    if (!container) {
      return;
    }

    // إزالة loader من الحاوية
    const loader = this.activeLoaders.get(container);
    if (loader && loader.parentElement) {
      loader.remove();
      this.activeLoaders.delete(container);
    }

    // إزالة أي loaders أخرى في الحاوية
    const loaders = container.querySelectorAll('[data-loading="true"]');
    loaders.forEach(l => l.remove());
  }

  /**
   * تنفيذ عملية async مع عرض تحميل
   * @param {string|HTMLElement} container - الحاوية
   * @param {Function} asyncFunction - الدالة async
   * @param {string} message - رسالة التحميل
   * @param {string} type - نوع المؤشر
   * @returns {Promise} نتيجة الدالة
   */
  async withLoading(container, asyncFunction, message = 'جاري التحميل...', type = 'spinner') {
    this.show(container, message, type);
    
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      this.hide(container);
    }
  }

  /**
   * عرض loading overlay على كامل الصفحة
   * @param {string} message - رسالة التحميل
   * @returns {HTMLElement} عنصر التحميل
   */
  showGlobal(message = 'جاري التحميل...') {
    // إزالة أي overlay موجود
    this.hideGlobal();

    const overlay = document.createElement('div');
    overlay.id = 'global-loading-overlay';
    overlay.className = 'loading-global-overlay';
    overlay.innerHTML = `
      <div class="loading-global-content">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
          <p class="loading-message">${message}</p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    
    // تفعيل الأنيميشن
    setTimeout(() => {
      overlay.classList.add('active');
    }, 10);

    return overlay;
  }

  /**
   * إخفاء loading overlay العام
   */
  hideGlobal() {
    const overlay = document.getElementById('global-loading-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => {
        overlay.remove();
      }, 300);
    }
  }

  /**
   * تنفيذ عملية async مع overlay عام
   * @param {Function} asyncFunction - الدالة async
   * @param {string} message - رسالة التحميل
   * @returns {Promise} نتيجة الدالة
   */
  async withGlobalLoading(asyncFunction, message = 'جاري التحميل...') {
    this.showGlobal(message);
    
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      this.hideGlobal();
    }
  }

  /**
   * الحصول على HTML لـ skeleton screen
   * @returns {string} HTML
   */
  getSkeletonHTML() {
    return `
      <div class="skeleton-screen">
        <div class="skeleton-item skeleton-title"></div>
        <div class="skeleton-item skeleton-text"></div>
        <div class="skeleton-item skeleton-text"></div>
        <div class="skeleton-item skeleton-text short"></div>
      </div>
    `;
  }

  /**
   * عرض progress bar
   * @param {string|HTMLElement} container - الحاوية
   * @param {number} progress - نسبة التقدم (0-100)
   * @param {string} message - رسالة التحميل
   * @returns {HTMLElement} عنصر progress bar
   */
  showProgress(container, progress = 0, message = '') {
    // الحصول على عنصر الحاوية
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }

    if (!container) {
      return null;
    }

    // البحث عن progress bar موجود
    let progressBar = container.querySelector('.loading-progress-bar');
    
    if (!progressBar) {
      // إنشاء progress bar جديد
      progressBar = document.createElement('div');
      progressBar.className = 'loading-progress-bar';
      progressBar.setAttribute('data-loading', 'true');
      progressBar.innerHTML = `
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${progress}%"></div>
        </div>
        <p class="progress-bar-message">${message}</p>
        <p class="progress-bar-percent">${progress}%</p>
      `;
      
      container.appendChild(progressBar);
      this.activeLoaders.set(container, progressBar);
    } else {
      // تحديث progress bar موجود
      const fill = progressBar.querySelector('.progress-bar-fill');
      const messageEl = progressBar.querySelector('.progress-bar-message');
      const percentEl = progressBar.querySelector('.progress-bar-percent');
      
      if (fill) fill.style.width = `${progress}%`;
      if (messageEl) messageEl.textContent = message;
      if (percentEl) percentEl.textContent = `${progress}%`;
    }

    return progressBar;
  }

  /**
   * تحديث progress bar
   * @param {string|HTMLElement} container - الحاوية
   * @param {number} progress - نسبة التقدم (0-100)
   * @param {string} message - رسالة التحميل
   */
  updateProgress(container, progress, message = '') {
    this.showProgress(container, progress, message);
  }

  /**
   * إخفاء جميع مؤشرات التحميل
   */
  hideAll() {
    this.activeLoaders.forEach((loader, container) => {
      this.hide(container);
    });
    this.hideGlobal();
  }

  /**
   * التحقق من وجود loader نشط
   * @param {string|HTMLElement} container - الحاوية
   * @returns {boolean}
   */
  isLoading(container) {
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    return this.activeLoaders.has(container);
  }
}

// إنشاء instance عام (Singleton)
window.loadingManager = new LoadingManager();

// Alias للتوافق مع الكود الموجود
window.loading = window.loadingManager;

// دوال مساعدة عامة للتوافق مع الكود القديم
function showLoading(message = 'جاري التحميل...') {
  return window.loadingManager.showGlobal(message);
}

function hideLoading() {
  window.loadingManager.hideGlobal();
}

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
  window.showLoading = showLoading;
  window.hideLoading = hideLoading;
}
