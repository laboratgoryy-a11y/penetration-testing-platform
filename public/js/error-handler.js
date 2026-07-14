/**
 * Error Handler - معالج الأخطاء المركزي
 * يوفر معالجة موحدة للأخطاء مع رسائل user-friendly وتسجيل الأخطاء
 */
class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 100;
    this.init();
  }

  /**
   * تهيئة معالج الأخطاء
   */
  init() {
    // معالجة الأخطاء غير المعالجة
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, event.message, event.filename, event.lineno);
    });

    // معالجة Promise rejections غير المعالجة
    window.addEventListener('unhandledrejection', (event) => {
      this.handlePromiseRejection(event.reason);
    });

    window.appLogger?.debug('✓ Error Handler initialized');
  }

  /**
   * معالجة خطأ عام
   */
  handleGlobalError(error, message, filename, lineno) {
    const errorInfo = {
      type: 'global',
      message: message || error?.message || 'خطأ غير معروف',
      stack: error?.stack,
      filename,
      lineno,
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);
    this.showUserFriendlyError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
  }

  /**
   * معالجة Promise rejection
   */
  handlePromiseRejection(reason) {
    const errorInfo = {
      type: 'promise',
      message: reason?.message || reason || 'خطأ في Promise',
      stack: reason?.stack,
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);
    
    // عدم إظهار رسالة للمستخدم إذا كان خطأ شبكة (سيتم معالجته في API client)
    if (!this.isNetworkError(reason)) {
      this.showUserFriendlyError('حدث خطأ في معالجة البيانات. يرجى المحاولة مرة أخرى.');
    }
  }

  /**
   * معالجة خطأ API
   */
  handleAPIError(error, context = {}) {
    const errorInfo = {
      type: 'api',
      message: error?.message || 'خطأ في الاتصال بالخادم',
      status: error?.status,
      endpoint: context.endpoint,
      method: context.method,
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);

    // رسائل user-friendly حسب نوع الخطأ
    let userMessage = this.getAPIErrorMessage(error);
    this.showUserFriendlyError(userMessage);

    return errorInfo;
  }

  /**
   * معالجة خطأ في النموذج
   */
  handleFormError(error, formId) {
    const errorInfo = {
      type: 'form',
      message: error?.message || 'خطأ في التحقق من البيانات',
      formId,
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);
    this.showUserFriendlyError('يرجى التحقق من البيانات المدخلة والمحاولة مرة أخرى.');
  }

  /**
   * معالجة خطأ في التحميل
   */
  handleLoadError(resource, context = {}) {
    const errorInfo = {
      type: 'load',
      message: `فشل تحميل: ${resource}`,
      resource,
      context,
      timestamp: new Date().toISOString()
    };

    this.logError(errorInfo);
    this.showUserFriendlyError('فشل تحميل البيانات. يرجى تحديث الصفحة.');
  }

  /**
   * الحصول على رسالة خطأ API user-friendly
   */
  getAPIErrorMessage(error) {
    // رسائل مخصصة حسب نوع الخطأ
    const errorMessages = {
      // أخطاء المصادقة
      401: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.',
      403: 'غير مصرح لك بالوصول إلى هذا المورد.',
      
      // أخطاء الطلب
      400: 'البيانات المرسلة غير صحيحة. يرجى التحقق من المدخلات.',
      404: 'المورد المطلوب غير موجود.',
      409: 'تعارض في البيانات. يرجى تحديث الصفحة والمحاولة مرة أخرى.',
      422: 'البيانات المدخلة غير صالحة. يرجى التحقق من جميع الحقول.',
      
      // أخطاء الخادم
      500: 'خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.',
      502: 'الخادم غير متاح حالياً. يرجى المحاولة مرة أخرى لاحقاً.',
      503: 'الخدمة غير متاحة مؤقتاً. يرجى المحاولة مرة أخرى لاحقاً.',
      504: 'انتهت مهلة الاتصال بالخادم. يرجى المحاولة مرة أخرى.',
      
      // أخطاء الشبكة
      'network': 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.',
      'timeout': 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.'
    };

    // التحقق من نوع الخطأ
    if (error?.status && errorMessages[error.status]) {
      return errorMessages[error.status];
    }

    if (this.isNetworkError(error)) {
      return errorMessages['network'];
    }

    if (this.isTimeoutError(error)) {
      return errorMessages['timeout'];
    }

    // رسالة افتراضية
    return error?.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
  }

  /**
   * عرض رسالة خطأ للمستخدم
   */
  showUserFriendlyError(message, duration = 8000) {
    if (window.notificationManager) {
      window.notificationManager.error(message, duration);
    } else {
      // fallback إلى alert إذا لم يكن notification manager متاحاً
      alert(message);
    }
  }

  /**
   * عرض رسالة تحذير للمستخدم
   */
  showWarning(message, duration = 6000) {
    if (window.notificationManager) {
      window.notificationManager.warning(message, duration);
    }
  }

  /**
   * تسجيل الخطأ
   */
  logError(errorInfo) {
    // إضافة إلى سجل الأخطاء
    this.errorLog.unshift(errorInfo);

    // الحفاظ على حجم السجل
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(0, this.maxLogSize);
    }

    // طباعة في console
    console.error('Error logged:', errorInfo);

    // يمكن إرسال الخطأ إلى خادم التسجيل هنا
    // this.sendErrorToServer(errorInfo);
  }

  /**
   * التحقق من خطأ شبكة
   */
  isNetworkError(error) {
    return (
      error?.name === 'TypeError' ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('Network request failed') ||
      error?.message?.includes('NetworkError')
    );
  }

  /**
   * التحقق من خطأ timeout
   */
  isTimeoutError(error) {
    return (
      error?.name === 'TimeoutError' ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('timed out')
    );
  }

  /**
   * الحصول على سجل الأخطاء
   */
  getErrorLog() {
    return [...this.errorLog];
  }

  /**
   * مسح سجل الأخطاء
   */
  clearErrorLog() {
    this.errorLog = [];
    window.appLogger?.debug('✓ Error log cleared');
  }

  /**
   * تصدير سجل الأخطاء
   */
  exportErrorLog() {
    const logData = JSON.stringify(this.errorLog, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-log-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Error Boundary - معالج أخطاء للمكونات
   */
  wrapComponent(componentFn, componentName = 'Component') {
    return (...args) => {
      try {
        return componentFn(...args);
      } catch (error) {
        const errorInfo = {
          type: 'component',
          component: componentName,
          message: error?.message || 'خطأ في المكون',
          stack: error?.stack,
          timestamp: new Date().toISOString()
        };

        this.logError(errorInfo);
        this.showUserFriendlyError(`حدث خطأ في تحميل ${componentName}. يرجى تحديث الصفحة.`);

        // إرجاع عنصر خطأ بديل
        return this.createErrorElement(componentName);
      }
    };
  }

  /**
   * إنشاء عنصر خطأ بديل
   */
  createErrorElement(componentName) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-boundary';
    errorDiv.style.cssText = `
      padding: 40px;
      text-align: center;
      background: #fef2f2;
      border: 2px solid #ef4444;
      border-radius: 8px;
      margin: 20px;
    `;
    errorDiv.innerHTML = `
      <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 15px;"></i>
      <h3 style="color: #dc2626; margin-bottom: 10px;">حدث خطأ في تحميل ${componentName}</h3>
      <p style="color: #991b1b;">يرجى تحديث الصفحة أو الاتصال بالدعم الفني إذا استمرت المشكلة.</p>
      <button onclick="location.reload()" class="btn-primary" style="margin-top: 20px;">
        <i class="fas fa-redo"></i> تحديث الصفحة
      </button>
    `;
    return errorDiv;
  }

  /**
   * معالج أخطاء async/await
   */
  async handleAsync(asyncFn, errorContext = {}) {
    try {
      return await asyncFn();
    } catch (error) {
      this.handleAPIError(error, errorContext);
      throw error; // إعادة رمي الخطأ للسماح بمعالجة إضافية
    }
  }
}

// إنشاء instance عام (Singleton)
window.errorHandler = new ErrorHandler();

// Helper function للاستخدام السهل
window.handleError = (error, context) => {
  return window.errorHandler.handleAPIError(error, context);
};

