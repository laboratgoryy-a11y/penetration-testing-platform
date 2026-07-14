// Audit Logger Manager - مدير سجلات التدقيق
class AuditLoggerManager {
  constructor(apiClient, stateManager) {
    this.apiClient = apiClient;
    this.stateManager = stateManager;
    this.currentFilters = {};
    this.currentPage = 1;
    this.pageSize = 50;
    this.pollingInterval = null;
  }

  /**
   * تهيئة مدير سجلات التدقيق
   */
  async initialize() {
    // تحميل السجلات الأولية
    await this.loadAuditLogs();
    
    // إعداد معالجات الأحداث
    this.setupEventHandlers();
    
    // الاشتراك في تغييرات الحالة
    this.stateManager.subscribe((state) => {
      if (state.auditLogs) {
        this.renderAuditLogs(state.auditLogs);
      }
    });
  }

  /**
   * تحميل سجلات التدقيق من الخادم
   */
  async loadAuditLogs(filters = {}) {
    try {
      this.stateManager.updateState({ loading: true, error: null });
      
      // دمج الفلاتر مع الصفحة الحالية
      const params = {
        ...filters,
        page: this.currentPage,
        limit: this.pageSize
      };
      
      const response = await this.apiClient.getAuditLogs(params);
      
      this.stateManager.updateState({
        auditLogs: {
          logs: response.data || response.logs || [],
          total: response.total || 0,
          page: this.currentPage,
          pageSize: this.pageSize,
          lastUpdate: new Date()
        },
        loading: false
      });
      
      return response;
    } catch (error) {
      console.error('Error loading audit logs:', error);
      this.stateManager.updateState({
        loading: false,
        error: error.message
      });
      window.notificationManager?.error(error.message);
      throw error;
    }
  }

  /**
   * إعداد معالجات الأحداث
   */
  setupEventHandlers() {
    // معالج نموذج الفلترة
    const filterForm = document.getElementById('audit-filter-form');
    if (filterForm) {
      filterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.applyFilters();
      });
    }

    // معالج زر إعادة التعيين
    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetFilters();
      });
    }

    // معالج زر التصدير
    const exportBtn = document.getElementById('export-logs-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportLogs();
      });
    }

    // معالج تغيير حجم الصفحة
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        this.pageSize = parseInt(e.target.value);
        this.currentPage = 1;
        this.loadAuditLogs(this.currentFilters);
      });
    }
  }

  /**
   * تطبيق الفلاتر
   */
  async applyFilters() {
    const filters = {};
    
    // الحصول على قيم الفلاتر من النموذج
    const eventType = document.getElementById('filter-event-type')?.value;
    const userId = document.getElementById('filter-user-id')?.value;
    const startDate = document.getElementById('filter-start-date')?.value;
    const endDate = document.getElementById('filter-end-date')?.value;
    const result = document.getElementById('filter-result')?.value;
    
    if (eventType) filters.eventType = eventType;
    if (userId) filters.userId = userId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (result) filters.result = result;
    
    this.currentFilters = filters;
    this.currentPage = 1;
    
    await this.loadAuditLogs(filters);
  }

  /**
   * إعادة تعيين الفلاتر
   */
  async resetFilters() {
    // إعادة تعيين النموذج
    const filterForm = document.getElementById('audit-filter-form');
    if (filterForm) {
      filterForm.reset();
    }
    
    this.currentFilters = {};
    this.currentPage = 1;
    
    await this.loadAuditLogs();
  }

  /**
   * تصدير السجلات
   */
  async exportLogs() {
    try {
      window.notificationManager?.info('جاري تصدير السجلات...');
      
      // الحصول على صيغة التصدير
      const format = document.getElementById('export-format')?.value || 'csv';
      
      await this.apiClient.exportAuditLogs(format);
      
      window.notificationManager?.success('تم تصدير السجلات بنجاح');
    } catch (error) {
      console.error('Error exporting logs:', error);
      window.notificationManager?.error('فشل تصدير السجلات: ' + error.message);
    }
  }

  /**
   * عرض سجلات التدقيق
   */
  renderAuditLogs(auditLogsData) {
    const container = document.getElementById('audit-logs-list');
    if (!container) return;
    
    const logs = auditLogsData.logs || [];
    
    if (logs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>لا توجد سجلات تدقيق</p>
        </div>
      `;
      return;
    }
    
    // إنشاء جدول السجلات
    const table = document.createElement('table');
    table.className = 'audit-logs-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>الوقت</th>
          <th>المستخدم</th>
          <th>نوع الحدث</th>
          <th>المورد</th>
          <th>الإجراء</th>
          <th>النتيجة</th>
          <th>الأولوية</th>
          <th>التفاصيل</th>
        </tr>
      </thead>
      <tbody>
        ${logs.map(log => this.renderLogRow(log)).join('')}
      </tbody>
    `;
    
    container.innerHTML = '';
    container.appendChild(table);
    
    // عرض معلومات الصفحة
    this.renderPagination(auditLogsData);
    
    // عرض آخر تحديث
    this.updateLastUpdateTime(auditLogsData.lastUpdate);
  }

  /**
   * عرض صف سجل واحد
   */
  renderLogRow(log) {
    const priorityClass = this.getPriorityClass(log.priority || log.severity);
    const resultClass = this.getResultClass(log.result);
    
    return `
      <tr class="log-row ${priorityClass}" data-log-id="${log.id}">
        <td class="log-timestamp">${this.formatTimestamp(log.timestamp || log.created_at)}</td>
        <td class="log-user">${this.escapeHtml(log.user_email || log.userId || 'N/A')}</td>
        <td class="log-event-type">${this.escapeHtml(log.event_type || log.eventType || 'N/A')}</td>
        <td class="log-resource">${this.escapeHtml(log.resource_type || log.resourceType || 'N/A')}</td>
        <td class="log-action">${this.escapeHtml(log.action || 'N/A')}</td>
        <td class="log-result ${resultClass}">${this.escapeHtml(log.result || 'N/A')}</td>
        <td class="log-priority ${priorityClass}">${this.translatePriority(log.priority || log.severity)}</td>
        <td class="log-details">
          <button class="btn-small" onclick="auditLoggerManager.showLogDetails('${log.id}')">
            عرض التفاصيل
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * عرض تفاصيل السجل
   */
  showLogDetails(logId) {
    const state = this.stateManager.getState();
    const log = state.auditLogs?.logs?.find(l => l.id === logId);
    
    if (!log) {
      window.notificationManager?.error('لم يتم العثور على السجل');
      return;
    }
    
    // إنشاء modal لعرض التفاصيل
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>تفاصيل السجل</h3>
          <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="log-detail-grid">
            <div class="detail-item">
              <strong>الوقت:</strong>
              <span>${this.formatTimestamp(log.timestamp || log.created_at)}</span>
            </div>
            <div class="detail-item">
              <strong>المستخدم:</strong>
              <span>${this.escapeHtml(log.user_email || log.userId || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <strong>نوع الحدث:</strong>
              <span>${this.escapeHtml(log.event_type || log.eventType || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <strong>المورد:</strong>
              <span>${this.escapeHtml(log.resource_type || log.resourceType || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <strong>معرف المورد:</strong>
              <span>${this.escapeHtml(log.resource_id || log.resourceId || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <strong>الإجراء:</strong>
              <span>${this.escapeHtml(log.action || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <strong>النتيجة:</strong>
              <span class="${this.getResultClass(log.result)}">${this.escapeHtml(log.result || 'N/A')}</span>
            </div>
            <div class="detail-item">
              <strong>الأولوية:</strong>
              <span class="${this.getPriorityClass(log.priority || log.severity)}">${this.translatePriority(log.priority || log.severity)}</span>
            </div>
            ${log.ip_address ? `
              <div class="detail-item">
                <strong>عنوان IP:</strong>
                <span>${this.escapeHtml(log.ip_address)}</span>
              </div>
            ` : ''}
            ${log.details ? `
              <div class="detail-item full-width">
                <strong>التفاصيل الإضافية:</strong>
                <pre>${this.escapeHtml(JSON.stringify(log.details, null, 2))}</pre>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
  }

  /**
   * عرض الترقيم
   */
  renderPagination(auditLogsData) {
    const paginationContainer = document.getElementById('audit-logs-pagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(auditLogsData.total / this.pageSize);
    
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }
    
    let html = '<div class="pagination">';
    
    // زر السابق
    if (this.currentPage > 1) {
      html += `<button onclick="auditLoggerManager.goToPage(${this.currentPage - 1})">السابق</button>`;
    }
    
    // أرقام الصفحات
    for (let i = 1; i <= totalPages; i++) {
      if (i === this.currentPage) {
        html += `<button class="active">${i}</button>`;
      } else if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
        html += `<button onclick="auditLoggerManager.goToPage(${i})">${i}</button>`;
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        html += '<span>...</span>';
      }
    }
    
    // زر التالي
    if (this.currentPage < totalPages) {
      html += `<button onclick="auditLoggerManager.goToPage(${this.currentPage + 1})">التالي</button>`;
    }
    
    html += '</div>';
    html += `<div class="pagination-info">الصفحة ${this.currentPage} من ${totalPages} (إجمالي ${auditLogsData.total} سجل)</div>`;
    
    paginationContainer.innerHTML = html;
  }

  /**
   * الانتقال إلى صفحة معينة
   */
  async goToPage(page) {
    this.currentPage = page;
    await this.loadAuditLogs(this.currentFilters);
  }

  /**
   * تحديث وقت آخر تحديث
   */
  updateLastUpdateTime(lastUpdate) {
    const element = document.getElementById('audit-logs-last-update');
    if (element && lastUpdate) {
      element.textContent = `آخر تحديث: ${this.formatTime(lastUpdate)}`;
    }
  }

  /**
   * تنسيق الوقت
   */
  formatTime(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return new Intl.DateTimeFormat('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(d);
  }

  /**
   * تنسيق الطابع الزمني
   */
  formatTimestamp(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  }

  /**
   * الحصول على فئة CSS للأولوية
   */
  getPriorityClass(priority) {
    if (!priority) return '';
    const p = priority.toLowerCase();
    if (p === 'high' || p === 'critical') return 'priority-high';
    if (p === 'medium') return 'priority-medium';
    return 'priority-low';
  }

  /**
   * الحصول على فئة CSS للنتيجة
   */
  getResultClass(result) {
    if (!result) return '';
    const r = result.toLowerCase();
    if (r === 'success') return 'result-success';
    if (r === 'failure' || r === 'failed') return 'result-failure';
    return '';
  }

  /**
   * ترجمة الأولوية
   */
  translatePriority(priority) {
    if (!priority) return 'N/A';
    const translations = {
      'low': 'منخفضة',
      'medium': 'متوسطة',
      'high': 'عالية',
      'critical': 'حرجة'
    };
    return translations[priority.toLowerCase()] || priority;
  }

  /**
   * تنظيف HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * عرض إشعار
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  }

  /**
   * تنظيف الموارد
   */
  destroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

// تصدير للاستخدام العام
if (typeof window !== 'undefined') {
  window.AuditLoggerManager = AuditLoggerManager;
}
