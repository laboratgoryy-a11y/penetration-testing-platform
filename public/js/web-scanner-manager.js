/**
 * Web Scanner Section Manager - إدارة قسم فحص الويب
 * المسؤول عن عرض وإدارة عمليات فحص الويب
 */

class WebScannerManager {
  constructor() {
    this.scans = [];
    this.currentScanId = null;
    this.pollingIntervals = new Map();
  }

  /**
   * تهيئة Web Scanner Manager
   */
  initialize() {
    window.appLogger?.debug('✓ Web Scanner Manager initialized');
  }

  /**
   * تحميل قائمة الفحوصات
   */
  async loadScans() {
    try {
      window.showLoading();
      window.appLogger?.debug('Loading web scans...');
      
      const response = await api.getScans();
      window.appLogger?.debug('Scans response:', response);
      
      if (!response || !response.success) {
        throw new Error(response?.error?.message || 'فشل تحميل الفحوصات');
      }
      
      this.scans = response.data?.scans || response.data || [];
      window.appLogger?.debug('Loaded scans:', this.scans);
      
      this.renderScansList();
      
      // بدء polling للفحوصات النشطة
      this.startPollingActiveScans();
      
      window.hideLoading();
    } catch (error) {
      console.error('Error loading scans:', error);
      this.renderError('فشل تحميل عمليات الفحص: ' + error.message);
      window.hideLoading();
    }
  }

  /**
   * عرض قائمة الفحوصات
   */
  renderScansList() {
    const container = document.getElementById('scansList');
    if (!container) {
      console.error('Scans list container not found');
      return;
    }

    
    if (!this.scans || this.scans.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search" style="font-size: 64px; color: #d1d5db; margin-bottom: 20px;"></i>
          <h3>لا توجد عمليات فحص</h3>
          <p style="color: #6b7280; margin-bottom: 20px;">ابدأ أول عملية فحص للمواقع</p>
          <button class="btn-primary" onclick="window.operationsManager.showOperationForm('web-scan')">
            <i class="fas fa-plus"></i> بدء فحص جديد
          </button>
        </div>
      `;
      return;
    }

    const scansHtml = this.scans.map(scan => this.renderScanCard(scan)).join('');
    container.innerHTML = `
      <div class="scans-grid" style="display: grid; gap: 20px;">
        ${scansHtml}
      </div>
    `;
  }

  /**
   * عرض بطاقة فحص واحد
   */
  renderScanCard(scan) {
    const statusInfo = this.getStatusInfo(scan.status);
    const progress = this.calculateProgress(scan);
    
    return `
      <div class="scan-card" data-scan-id="${scan.id}">
        <div class="scan-card-header">
          <div class="scan-icon ${statusInfo.color}">
            <i class="fas fa-globe"></i>
          </div>
          <div class="scan-info">
            <h3 class="scan-url">${this.truncateUrl(scan.target_url || scan.targetUrl)}</h3>
            <p class="scan-meta">
              <span class="status-badge ${statusInfo.color}">
                <i class="fas ${statusInfo.icon}"></i>
                ${statusInfo.text}
              </span>
              <span class="scan-time">
                <i class="fas fa-clock"></i>
                ${this.formatDate(scan.started_at || scan.createdAt)}
              </span>
            </p>
          </div>
        </div>
        
        ${scan.status === 'RUNNING' ? `
          <div class="scan-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <p class="progress-text">${progress}% مكتمل</p>
          </div>
        ` : ''}
        
        <div class="scan-stats">
          <div class="stat-item">
            <i class="fas fa-bug"></i>
            <span>${scan.total_vulnerabilities || 0}</span>
            <small>ثغرات</small>
          </div>
          <div class="stat-item">
            <i class="fas fa-link"></i>
            <span>${scan.urls_scanned || 0}</span>
            <small>صفحات</small>
          </div>
          <div class="stat-item">
            <i class="fas fa-clock"></i>
            <span>${this.formatDuration(scan.started_at, scan.completed_at)}</span>
            <small>المدة</small>
          </div>
        </div>
        
        <div class="scan-actions">
          <button class="btn-secondary btn-sm" onclick="window.webScannerManager.loadScanDetails('${scan.id}')">
            <i class="fas fa-eye"></i> عرض التفاصيل
          </button>
          ${scan.status === 'RUNNING' ? `
            <button class="btn-danger btn-sm" onclick="window.webScannerManager.stopScan('${scan.id}')">
              <i class="fas fa-stop"></i> إيقاف
            </button>
          ` : ''}
          ${scan.status === 'COMPLETED' ? `
            <button class="btn-primary btn-sm" onclick="window.webScannerManager.downloadReport('${scan.id}')">
              <i class="fas fa-download"></i> تحميل التقرير
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  /**
   * تحميل تفاصيل الفحص
   */
  async loadScanDetails(scanId) {
    try {
      window.showLoading();
      this.currentScanId = scanId;
      
      const [scanResponse, vulnsResponse] = await Promise.all([
        api.getScan(scanId),
        api.getScanVulnerabilities(scanId)
      ]);
      
      if (!scanResponse.success) {
        throw new Error('فشل تحميل تفاصيل الفحص');
      }
      
      const scan = scanResponse.data;
      const vulnerabilities = vulnsResponse.success ? vulnsResponse.data : [];
      
      this.renderScanDetails(scan, vulnerabilities);
      window.hideLoading();
    } catch (error) {
      console.error('Error loading scan details:', error);
      window.notificationManager?.error('فشل تحميل التفاصيل: ' + error.message);
      window.hideLoading();
    }
  }

  /**
   * عرض تفاصيل الفحص في modal
   */
  renderScanDetails(scan, vulnerabilities) {
    const statusInfo = this.getStatusInfo(scan.status);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
          <h2>
            <i class="fas fa-globe"></i>
            تفاصيل الفحص
          </h2>
          <button class="btn-icon" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <!-- معلومات الفحص -->
          <div class="scan-details-info">
            <div class="info-grid">
              <div class="info-item">
                <label><i class="fas fa-link"></i> الهدف</label>
                <p>${scan.target_url || scan.targetUrl}</p>
              </div>
              <div class="info-item">
                <label><i class="fas fa-flag"></i> الحالة</label>
                <p>
                  <span class="status-badge ${statusInfo.color}">
                    <i class="fas ${statusInfo.icon}"></i>
                    ${statusInfo.text}
                  </span>
                </p>
              </div>
              <div class="info-item">
                <label><i class="fas fa-calendar"></i> بدأ في</label>
                <p>${this.formatDate(scan.started_at || scan.createdAt)}</p>
              </div>
              ${scan.completed_at ? `
                <div class="info-item">
                  <label><i class="fas fa-check-circle"></i> انتهى في</label>
                  <p>${this.formatDate(scan.completed_at)}</p>
                </div>
              ` : ''}
              <div class="info-item">
                <label><i class="fas fa-bug"></i> الثغرات</label>
                <p><strong style="font-size: 24px; color: var(--red);">${scan.total_vulnerabilities || 0}</strong></p>
              </div>
              <div class="info-item">
                <label><i class="fas fa-link"></i> الصفحات</label>
                <p><strong style="font-size: 24px; color: var(--blue);">${scan.urls_scanned || 0}</strong></p>
              </div>
            </div>
          </div>

          <!-- الثغرات المكتشفة -->
          <div class="vulnerabilities-section" style="margin-top: 30px;">
            <h3 style="margin-bottom: 15px;">
              <i class="fas fa-exclamation-triangle"></i>
              الثغرات المكتشفة (${vulnerabilities.length})
            </h3>
            ${this.renderVulnerabilitiesTable(vulnerabilities)}
          </div>
        </div>
        <div class="modal-footer">
          ${scan.status === 'COMPLETED' ? `
            <button class="btn-primary" onclick="window.webScannerManager.downloadReport('${scan.id}')">
              <i class="fas fa-download"></i> تحميل التقرير
            </button>
          ` : ''}
          <button class="btn-secondary" onclick="this.closest('.modal').remove()">
            إغلاق
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // إغلاق عند النقر خارج المحتوى
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  /**
   * عرض جدول الثغرات
   */
  renderVulnerabilitiesTable(vulnerabilities) {
    if (!vulnerabilities || vulnerabilities.length === 0) {
      return `
        <div class="empty-state" style="padding: 40px;">
          <i class="fas fa-shield-alt" style="font-size: 48px; color: #10b981;"></i>
          <p style="color: #10b981; margin-top: 10px;">لم يتم اكتشاف ثغرات! 🎉</p>
        </div>
      `;
    }

    return `
      <div class="vulnerabilities-table-container">
        <table class="vulnerabilities-table">
          <thead>
            <tr>
              <th>النوع</th>
              <th>الخطورة</th>
              <th>الموقع</th>
              <th>الوصف</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${vulnerabilities.map(vuln => `
              <tr>
                <td>
                  <span class="vuln-type">
                    <i class="fas fa-bug"></i>
                    ${vuln.type || vuln.vulnerability_type}
                  </span>
                </td>
                <td>
                  <span class="severity-badge ${this.getSeverityClass(vuln.severity)}">
                    ${this.translateSeverity(vuln.severity)}
                  </span>
                </td>
                <td>
                  <small style="color: #666;">${this.truncateUrl(vuln.url || vuln.location, 40)}</small>
                </td>
                <td>
                  <small>${vuln.description || 'لا يوجد وصف'}</small>
                </td>
                <td>
                  <button class="btn-icon" onclick="window.webScannerManager.showVulnerabilityDetails('${vuln.id}')" title="عرض التفاصيل">
                    <i class="fas fa-info-circle"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * إيقاف الفحص
   */
  async stopScan(scanId) {
    if (!confirm('هل أنت متأكد من إيقاف هذا الفحص؟')) {
      return;
    }

    try {
      window.showLoading();
      const response = await api.stopScan(scanId);
      
      if (response.success) {
        window.notificationManager?.success('تم إيقاف الفحص بنجاح');
        this.stopPolling(scanId);
        await this.loadScans();
      } else {
        throw new Error(response.error?.message || 'فشل إيقاف الفحص');
      }
    } catch (error) {
      console.error('Error stopping scan:', error);
      window.notificationManager?.error('فشل إيقاف الفحص: ' + error.message);
    } finally {
      window.hideLoading();
    }
  }

  /**
   * تحميل التقرير
   */
  async downloadReport(scanId) {
    try {
      window.showLoading();
      window.notificationManager?.info('جاري تحميل التقرير...');
      await api.getScanReport(scanId, 'pdf');
      window.notificationManager?.success('تم تحميل التقرير بنجاح');
    } catch (error) {
      console.error('Error downloading report:', error);
      window.notificationManager?.error('فشل تحميل التقرير: ' + error.message);
    } finally {
      window.hideLoading();
    }
  }

  /**
   * بدء polling للفحوصات النشطة
   */
  startPollingActiveScans() {
    // إيقاف أي polling سابق
    this.stopAllPolling();
    
    // بدء polling للفحوصات النشطة
    this.scans.forEach(scan => {
      if (scan.status === 'RUNNING' || scan.status === 'PENDING') {
        this.startPolling(scan.id);
      }
    });
  }

  /**
   * بدء polling لفحص معين
   */
  startPolling(scanId) {
    // إيقاف أي polling سابق لهذا الفحص
    this.stopPolling(scanId);
    
    // بدء polling جديد كل 10 ثوان
    const intervalId = setInterval(async () => {
      try {
        const response = await api.getScanStatus(scanId);
        if (response.success) {
          const status = response.data.status;
          
          // إذا انتهى الفحص، إيقاف polling وتحديث القائمة
          if (status === 'COMPLETED' || status === 'FAILED' || status === 'STOPPED') {
            this.stopPolling(scanId);
            await this.loadScans();
            window.notificationManager?.info(`الفحص ${status === 'COMPLETED' ? 'اكتمل' : 'توقف'}`);
          } else {
            // تحديث بطاقة الفحص
            this.updateScanCard(scanId, response.data);
          }
        }
      } catch (error) {
        console.error('Error polling scan status:', error);
      }
    }, 10000); // كل 10 ثوان
    
    this.pollingIntervals.set(scanId, intervalId);
  }

  /**
   * إيقاف polling لفحص معين
   */
  stopPolling(scanId) {
    const intervalId = this.pollingIntervals.get(scanId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(scanId);
    }
  }

  /**
   * إيقاف جميع polling
   */
  stopAllPolling() {
    this.pollingIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.pollingIntervals.clear();
  }

  /**
   * تحديث بطاقة الفحص
   */
  updateScanCard(scanId, data) {
    const card = document.querySelector(`[data-scan-id="${scanId}"]`);
    if (!card) return;
    
    // تحديث الحالة
    const statusBadge = card.querySelector('.status-badge');
    if (statusBadge && data.status) {
      const statusInfo = this.getStatusInfo(data.status);
      statusBadge.className = `status-badge ${statusInfo.color}`;
      statusBadge.innerHTML = `<i class="fas ${statusInfo.icon}"></i> ${statusInfo.text}`;
    }
    
    // تحديث الإحصائيات
    if (data.total_vulnerabilities !== undefined) {
      const vulnStat = card.querySelector('.stat-item:first-child span');
      if (vulnStat) vulnStat.textContent = data.total_vulnerabilities;
    }
    
    if (data.urls_scanned !== undefined) {
      const urlsStat = card.querySelector('.stat-item:nth-child(2) span');
      if (urlsStat) urlsStat.textContent = data.urls_scanned;
    }
  }

  /**
   * دوال مساعدة
   */
  
  getStatusInfo(status) {
    const statusMap = {
      'PENDING': { text: 'قيد الانتظار', color: 'orange', icon: 'fa-clock' },
      'RUNNING': { text: 'قيد التشغيل', color: 'blue', icon: 'fa-spinner fa-spin' },
      'COMPLETED': { text: 'مكتمل', color: 'green', icon: 'fa-check-circle' },
      'FAILED': { text: 'فشل', color: 'red', icon: 'fa-times-circle' },
      'STOPPED': { text: 'متوقف', color: 'gray', icon: 'fa-stop-circle' }
    };
    return statusMap[status] || statusMap['PENDING'];
  }

  getSeverityClass(severity) {
    const severityMap = {
      'CRITICAL': 'critical',
      'HIGH': 'high',
      'MEDIUM': 'medium',
      'LOW': 'low',
      'INFO': 'info'
    };
    return severityMap[severity] || 'info';
  }

  translateSeverity(severity) {
    const translations = {
      'CRITICAL': 'حرجة',
      'HIGH': 'عالية',
      'MEDIUM': 'متوسطة',
      'LOW': 'منخفضة',
      'INFO': 'معلومات'
    };
    return translations[severity] || severity;
  }

  calculateProgress(scan) {
    if (scan.status === 'COMPLETED') return 100;
    if (scan.status === 'PENDING') return 0;
    if (scan.status === 'RUNNING') {
      // حساب تقريبي بناءً على عدد الصفحات
      const scanned = scan.urls_scanned || 0;
      const estimated = Math.max(scanned * 1.5, 100);
      return Math.min(Math.round((scanned / estimated) * 100), 95);
    }
    return 0;
  }

  truncateUrl(url, maxLength = 50) {
    if (!url) return 'غير محدد';
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  }

  formatDate(dateString) {
    if (!dateString) return 'غير محدد';
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(startDate, endDate) {
    if (!startDate) return '-';
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diff = Math.floor((end - start) / 1000); // بالثواني
    
    if (diff < 60) return `${diff}ث`;
    if (diff < 3600) return `${Math.floor(diff / 60)}د`;
    return `${Math.floor(diff / 3600)}س ${Math.floor((diff % 3600) / 60)}د`;
  }

  renderError(message) {
    const container = document.getElementById('scansList');
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #f59e0b;"></i>
          <h3>حدث خطأ</h3>
          <p style="color: #6b7280;">${message}</p>
          <button class="btn-primary" onclick="window.webScannerManager.loadScans()">
            <i class="fas fa-redo"></i> إعادة المحاولة
          </button>
        </div>
      `;
    }
  }

  showVulnerabilityDetails(vulnId) {
    window.notificationManager?.info('عرض تفاصيل الثغرة: ' + vulnId);
  }

  /**
   * تنظيف عند مغادرة الصفحة
   */
  cleanup() {
    this.stopAllPolling();
  }
}

// تصدير الـ class للاستخدام العام
if (typeof window !== 'undefined') {
  window.WebScannerManager = WebScannerManager;
}


