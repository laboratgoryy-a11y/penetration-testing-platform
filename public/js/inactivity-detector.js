/**
 * Inactivity Detector - كشف عدم النشاط وإيقاف Polling
 * يراقب نشاط المستخدم ويوقف polling بعد 5 دقائق من عدم النشاط
 */
class InactivityDetector {
  constructor(inactivityTimeout = 5 * 60 * 1000) { // 5 minutes default
    this.inactivityTimeout = inactivityTimeout;
    this.lastActivityTime = Date.now();
    this.isActive = true;
    this.inactivityTimer = null;
    this.checkInterval = null;
    
    // Events to track
    this.activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];
    
    this.init();
  }

  /**
   * تهيئة كاشف عدم النشاط
   */
  init() {
    // إضافة event listeners لجميع أحداث النشاط
    this.activityEvents.forEach(event => {
      document.addEventListener(event, () => this.onActivity(), { passive: true });
    });

    // بدء فحص دوري لعدم النشاط
    this.startInactivityCheck();
    
    window.appLogger?.debug('✓ Inactivity Detector initialized');
  }

  /**
   * معالج حدث النشاط
   */
  onActivity() {
    const now = Date.now();
    const wasInactive = !this.isActive;
    
    this.lastActivityTime = now;
    this.isActive = true;

    // إذا كان المستخدم غير نشط وأصبح نشطاً الآن
    if (wasInactive) {
      window.appLogger?.debug('✓ User activity detected - resuming polling');
      this.resumePolling();
      
      // إشعار المستخدم
      if (window.notificationManager) {
        window.notificationManager.info('تم استئناف التحديثات التلقائية', 3000);
      }
    }
  }

  /**
   * بدء فحص دوري لعدم النشاط
   */
  startInactivityCheck() {
    // فحص كل 30 ثانية
    this.checkInterval = setInterval(() => {
      this.checkInactivity();
    }, 30000);
  }

  /**
   * فحص حالة عدم النشاط
   */
  checkInactivity() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;

    // إذا تجاوز الوقت حد عدم النشاط
    if (timeSinceLastActivity >= this.inactivityTimeout && this.isActive) {
      window.appLogger?.debug('⚠ User inactive for 5 minutes - pausing polling');
      this.isActive = false;
      this.pausePolling();
      
      // إشعار المستخدم
      if (window.notificationManager) {
        window.notificationManager.warning(
          'تم إيقاف التحديثات التلقائية بسبب عدم النشاط. سيتم استئنافها عند العودة.',
          8000
        );
      }
    }
  }

  /**
   * إيقاف جميع عمليات polling
   */
  pausePolling() {
    if (window.stateManager) {
      // إيقاف جميع عمليات polling
      window.stateManager.stopAllPolling();
      
      // تعيين علامة في الحالة
      window.stateManager.setState('system.pollingPaused', true);
      window.stateManager.setState('system.pauseReason', 'inactivity');
    }
  }

  /**
   * استئناف جميع عمليات polling
   */
  resumePolling() {
    if (window.stateManager) {
      // إزالة علامة الإيقاف
      window.stateManager.setState('system.pollingPaused', false);
      window.stateManager.setState('system.pauseReason', null);
      
      // استئناف polling حسب القسم الحالي
      const currentSection = window.stateManager.getState('currentSection');
      
      // استئناف polling للـ Dashboard إذا كان القسم الحالي
      if (currentSection === 'dashboard' && window.dashboardManager) {
        window.dashboardManager.startPolling();
      }
      
      // استئناف polling للفحوصات النشطة
      if (currentSection === 'web-scan' && window.webScannerManager) {
        window.webScannerManager.resumePolling();
      }
      
      // استئناف polling للحملات النشطة
      if (currentSection === 'phishing' && window.phishingCampaignManager) {
        window.phishingCampaignManager.resumePolling();
      }
      
      // استئناف polling لتحليلات الشبكات النشطة
      if (currentSection === 'network' && window.networkAnalyzerManager) {
        window.networkAnalyzerManager.resumePolling();
      }
    }
  }

  /**
   * الحصول على حالة النشاط
   */
  getStatus() {
    return {
      isActive: this.isActive,
      lastActivityTime: this.lastActivityTime,
      timeSinceLastActivity: Date.now() - this.lastActivityTime,
      inactivityTimeout: this.inactivityTimeout
    };
  }

  /**
   * تعيين مهلة عدم النشاط
   */
  setInactivityTimeout(timeout) {
    this.inactivityTimeout = timeout;
    window.appLogger?.debug(`✓ Inactivity timeout set to ${timeout}ms`);
  }

  /**
   * إعادة تعيين عداد النشاط
   */
  reset() {
    this.lastActivityTime = Date.now();
    this.isActive = true;
  }

  /**
   * تدمير كاشف عدم النشاط
   */
  destroy() {
    // إزالة event listeners
    this.activityEvents.forEach(event => {
      document.removeEventListener(event, () => this.onActivity());
    });

    // إيقاف الفحص الدوري
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    window.appLogger?.debug('✓ Inactivity Detector destroyed');
  }
}

// إنشاء instance عام (Singleton)
window.inactivityDetector = new InactivityDetector();

