/**
 * Notification Manager - نظام إدارة الإشعارات
 * يوفر واجهة موحدة لعرض الإشعارات للمستخدم
 */
class NotificationManager {
  constructor() {
    this.container = null;
    this.notifications = [];
    this.maxNotifications = 5;
    this.defaultDuration = 5000; // 5 seconds
    this.init();
  }

  /**
   * تهيئة حاوية الإشعارات
   */
  init() {
    // إنشاء حاوية الإشعارات إذا لم تكن موجودة
    this.container = document.getElementById('notification-container');
    
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notification-container';
      this.container.className = 'notification-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * عرض إشعار
   * @param {string} message - نص الإشعار
   * @param {string} type - نوع الإشعار (success, error, warning, info)
   * @param {number} duration - مدة عرض الإشعار بالميلي ثانية (0 = لا يختفي تلقائياً)
   * @returns {HTMLElement} عنصر الإشعار
   */
  show(message, type = 'info', duration = null) {
    // استخدام المدة الافتراضية إذا لم تحدد
    if (duration === null) {
      duration = this.defaultDuration;
    }

    // إنشاء عنصر الإشعار
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // الحصول على الأيقونة المناسبة
    const icon = this.getIcon(type);
    
    // بناء محتوى الإشعار
    notification.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${message}</span>
      <button class="notification-close" aria-label="إغلاق">
        <i class="fas fa-times"></i>
      </button>
    `;

    // إضافة حدث الإغلاق
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.remove(notification);
    });

    // إضافة الإشعار للحاوية
    this.container.appendChild(notification);
    this.notifications.push(notification);

    // إزالة الإشعارات الزائدة
    this.limitNotifications();

    // تفعيل الأنيميشن
    setTimeout(() => {
      notification.classList.add('notification-show');
    }, 10);

    // إخفاء تلقائي بعد المدة المحددة
    if (duration > 0) {
      setTimeout(() => {
        this.remove(notification);
      }, duration);
    }

    return notification;
  }

  /**
   * إزالة إشعار
   * @param {HTMLElement} notification - عنصر الإشعار
   */
  remove(notification) {
    if (!notification || !notification.parentElement) {
      return;
    }

    // إضافة أنيميشن الاختفاء
    notification.classList.add('notification-fade-out');

    // إزالة من DOM بعد انتهاء الأنيميشن
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
      
      // إزالة من المصفوفة
      const index = this.notifications.indexOf(notification);
      if (index > -1) {
        this.notifications.splice(index, 1);
      }
    }, 300);
  }

  /**
   * الحصول على الأيقونة المناسبة حسب النوع
   * @param {string} type - نوع الإشعار
   * @returns {string} اسم الأيقونة
   */
  getIcon(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  /**
   * تحديد عدد الإشعارات المعروضة
   */
  limitNotifications() {
    while (this.notifications.length > this.maxNotifications) {
      const oldest = this.notifications[0];
      this.remove(oldest);
    }
  }

  /**
   * إشعار نجاح
   * @param {string} message - نص الإشعار
   * @param {number} duration - مدة العرض
   * @returns {HTMLElement} عنصر الإشعار
   */
  success(message, duration = null) {
    return this.show(message, 'success', duration);
  }

  /**
   * إشعار خطأ
   * @param {string} message - نص الإشعار
   * @param {number} duration - مدة العرض
   * @returns {HTMLElement} عنصر الإشعار
   */
  error(message, duration = null) {
    return this.show(message, 'error', duration);
  }

  /**
   * إشعار تحذير
   * @param {string} message - نص الإشعار
   * @param {number} duration - مدة العرض
   * @returns {HTMLElement} عنصر الإشعار
   */
  warning(message, duration = null) {
    return this.show(message, 'warning', duration);
  }

  /**
   * إشعار معلومات
   * @param {string} message - نص الإشعار
   * @param {number} duration - مدة العرض
   * @returns {HTMLElement} عنصر الإشعار
   */
  info(message, duration = null) {
    return this.show(message, 'info', duration);
  }

  /**
   * مسح جميع الإشعارات
   */
  clearAll() {
    // نسخ المصفوفة لتجنب مشاكل التعديل أثناء التكرار
    const notificationsCopy = [...this.notifications];
    notificationsCopy.forEach(notification => {
      this.remove(notification);
    });
  }

  /**
   * تعيين المدة الافتراضية
   * @param {number} duration - المدة بالميلي ثانية
   */
  setDefaultDuration(duration) {
    this.defaultDuration = duration;
  }

  /**
   * تعيين الحد الأقصى للإشعارات
   * @param {number} max - الحد الأقصى
   */
  setMaxNotifications(max) {
    this.maxNotifications = max;
    this.limitNotifications();
  }
}

// إنشاء instance عام (Singleton)
window.notificationManager = new NotificationManager();

// Alias للتوافق مع الكود الموجود
window.notifications = window.notificationManager;
