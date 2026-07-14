/**
 * Phishing Campaign Section Manager - إدارة قسم حملات التصيد
 * المسؤول عن عرض وإدارة حملات التصيد الاحترافية
 */

class PhishingCampaignManager {
  constructor() {
    this.campaigns = [];
    this.currentCampaignId = null;
    this.pollingIntervals = new Map();
  }

  /**
   * تهيئة Phishing Campaign Manager
   */
  initialize() {
    window.appLogger?.debug('✓ Phishing Campaign Manager initialized');
  }

  /**
   * تحميل قائمة الحملات
   */
  async loadCampaigns() {
    try {
      window.showLoading();
      window.appLogger?.debug('Loading phishing campaigns...');
      
      const response = await api.getCampaigns();
      window.appLogger?.debug('Campaigns response:', response);
      
      if (!response || !response.success) {
        throw new Error(response?.error?.message || 'فشل تحميل الحملات');
      }
      
      this.campaigns = response.data?.campaigns || response.data || [];
      window.appLogger?.debug('Loaded campaigns:', this.campaigns);
      
      this.renderCampaignsList();
      
      // بدء polling للحملات النشطة
      this.startPollingActiveCampaigns();
      
      window.hideLoading();
    } catch (error) {
      console.error('Error loading campaigns:', error);
      this.renderError('فشل تحميل حملات التصيد: ' + error.message);
      window.hideLoading();
    }
  }

  /**
   * عرض قائمة الحملات
   */
  renderCampaignsList() {
    const container = document.getElementById('campaignsList');
    if (!container) {
      console.error('Campaigns list container not found');
      return;
    }

    if (!this.campaigns || this.campaigns.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-fish" style="font-size: 64px; color: #d1d5db; margin-bottom: 20px;"></i>
          <h3>لا توجد حملات تصيد</h3>
          <p style="color: #6b7280; margin-bottom: 20px;">ابدأ أول حملة تصيد تعليمية</p>
          <button class="btn-primary" onclick="window.operationsManager.showOperationForm('phishing')">
            <i class="fas fa-plus"></i> إنشاء حملة جديدة
          </button>
        </div>
      `;
      return;
    }

    const campaignsHtml = this.campaigns.map(campaign => this.renderCampaignCard(campaign)).join('');
    container.innerHTML = `
      <div class="campaigns-grid" style="display: grid; gap: 20px;">
        ${campaignsHtml}
      </div>
    `;
  }

  /**
   * عرض بطاقة حملة واحدة
   */
  renderCampaignCard(campaign) {
    const statusInfo = this.getStatusInfo(campaign.status);
    const stats = this.calculateStats(campaign);
    
    return `
      <div class="campaign-card" data-campaign-id="${campaign.id}">
        <div class="campaign-card-header">
          <div class="campaign-icon ${statusInfo.color}">
            <i class="fas fa-fish"></i>
          </div>
          <div class="campaign-info">
            <h3 class="campaign-name">${campaign.name || 'حملة بدون اسم'}</h3>
            <p class="campaign-meta">
              <span class="status-badge ${statusInfo.color}">
                <i class="fas ${statusInfo.icon}"></i>
                ${statusInfo.text}
              </span>
              <span class="campaign-date">
                <i class="fas fa-calendar"></i>
                ${this.formatDate(campaign.created_at || campaign.createdAt)}
              </span>
            </p>
          </div>
        </div>
        
        <div class="campaign-card-body">
          <div class="campaign-stats">
            <div class="stat-item">
              <div class="stat-icon blue">
                <i class="fas fa-paper-plane"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">${stats.sent}</span>
                <span class="stat-label">مُرسل</span>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon green">
                <i class="fas fa-envelope-open"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">${stats.opened}</span>
                <span class="stat-label">مفتوح</span>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon orange">
                <i class="fas fa-mouse-pointer"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">${stats.clicked}</span>
                <span class="stat-label">نقر</span>
              </div>
            </div>
            
            <div class="stat-item">
              <div class="stat-icon red">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <div class="stat-info">
                <span class="stat-value">${stats.submitted}</span>
                <span class="stat-label">أدخل بيانات</span>
              </div>
            </div>
          </div>
          
          ${stats.sent > 0 ? `
            <div class="campaign-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${stats.clickRate}%; background: #f59e0b;"></div>
              </div>
              <span class="progress-label">معدل النقر: ${stats.clickRate}%</span>
            </div>
          ` : ''}
        </div>
        
        <div class="campaign-card-footer">
          <button class="btn-secondary btn-sm" onclick="window.phishingCampaignManager.viewCampaignDetails('${campaign.id}')">
            <i class="fas fa-eye"></i>
            عرض التفاصيل
          </button>
          ${campaign.status === 'ACTIVE' ? `
            <button class="btn-danger btn-sm" onclick="window.phishingCampaignManager.stopCampaign('${campaign.id}')">
              <i class="fas fa-stop"></i>
              إيقاف
            </button>
          ` : ''}
          <button class="btn-secondary btn-sm" onclick="window.phishingCampaignManager.downloadReport('${campaign.id}')">
            <i class="fas fa-download"></i>
            تقرير
          </button>
        </div>
      </div>
    `;
  }

  /**
   * عرض تفاصيل حملة محددة
   */
  async viewCampaignDetails(campaignId) {
    try {
      window.showLoading();
      this.currentCampaignId = campaignId;
      
      // تحميل تفاصيل الحملة
      const response = await api.getCampaign(campaignId);
      if (!response || !response.success) {
        throw new Error('فشل تحميل تفاصيل الحملة');
      }
      
      const campaign = response.data;
      
      // تحميل الأهداف والتفاعلات
      const targetsResponse = await api.getCampaignTargets(campaignId);
      const targets = targetsResponse.success ? targetsResponse.data : [];
      
      const interactionsResponse = await api.getCampaignInteractions(campaignId);
      const interactions = interactionsResponse.success ? interactionsResponse.data : [];
      
      this.renderCampaignDetails(campaign, targets, interactions);
      
      window.hideLoading();
    } catch (error) {
      console.error('Error loading campaign details:', error);
      window.notificationManager?.error('فشل تحميل تفاصيل الحملة: ' + error.message);
      window.hideLoading();
    }
  }

  /**
   * عرض تفاصيل الحملة في modal
   */
  renderCampaignDetails(campaign, targets, interactions) {
    const stats = this.calculateDetailedStats(targets, interactions);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 1000px;">
        <div class="modal-header">
          <h2>
            <i class="fas fa-fish"></i>
            ${campaign.name}
          </h2>
          <button class="btn-icon" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <!-- معلومات الحملة -->
          <div class="campaign-details-section">
            <h3><i class="fas fa-info-circle"></i> معلومات الحملة</h3>
            <div class="info-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 20px;">
              <div class="info-item">
                <label><i class="fas fa-flag"></i> الحالة</label>
                <p><span class="status-badge ${this.getStatusInfo(campaign.status).color}">${this.getStatusInfo(campaign.status).text}</span></p>
              </div>
              <div class="info-item">
                <label><i class="fas fa-envelope"></i> قالب البريد</label>
                <p>${campaign.email_template || campaign.emailTemplate || 'غير محدد'}</p>
              </div>
              <div class="info-item">
                <label><i class="fas fa-calendar"></i> تاريخ الإنشاء</label>
                <p>${this.formatDate(campaign.created_at || campaign.createdAt)}</p>
              </div>
              <div class="info-item">
                <label><i class="fas fa-users"></i> عدد الأهداف</label>
                <p>${targets.length}</p>
              </div>
            </div>
          </div>
          
          <!-- إحصائيات مفصلة -->
          <div class="campaign-details-section">
            <h3><i class="fas fa-chart-bar"></i> الإحصائيات</h3>
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
              <div class="stat-card">
                <div class="stat-icon blue"><i class="fas fa-paper-plane"></i></div>
                <div class="stat-value">${stats.sent}</div>
                <div class="stat-label">مُرسل</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon green"><i class="fas fa-envelope-open"></i></div>
                <div class="stat-value">${stats.opened}</div>
                <div class="stat-label">مفتوح (${stats.openRate}%)</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon orange"><i class="fas fa-mouse-pointer"></i></div>
                <div class="stat-value">${stats.clicked}</div>
                <div class="stat-label">نقر (${stats.clickRate}%)</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon red"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="stat-value">${stats.submitted}</div>
                <div class="stat-label">أدخل بيانات (${stats.submitRate}%)</div>
              </div>
            </div>
          </div>
          
          <!-- قائمة الأهداف -->
          <div class="campaign-details-section">
            <h3><i class="fas fa-users"></i> الأهداف (${targets.length})</h3>
            <div style="max-height: 400px; overflow-y: auto;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>البريد الإلكتروني</th>
                    <th>الحالة</th>
                    <th>تم الفتح</th>
                    <th>تم النقر</th>
                    <th>أدخل بيانات</th>
                    <th>آخر تفاعل</th>
                  </tr>
                </thead>
                <tbody>
                  ${targets.map(target => this.renderTargetRow(target, interactions)).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
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
   * عرض صف هدف في الجدول
   */
  renderTargetRow(target, interactions) {
    const targetInteractions = interactions.filter(i => i.target_id === target.id);
    const hasOpened = targetInteractions.some(i => i.interaction_type === 'EMAIL_OPENED');
    const hasClicked = targetInteractions.some(i => i.interaction_type === 'LINK_CLICKED');
    const hasSubmitted = targetInteractions.some(i => i.interaction_type === 'DATA_SUBMITTED');
    const lastInteraction = targetInteractions.length > 0 
      ? targetInteractions[targetInteractions.length - 1] 
      : null;
    
    return `
      <tr>
        <td>${target.email}</td>
        <td><span class="status-badge ${this.getTargetStatusColor(target.status)}">${this.translateTargetStatus(target.status)}</span></td>
        <td>${hasOpened ? '<i class="fas fa-check" style="color: green;"></i>' : '<i class="fas fa-times" style="color: #ccc;"></i>'}</td>
        <td>${hasClicked ? '<i class="fas fa-check" style="color: green;"></i>' : '<i class="fas fa-times" style="color: #ccc;"></i>'}</td>
        <td>${hasSubmitted ? '<i class="fas fa-exclamation-triangle" style="color: red;"></i>' : '<i class="fas fa-times" style="color: #ccc;"></i>'}</td>
        <td>${lastInteraction ? this.formatDate(lastInteraction.created_at) : '-'}</td>
      </tr>
    `;
  }

  /**
   * إيقاف حملة
   */
  async stopCampaign(campaignId) {
    if (!confirm('هل أنت متأكد من إيقاف هذه الحملة؟')) {
      return;
    }
    
    try {
      window.showLoading();
      const response = await api.stopCampaign(campaignId);
      
      if (response.success) {
        window.notificationManager?.success('تم إيقاف الحملة بنجاح');
        await this.loadCampaigns();
      } else {
        throw new Error(response.error?.message || 'فشل إيقاف الحملة');
      }
      
      window.hideLoading();
    } catch (error) {
      console.error('Error stopping campaign:', error);
      window.notificationManager?.error('فشل إيقاف الحملة: ' + error.message);
      window.hideLoading();
    }
  }

  /**
   * تحميل تقرير الحملة
   */
  async downloadReport(campaignId, format = 'pdf') {
    try {
      window.showLoading();
      await api.downloadCampaignReport(campaignId, format);
      window.notificationManager?.success('جاري تحميل التقرير...');
      window.hideLoading();
    } catch (error) {
      console.error('Error downloading report:', error);
      window.notificationManager?.error('فشل تحميل التقرير: ' + error.message);
      window.hideLoading();
    }
  }

  /**
   * بدء polling للحملات النشطة
   */
  startPollingActiveCampaigns() {
    // إيقاف polling السابق
    this.stopAllPolling();
    
    const activeCampaigns = this.campaigns.filter(c => c.status === 'ACTIVE');
    
    if (activeCampaigns.length > 0) {
      const intervalId = setInterval(() => {
        this.loadCampaigns();
      }, 10000); // كل 10 ثوانٍ
      
      this.pollingIntervals.set('active-campaigns', intervalId);
      window.appLogger?.debug('✓ Started polling for active campaigns');
    }
  }

  /**
   * إيقاف جميع عمليات polling
   */
  stopAllPolling() {
    this.pollingIntervals.forEach((intervalId, key) => {
      clearInterval(intervalId);
      window.appLogger?.debug(`✓ Stopped polling: ${key}`);
    });
    this.pollingIntervals.clear();
  }

  /**
   * حساب الإحصائيات
   */
  calculateStats(campaign) {
    const sent = campaign.total_targets || campaign.targets_count || 0;
    const opened = campaign.opened_count || 0;
    const clicked = campaign.clicked_count || 0;
    const submitted = campaign.submitted_count || 0;
    
    const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0;
    
    return { sent, opened, clicked, submitted, clickRate };
  }

  /**
   * حساب الإحصائيات المفصلة
   */
  calculateDetailedStats(targets, interactions) {
    const sent = targets.length;
    const opened = interactions.filter(i => i.interaction_type === 'EMAIL_OPENED').length;
    const clicked = interactions.filter(i => i.interaction_type === 'LINK_CLICKED').length;
    const submitted = interactions.filter(i => i.interaction_type === 'DATA_SUBMITTED').length;
    
    const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
    const clickRate = sent > 0 ? Math.round((clicked / sent) * 100) : 0;
    const submitRate = sent > 0 ? Math.round((submitted / sent) * 100) : 0;
    
    return { sent, opened, clicked, submitted, openRate, clickRate, submitRate };
  }

  /**
   * الحصول على معلومات الحالة
   */
  getStatusInfo(status) {
    const statusMap = {
      'PENDING': { text: 'قيد الانتظار', color: 'gray', icon: 'fa-clock' },
      'ACTIVE': { text: 'نشط', color: 'green', icon: 'fa-play' },
      'COMPLETED': { text: 'مكتمل', color: 'blue', icon: 'fa-check' },
      'STOPPED': { text: 'متوقف', color: 'red', icon: 'fa-stop' },
      'FAILED': { text: 'فشل', color: 'red', icon: 'fa-times' }
    };
    
    return statusMap[status] || { text: status, color: 'gray', icon: 'fa-question' };
  }

  /**
   * الحصول على لون حالة الهدف
   */
  getTargetStatusColor(status) {
    const colorMap = {
      'PENDING': 'gray',
      'SENT': 'blue',
      'DELIVERED': 'green',
      'FAILED': 'red'
    };
    return colorMap[status] || 'gray';
  }

  /**
   * ترجمة حالة الهدف
   */
  translateTargetStatus(status) {
    const translations = {
      'PENDING': 'قيد الانتظار',
      'SENT': 'مُرسل',
      'DELIVERED': 'تم التسليم',
      'FAILED': 'فشل'
    };
    return translations[status] || status;
  }

  /**
   * تنسيق التاريخ
   */
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * عرض رسالة خطأ
   */
  renderError(message) {
    const container = document.getElementById('campaignsList');
    if (container) {
      container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #ef4444; margin-bottom: 20px;"></i>
          <h3>حدث خطأ</h3>
          <p style="color: #6b7280;">${message}</p>
          <button class="btn-primary" onclick="window.phishingCampaignManager.loadCampaigns()">
            <i class="fas fa-redo"></i> إعادة المحاولة
          </button>
        </div>
      `;
    }
  }
}

// تصدير الـ class للاستخدام العام
if (typeof window !== 'undefined') {
  window.PhishingCampaignManager = PhishingCampaignManager;
}

