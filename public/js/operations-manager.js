/**
 * Operations Manager - إدارة العمليات التشغيلية
 * المسؤول عن إنشاء وإدارة العمليات (فحص ويب، حملات تصيد، تحليل شبكات)
 */

class OperationsManager {
  constructor() {
    this.currentModal = null;
    this.networkAnalysisPoller = null;
    this.networkDiscoveryPoller = null;
    this.discoveredNetworksCache = [];
    this.selectedDiscoveredNetwork = null;
    this.networkRuntimeReadiness = null;
  }

  /**
   * تهيئة Operations Manager
   */
  initialize() {
    window.appLogger?.debug('✓ Operations Manager initialized');
    this.setupEventListeners();
  }

  /**
   * إعداد event listeners
   */
  setupEventListeners() {
    // زر بدء عملية جديدة الرئيسي
    const btnNewOperation = document.getElementById('btn-new-operation');
    if (btnNewOperation) {
      btnNewOperation.addEventListener('click', () => this.showNewOperationModal());
    }

    // Quick action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.dataset.action;
        this.handleQuickAction(action);
      });
    });
  }

  /**
   * معالجة الإجراءات السريعة
   */
  handleQuickAction(action) {
    switch (action) {
      case 'new-scan':
        this.showOperationForm('web-scan');
        break;
      case 'new-campaign':
        this.showOperationForm('phishing');
        break;
      case 'network-test':
        this.showOperationForm('network');
        break;
      case 'generate-report':
        window.notificationManager.show('قريباً: توليد تقرير جديد', 'info');
        break;
      default:
        console.warn('Unknown action:', action);
    }
  }

  /**
   * عرض modal اختيار نوع العملية
   */
  showNewOperationModal() {
    try {
      window.appLogger?.debug('✓ Opening new operation modal...');
      
      // التحقق من وجود window.api
      if (!window.api) {
        console.error('❌ window.api is not defined!');
        throw new Error('API غير متاح. يرجى إعادة تحميل الصفحة.');
      }
      
      // التحقق من وجود window.notificationManager
      if (!window.notificationManager) {
        console.warn('⚠ window.notificationManager is not defined');
      }
      
      const modal = this.createModal('اختر نوع العملية', `
        <div class="operation-types-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0;">
          <button class="operation-type-card" data-type="web-scan" style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 30px; cursor: pointer; transition: all 0.3s; text-align: center;">
            <div class="operation-icon" style="font-size: 48px; color: #3b82f6; margin-bottom: 10px;">
              <i class="fas fa-globe"></i>
            </div>
            <h3 style="margin: 10px 0; color: #111827;">فحص الويب</h3>
            <p style="font-size: 14px; color: #666; margin: 0;">فحص المواقع واكتشاف الثغرات</p>
          </button>
          
          <button class="operation-type-card" data-type="phishing" style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 30px; cursor: pointer; transition: all 0.3s; text-align: center;">
            <div class="operation-icon" style="font-size: 48px; color: #10b981; margin-bottom: 10px;">
              <i class="fas fa-fish"></i>
            </div>
            <h3 style="margin: 10px 0; color: #111827;">حملة تصيد</h3>
            <p style="font-size: 14px; color: #666; margin: 0;">إنشاء حملة تصيد تعليمية</p>
          </button>
          
          <button class="operation-type-card" data-type="network" style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 30px; cursor: pointer; transition: all 0.3s; text-align: center;">
            <div class="operation-icon" style="font-size: 48px; color: #8b5cf6; margin-bottom: 10px;">
              <i class="fas fa-network-wired"></i>
            </div>
            <h3 style="margin: 10px 0; color: #111827;">تحليل الشبكة</h3>
            <p style="font-size: 14px; color: #666; margin: 0;">فحص وتحليل الشبكات اللاسلكية</p>
          </button>
        </div>
        
        <style>
          .operation-type-card:hover {
            border-color: #3b82f6 !important;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2) !important;
            transform: translateY(-2px);
          }
        </style>
      `);

      window.appLogger?.debug('✓ Modal HTML created');

      // إضافة event listeners لبطاقات الاختيار
      const cards = modal.querySelectorAll('.operation-type-card');
      window.appLogger?.debug(`✓ Found ${cards.length} operation cards`);
      
      cards.forEach(card => {
        card.addEventListener('click', () => {
          const type = card.dataset.type;
          window.appLogger?.debug(`✓ Selected operation type: ${type}`);
          this.closeModal();
          
          // استخدام setTimeout للتأكد من إغلاق Modal أولاً
          setTimeout(() => {
            this.showOperationForm(type);
          }, 100);
        });
      });

      this.currentModal = modal;
      window.appLogger?.debug('✓ Modal opened successfully');
    } catch (error) {
      console.error('❌ Error in showNewOperationModal:', error);
      console.error('Error stack:', error.stack);
      
      // عرض رسالة خطأ واضحة للمستخدم
      if (window.notificationManager && window.notificationManager.show) {
        window.notificationManager.show('حدث خطأ: ' + error.message, 'error');
      } else {
        alert('حدث خطأ: ' + error.message + '\n\nيرجى فتح Console (F12) لمزيد من التفاصيل.');
      }
    }
  }

  /**
   * عرض نموذج العملية حسب النوع
   */
  showOperationForm(type) {
    switch (type) {
      case 'web-scan':
        this.showWebScanForm();
        break;
      case 'phishing':
        this.showPhishingCampaignForm();
        break;
      case 'network':
        this.showNetworkAnalysisForm();
        break;
      default:
        console.error('Unknown operation type:', type);
    }
  }

  /**
   * نموذج فحص الويب
   */
  async showWebScanForm() {
    const modal = this.createModal('فحص ويب جديد', `
      <form id="web-scan-form" class="operation-form">
        <div class="form-group">
          <label for="scan-authorization-id">
            <i class="fas fa-key"></i>
            التصريح <span class="required-indicator">*</span>
          </label>
          <select id="scan-authorization-id" name="authorizationId" required>
            <option value="">جاري التحميل...</option>
          </select>
          <small class="form-help">يجب اختيار تصريح نشط لفحص الويب</small>
        </div>

        <div class="form-group">
          <label for="scan-target-url">
            <i class="fas fa-globe"></i>
            عنوان URL المستهدف <span class="required-indicator">*</span>
          </label>
          <input 
            type="url" 
            id="scan-target-url" 
            name="targetUrl"
            placeholder="https://example.com" 
            data-validate="required|url"
            required
          >
          <small class="form-help">يجب أن يبدأ بـ http:// أو https://</small>
        </div>

        <div class="form-group">
          <label for="scan-scope">
            <i class="fas fa-crosshairs"></i>
            نطاق الفحص
          </label>
          <select id="scan-scope" name="scope">
            <option value="FULL">فحص كامل</option>
            <option value="SUBDOMAIN">النطاق الفرعي فقط</option>
            <option value="PATH">المسار المحدد فقط</option>
          </select>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="scan-deep" name="deepScan">
            فحص عميق (يستغرق وقتاً أطول)
          </label>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">
            <i class="fas fa-play"></i>
            بدء الفحص
          </button>
          <button type="button" class="btn-secondary" onclick="window.operationsManager.closeModal()">
            إلغاء
          </button>
        </div>
      </form>
    `);

    // معالجة إرسال النموذج
    const form = modal.querySelector('#web-scan-form');
    
    // تفعيل التحقق التلقائي
    if (window.inputValidator) {
      window.inputValidator.enableAutoValidation(form);
    }
    
    form.addEventListener('submit', (e) => this.handleWebScanSubmit(e));

    this.currentModal = modal;
    
    // تحميل التصاريح
    await this.loadWebScanAuthorizations();
  }

  /**
   * نموذج حملة التصيد
   */
  async showPhishingCampaignForm() {
    const modal = this.createModal('حملة تصيد جديدة', `
      <form id="phishing-campaign-form" class="operation-form">
        <div class="form-group">
          <label for="campaign-authorization-id">
            <i class="fas fa-key"></i>
            التصريح <span class="required-indicator">*</span>
          </label>
          <select id="campaign-authorization-id" name="authorizationId" required>
            <option value="">جاري التحميل...</option>
          </select>
          <small class="form-help">يجب اختيار تصريح نشط لحملة التصيد</small>
        </div>

        <div class="form-group">
          <label for="campaign-name">
            <i class="fas fa-tag"></i>
            اسم الحملة <span class="required-indicator">*</span>
          </label>
          <input 
            type="text" 
            id="campaign-name" 
            name="name"
            placeholder="حملة التوعية الأمنية Q1" 
            data-validate="required|minLength:3|maxLength:100"
            required
          >
        </div>

        <div class="form-group">
          <label for="campaign-template">
            <i class="fas fa-envelope"></i>
            قالب البريد الإلكتروني <span class="required-indicator">*</span>
          </label>
          <select id="campaign-template" name="emailTemplate" data-validate="required" required>
            <option value="">اختر قالباً...</option>
            <option value="password-reset">إعادة تعيين كلمة المرور</option>
            <option value="security-alert">تنبيه أمني</option>
            <option value="invoice">فاتورة</option>
            <option value="package-delivery">تسليم طرد</option>
          </select>
        </div>

        <div class="form-group">
          <label for="campaign-targets">
            <i class="fas fa-users"></i>
            الأهداف (بريد إلكتروني لكل سطر) <span class="required-indicator">*</span>
          </label>
          <textarea 
            id="campaign-targets" 
            name="targets"
            rows="5"
            placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
            data-validate="required"
            required
          ></textarea>
          <small class="form-help">أدخل بريد إلكتروني واحد في كل سطر</small>
        </div>

        <div class="form-group">
          <label for="campaign-landing-page">
            <i class="fas fa-file-code"></i>
            صفحة الهبوط
          </label>
          <select id="campaign-landing-page" name="landingPage">
            <option value="default">الافتراضية</option>
            <option value="office365">Office 365</option>
            <option value="gmail">Gmail</option>
            <option value="bank">بنك</option>
          </select>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">
            <i class="fas fa-paper-plane"></i>
            إنشاء الحملة
          </button>
          <button type="button" class="btn-secondary" onclick="window.operationsManager.closeModal()">
            إلغاء
          </button>
        </div>

        <div id="phishing-campaign-result-panel" class="phishing-inline-results" hidden></div>
      </form>
    `);

    const form = modal.querySelector('#phishing-campaign-form');
    
    // تفعيل التحقق التلقائي
    if (window.inputValidator) {
      window.inputValidator.enableAutoValidation(form);
    }
    
    form.addEventListener('submit', (e) => this.handlePhishingCampaignSubmit(e));

    this.currentModal = modal;
    
    // تحميل التصاريح
    await this.loadPhishingAuthorizations();
  }

  /**
   * نموذج تحليل الشبكة
   */
  async showNetworkAnalysisForm() {
    this.discoveredNetworksCache = [];
    this.selectedDiscoveredNetwork = null;
    this.networkRuntimeReadiness = null;

    // تحميل التصاريح النشطة
    let authorizationsHtml = '<option value="">جاري التحميل...</option>';
    
    try {
      const response = await api.get('/authorizations');
      window.appLogger?.debug('Network authorizations response:', response);
      
      if (response.success && response.data.authorizations) {
        const activeAuths = response.data.authorizations.filter(auth => {
          const isActive = auth.status === 'ACTIVE';
          const validUntil = auth.valid_until || auth.validUntil;
          const notExpired = new Date(validUntil) > new Date();
          const allowedOps = auth.allowed_operations || auth.allowedOperations || [];
          const correctType = allowedOps && (
            allowedOps.includes('NETWORK_ANALYSIS') ||
            allowedOps.includes('NETWORK_TEST') ||
            allowedOps.includes('ALL')
          );
          
          return isActive && notExpired && correctType;
        });
        
        window.appLogger?.debug('Valid network authorizations:', activeAuths);
        
        if (activeAuths.length > 0) {
          authorizationsHtml = '<option value="">اختر تصريحاً...</option>' +
            activeAuths.map(auth => {
              const orgName = auth.organization_name || auth.organizationName || 'تصريح ' + auth.id;
              const validUntil = auth.valid_until || auth.validUntil;
              return `<option value="${auth.id}">${orgName} - صالح حتى ${new Date(validUntil).toLocaleDateString('ar-SA')}</option>`;
            }).join('');
        } else {
          authorizationsHtml = '<option value="">لا توجد تصاريح نشطة</option>';
        }
      } else {
        authorizationsHtml = '<option value="">فشل تحميل التصاريح</option>';
      }
    } catch (error) {
      console.error('Error loading authorizations:', error);
      authorizationsHtml = '<option value="">فشل تحميل التصاريح</option>';
    }

    const modal = this.createModal('تحليل شبكة جديد', `
      <div style="max-height: 70vh; overflow-y: auto; padding-right: 5px;">
        <form id="network-analysis-form" class="operation-form">
          <div class="form-group">
            <label for="authorizationId">
              <i class="fas fa-key"></i>
              التصريح <span class="required-indicator">*</span>
            </label>
            <select id="authorizationId" name="authorizationId" required>
              ${authorizationsHtml}
            </select>
            <small class="form-help">يجب اختيار تصريح نشط لبدء التحليل</small>
          </div>

          <div class="form-group">
            <label>
              <i class="fas fa-wifi"></i>
              اكتشاف الشبكات المتاحة
            </label>
            <button type="button" id="btn-discover-networks" class="btn-secondary btn-block">
              <i class="fas fa-search"></i>
              بحث عن الشبكات
            </button>
            <div id="discovered-networks" style="margin-top: 10px;"></div>
          </div>

          <div class="form-group">
            <label for="bssid">
              <i class="fas fa-network-wired"></i>
              BSSID (عنوان MAC) <span class="required-indicator">*</span>
            </label>
            <input 
              type="text" 
              id="bssid" 
              name="bssid"
              placeholder="00:11:22:33:44:55" 
              required
            >
            <small class="form-help">مثال: 00:11:22:33:44:55</small>
          </div>

          <div class="form-group">
            <label for="ssid">
              <i class="fas fa-wifi"></i>
              SSID (اسم الشبكة) <span class="required-indicator">*</span>
            </label>
            <input 
              type="text" 
              id="ssid" 
              name="ssid"
              placeholder="faraa net"
              required
            >
            <small class="form-help">مثال: faraa net</small>
          </div>

          <div class="form-group">
            <label>
              <i class="fas fa-tasks"></i>
              أنواع الاختبارات
            </label>
            <div class="checkbox-group" style="display: grid; gap: 10px;">
              ${this.renderNetworkTestTypeOptions()}
            </div>
            <small class="form-help">يعرض النظام جميع أنواع الاختبارات المعروفة، لكن يفعّل فقط ما يدعمه الـ runner الحالي وما تسمح به بيئة التشغيل المصرح بها.</small>
            <div id="network-runtime-readiness" style="margin-top: 12px;"></div>
            <div style="margin-top: 10px; font-size: 12px; color: #64748b; line-height: 1.8;">
              جميع الخيارات قابلة للاختيار. بعد التنفيذ ستظهر حالة كل نوع بوضوح: تم التنفيذ، يحتاج متطلبات، أو ينتظر بيئة تشغيل مخصصة.
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn-primary">
              <i class="fas fa-play"></i>
              بدء التحليل
            </button>
            <button type="button" class="btn-secondary" onclick="window.operationsManager.closeModal()">
              إلغاء
            </button>
          </div>
        </form>
        
        <!-- قسم نتائج التحليل الشاملة -->
        <div id="network-analysis-results" style="display: none; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 12px;">
          <h3 style="margin: 0 0 20px 0; color: #333; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-chart-line"></i>
            نتائج التحليل الشاملة
          </h3>
          <div id="network-results-content"></div>
        </div>
      </div>
    `);

    const form = modal.querySelector('#network-analysis-form');
    
    // تفعيل التحقق التلقائي
    if (window.inputValidator) {
      window.inputValidator.enableAutoValidation(form);
    }
    
    form.addEventListener('submit', (e) => this.handleNetworkAnalysisSubmit(e));

    // زر اكتشاف الشبكات
    const btnDiscover = modal.querySelector('#btn-discover-networks');
    btnDiscover.addEventListener('click', () => this.discoverNetworks());

    this.currentModal = modal;
    this.loadNetworkRuntimeReadiness(modal);
  }

  async loadNetworkRuntimeReadiness(modal) {
    const readinessContainer = modal.querySelector('#network-runtime-readiness');
    if (!readinessContainer) {
      return;
    }

    readinessContainer.innerHTML = `
      <div style="font-size: 13px; color: #64748b; padding: 8px 2px;">
        جاري التحقق من جاهزية محرك تنفيذ اختبارات الشبكات...
      </div>
    `;

    try {
      const response = await api.getNetworkRuntimeReadiness();
      this.networkRuntimeReadiness = response.data || {};
      readinessContainer.innerHTML = this.renderRuntimeReadinessSummary(this.networkRuntimeReadiness);

      const checkboxGroup = modal.querySelector('.checkbox-group');
      if (checkboxGroup) {
        checkboxGroup.innerHTML = this.renderNetworkTestTypeOptions();
      }
    } catch (error) {
      readinessContainer.innerHTML = `
        <div style="background: #fff7ed; border-right: 4px solid #f97316; border-radius: 10px; padding: 12px; color: #9a3412; font-size: 13px;">
          تعذر تحميل جاهزية محرك التنفيذ الحالي. سيتم عرض الإعدادات الافتراضية فقط.
        </div>
      `;
    }
  }

  /**
   * تحميل التصاريح لفحص الويب
   */
  async loadWebScanAuthorizations() {
    window.appLogger?.debug('Loading web scan authorizations...');
    try {
      const response = await api.get('/authorizations');
      window.appLogger?.debug('Authorizations response:', response);
      
      const authSelect = document.getElementById('scan-authorization-id');
      
      if (!authSelect) {
        console.error('Authorization select element not found!');
        return;
      }

      if (response.success && response.data.authorizations) {
        const allAuths = response.data.authorizations;
        window.appLogger?.debug('All authorizations:', allAuths);
        
        const validAuths = allAuths.filter(auth => {
          const isActive = auth.status === 'ACTIVE';
          // دعم كلا التنسيقين: valid_until و validUntil
          const validUntil = auth.valid_until || auth.validUntil;
          const notExpired = new Date(validUntil) > new Date();
          // دعم كلا التنسيقين: allowed_operations و allowedOperations
          const allowedOps = auth.allowed_operations || auth.allowedOperations || [];
          const correctType = allowedOps && (
            allowedOps.includes('WEB_SCAN') || 
            allowedOps.includes('ALL')
          );
          
          window.appLogger?.debug(`Auth ${auth.id}:`, { 
            isActive, 
            notExpired, 
            correctType, 
            allowedOperations: allowedOps,
            status: auth.status,
            validUntil: validUntil
          });
          
          return isActive && notExpired && correctType;
        });
        
        window.appLogger?.debug('Valid authorizations for web scan:', validAuths);

        authSelect.innerHTML = validAuths.length > 0
          ? '<option value="">اختر تصريحاً...</option>' + validAuths.map(auth => {
              const orgName = auth.organization_name || auth.organizationName || 'تصريح ' + auth.id;
              const validUntil = auth.valid_until || auth.validUntil;
              return `<option value="${auth.id}">${orgName} - صالح حتى ${new Date(validUntil).toLocaleDateString('ar-SA')}</option>`;
            }).join('')
          : '<option value="">لا توجد تصاريح نشطة لفحص الويب</option>';
      } else {
        console.error('Invalid response format:', response);
        authSelect.innerHTML = '<option value="">فشل تحميل التصاريح</option>';
      }
    } catch (error) {
      console.error('Error loading authorizations:', error);
      const authSelect = document.getElementById('scan-authorization-id');
      if (authSelect) {
        authSelect.innerHTML = '<option value="">خطأ في التحميل</option>';
      }
    }
  }

  /**
   * معالجة إرسال نموذج فحص الويب
   */
  async handleWebScanSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const authorizationId = formData.get('authorizationId');
    
    if (!authorizationId) {
      window.notificationManager.show('يجب اختيار تصريح نشط', 'error');
      return;
    }
    
    const targetUrl = formData.get('targetUrl');
    const deepScan = formData.get('deepScan') === 'on';
    
    const data = {
      target: {
        url: targetUrl,
        authorizationId: authorizationId
      },
      config: {
        maxDepth: deepScan ? 5 : 3,
        maxRequests: deepScan ? 200 : 100,
        requestTimeoutMs: deepScan ? 15000 : 10000,
        vulnerabilityTypes: ['SQL_INJECTION', 'XSS', 'CSRF', 'DIRECTORY_TRAVERSAL', 'COMMAND_INJECTION'],
        respectRobotsTxt: true,
        customHeaders: {}
      }
    };

    try {
      window.showLoading();
      window.appLogger?.debug('Creating web scan:', data);
      
      const response = await api.createScan(data);
      window.appLogger?.debug('Scan created:', response);
      
      if (response.success) {
        this.closeModal();
        window.notificationManager.show('تم بدء الفحص بنجاح!', 'success');
        
        // عرض نافذة التقدم
        const scanId = response.data.id || response.data.sessionId;
        this.showScanProgress(scanId, targetUrl);
      } else {
        throw new Error(response.error?.message || 'فشل إنشاء الفحص');
      }
    } catch (error) {
      console.error('Error creating scan:', error);
      window.notificationManager.show('فشل بدء الفحص: ' + error.message, 'error');
    } finally {
      window.hideLoading();
    }
  }

  /**
   * تحميل التصاريح لحملات التصيد
   */
  async loadPhishingAuthorizations() {
    window.appLogger?.debug('Loading phishing authorizations...');
    try {
      const response = await api.get('/authorizations');
      window.appLogger?.debug('Authorizations response:', response);
      
      const authSelect = document.getElementById('campaign-authorization-id');
      
      if (!authSelect) {
        console.error('Authorization select element not found!');
        return;
      }

      if (response.success && response.data.authorizations) {
        const allAuths = response.data.authorizations;
        window.appLogger?.debug('All authorizations:', allAuths);
        
        const validAuths = allAuths.filter(auth => {
          const isActive = auth.status === 'ACTIVE';
          // دعم كلا التنسيقين: valid_until و validUntil
          const validUntil = auth.valid_until || auth.validUntil;
          const notExpired = new Date(validUntil) > new Date();
          // دعم كلا التنسيقين: allowed_operations و allowedOperations
          const allowedOps = auth.allowed_operations || auth.allowedOperations || [];
          const correctType = allowedOps && (
            allowedOps.includes('PHISHING_CAMPAIGN') || 
            allowedOps.includes('ALL')
          );
          
          window.appLogger?.debug(`Auth ${auth.id}:`, { 
            isActive, 
            notExpired, 
            correctType, 
            allowedOperations: allowedOps,
            status: auth.status,
            validUntil: validUntil
          });
          
          return isActive && notExpired && correctType;
        });
        
        window.appLogger?.debug('Valid authorizations for phishing:', validAuths);

        authSelect.innerHTML = validAuths.length > 0
          ? '<option value="">اختر تصريحاً...</option>' + validAuths.map(auth => {
              const orgName = auth.organization_name || auth.organizationName || 'تصريح ' + auth.id;
              const validUntil = auth.valid_until || auth.validUntil;
              return `<option value="${auth.id}">${orgName} - صالح حتى ${new Date(validUntil).toLocaleDateString('ar-SA')}</option>`;
            }).join('')
          : '<option value="">لا توجد تصاريح نشطة لحملات التصيد</option>';
      } else {
        console.error('Invalid response format:', response);
        authSelect.innerHTML = '<option value="">فشل تحميل التصاريح</option>';
      }
    } catch (error) {
      console.error('Error loading authorizations:', error);
      const authSelect = document.getElementById('campaign-authorization-id');
      if (authSelect) {
        authSelect.innerHTML = '<option value="">خطأ في التحميل</option>';
      }
    }
  }

  /**
   * معالجة إرسال نموذج حملة التصيد
   */
  async handlePhishingCampaignSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const submitButton = form.querySelector('button[type="submit"]');
    const resultPanel = form.querySelector('#phishing-campaign-result-panel');
    
    const authorizationId = formData.get('authorizationId');
    
    if (!authorizationId) {
      window.notificationManager.show('يجب اختيار تصريح نشط', 'error');
      return;
    }
    
    // تحويل الأهداف من نص إلى مصفوفة
    const targetsText = formData.get('targets');
    const targets = targetsText
      .split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    if (targets.length === 0) {
      window.notificationManager.show('يجب إدخال بريد إلكتروني واحد على الأقل', 'error');
      return;
    }

    const data = {
      authorizationId: authorizationId,
      name: formData.get('name'),
      emailTemplate: formData.get('emailTemplate'),
      landingPage: formData.get('landingPage'),
      targets: targets
    };

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...';
      }

      if (resultPanel) {
        resultPanel.hidden = false;
        resultPanel.innerHTML = `
          <div class="inline-result-card is-running">
            <div class="inline-result-title">
              <i class="fas fa-spinner fa-spin"></i>
              جاري إنشاء الحملة
            </div>
            <p>يتم إرسال الطلب إلى الخادم وانتظار النتيجة الفعلية.</p>
          </div>
        `;
        resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      window.showLoading();
      window.appLogger?.debug('Creating phishing campaign:', data);
      
      const response = await api.createCampaign(data);
      window.appLogger?.debug('Campaign created:', response);
      
      if (response.success) {
        const campaign = response.data?.campaign || response.data || {};
        const campaignId = campaign.id || response.data?.campaignId || response.data?.id;

        if (resultPanel) {
          resultPanel.hidden = false;
          resultPanel.innerHTML = this.renderPhishingCampaignInlineResult({
            campaign,
            campaignId,
            targetCount: targets.length,
            requestedData: data,
            responseData: response.data || {},
            results: null
          });
          resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        window.notificationManager.show(`تم إنشاء الحملة بنجاح! (${targets.length} هدف)`, 'success');

        if (window.phishingCampaignManager?.loadCampaigns) {
          window.phishingCampaignManager.loadCampaigns().catch(() => {});
        }
      } else {
        throw new Error(response.error?.message || 'فشل إنشاء الحملة');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      if (resultPanel) {
        resultPanel.hidden = false;
        resultPanel.innerHTML = `
          <div class="inline-result-card is-error">
            <div class="inline-result-title">
              <i class="fas fa-exclamation-circle"></i>
              لم يتم إنشاء الحملة
            </div>
            <p>${this.escapeHtml(error.message || 'حدث خطأ غير متوقع أثناء إنشاء الحملة.')}</p>
          </div>
        `;
        resultPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      window.notificationManager.show('فشل إنشاء الحملة: ' + error.message, 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> إنشاء الحملة';
      }
      window.hideLoading();
    }
  }

  renderPhishingCampaignInlineResult({ campaign, campaignId, targetCount, requestedData, responseData, results }) {
    const status = campaign?.status || responseData?.status || 'queued';
    const jobId = campaign?.last_job_id || campaign?.lastJobId || responseData?.jobId || responseData?.job_id || 'غير متاح';
    const createdAt = campaign?.created_at || campaign?.createdAt || responseData?.createdAt || responseData?.created_at || new Date().toISOString();
    const updatedAt = campaign?.updated_at || campaign?.updatedAt || responseData?.updatedAt || responseData?.updated_at || createdAt;
    const resultSummary = results?.result_summary || results?.resultSummary || {};
    const interactions = Array.isArray(resultSummary.interactions) ? resultSummary.interactions : [];
    const deliveredCount = Number(resultSummary.deliveredCount ?? resultSummary.delivered_count ?? 0);
    const failedCount = Number(resultSummary.failedCount ?? resultSummary.failed_count ?? 0);
    const hasExecutionResults = Boolean(results && Object.keys(results).length > 0 && (interactions.length || deliveredCount || failedCount));

    return `
      <section class="inline-result-card is-success" aria-live="polite">
        <div class="inline-result-header">
          <div>
            <div class="inline-result-title">
              <i class="fas fa-check-circle"></i>
              نتيجة إنشاء الحملة
            </div>
            <p>هذه البيانات مأخوذة من استجابة الخادم الحالية فقط، ولا يتم عرض أرقام تنفيذ غير موجودة.</p>
          </div>
          <span class="status-pill status-${this.escapeHtmlAttribute(String(status).toLowerCase())}">
            ${this.escapeHtml(this.formatCampaignStatus(status))}
          </span>
        </div>

        <div class="inline-result-grid">
          ${this.renderInlineResultItem('معرف الحملة', campaignId || 'غير متاح')}
          ${this.renderInlineResultItem('الحالة', this.formatCampaignStatus(status))}
          ${this.renderInlineResultItem('عدد الأهداف', String(targetCount))}
          ${this.renderInlineResultItem('قالب البريد', requestedData.emailTemplate || 'غير متاح')}
          ${this.renderInlineResultItem('صفحة الهبوط', requestedData.landingPage || 'غير متاح')}
          ${this.renderInlineResultItem('معرف المهمة', jobId)}
          ${this.renderInlineResultItem('وقت الإنشاء', this.formatDateTime(createdAt))}
          ${this.renderInlineResultItem('آخر تحديث', this.formatDateTime(updatedAt))}
        </div>

        <div class="inline-result-note ${hasExecutionResults ? 'has-results' : ''}">
          <i class="fas fa-info-circle"></i>
          ${hasExecutionResults
            ? `تم استلام نتائج تنفيذ فعلية: ${this.escapeHtml(String(interactions.length))} تفاعل، ${this.escapeHtml(String(deliveredCount))} تسليم، ${this.escapeHtml(String(failedCount))} فشل.`
            : 'تم إنشاء الحملة أو جدولتها بنجاح. لا توجد نتائج تنفيذ فعلية بعد من الـ runner، وستظهر عند وصولها من الخادم.'}
        </div>

        <div class="inline-result-log" role="log" aria-label="سجل إنشاء الحملة">
          ${this.renderPhishingCampaignLogLines({ status, campaignId, targetCount, jobId, createdAt, hasExecutionResults })}
        </div>

        <div class="inline-result-actions">
          <button type="button" class="btn-secondary btn-sm" onclick="window.operationsManager.refreshCreatedPhishingCampaign('${this.escapeHtmlAttribute(campaignId || '')}')">
            <i class="fas fa-sync-alt"></i>
            تحديث النتيجة
          </button>
          <button type="button" class="btn-primary btn-sm" onclick="window.operationsManager.closeModal(); window.navigationManager.navigateTo('phishing');">
            <i class="fas fa-list"></i>
            عرض الحملات
          </button>
        </div>
      </section>
    `;
  }

  renderInlineResultItem(label, value) {
    return `
      <div class="inline-result-item">
        <span>${this.escapeHtml(label)}</span>
        <strong>${this.escapeHtml(value || 'غير متاح')}</strong>
      </div>
    `;
  }

  renderPhishingCampaignLogLines({ status, campaignId, targetCount, jobId, createdAt, hasExecutionResults }) {
    const lines = [
      `تم قبول طلب إنشاء الحملة في ${this.formatDateTime(createdAt)}`,
      `معرف الحملة: ${campaignId || 'غير متاح'}`,
      `عدد الأهداف المستلمة من النموذج: ${targetCount}`,
      `حالة الخادم الحالية: ${this.formatCampaignStatus(status)}`,
      `معرف مهمة التنفيذ: ${jobId || 'غير متاح'}`,
      hasExecutionResults
        ? 'تم استلام نتائج تنفيذ فعلية من الخادم.'
        : 'لا توجد نتائج تنفيذ فعلية بعد؛ لم يتم توليد أرقام افتراضية.'
    ];

    return lines.map((line) => `<div><span>${this.escapeHtml(line)}</span></div>`).join('');
  }

  async refreshCreatedPhishingCampaign(campaignId) {
    if (!campaignId) {
      window.notificationManager.show('معرف الحملة غير متاح للتحديث', 'warning');
      return;
    }

    const resultPanel = document.getElementById('phishing-campaign-result-panel');
    if (!resultPanel) {
      return;
    }

    try {
      const [campaignResponse, resultsResponse] = await Promise.all([
        api.getCampaign(campaignId),
        api.getCampaignResults(campaignId).catch(() => ({ data: null }))
      ]);
      const campaign = campaignResponse.data?.campaign || campaignResponse.data || {};
      const results = resultsResponse.data || null;
      const targets = Array.isArray(campaign.targets) ? campaign.targets : [];

      resultPanel.innerHTML = this.renderPhishingCampaignInlineResult({
        campaign,
        campaignId,
        targetCount: targets.length,
        requestedData: {
          emailTemplate: campaign.email_template || campaign.emailTemplate || 'غير متاح',
          landingPage: campaign.landing_page || campaign.landingPage || 'غير متاح'
        },
        responseData: campaign,
        results
      });
      window.notificationManager.show('تم تحديث نتيجة الحملة من الخادم', 'success');
    } catch (error) {
      resultPanel.innerHTML += `
        <div class="inline-result-note is-warning">
          <i class="fas fa-exclamation-triangle"></i>
          تعذر تحديث النتيجة من الخادم: ${this.escapeHtml(error.message || 'خطأ غير معروف')}
        </div>
      `;
      window.notificationManager.show('تعذر تحديث نتيجة الحملة', 'error');
    }
  }

  formatCampaignStatus(status) {
    const map = {
      queued: 'مجدولة',
      running: 'قيد التنفيذ',
      completed: 'مكتملة',
      failed: 'فشلت',
      cancelled: 'ملغاة',
      claimed: 'قيد الاستلام',
      unsupported: 'غير مدعومة'
    };
    return map[String(status || '').toLowerCase()] || status || 'غير متاح';
  }

  formatDateTime(value) {
    if (!value) {
      return 'غير متاح';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'غير متاح';
    }

    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * معالجة إرسال نموذج تحليل الشبكة
   */
  async handleNetworkAnalysisSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // التحقق من التصريح
    const authorizationId = formData.get('authorizationId');
    if (!authorizationId) {
      window.notificationManager.show('يجب اختيار تصريح نشط', 'error');
      return;
    }
    
    // التحقق من BSSID
    const bssid = formData.get('bssid');
    if (!bssid || !bssid.trim()) {
      window.notificationManager.show('يجب إدخال BSSID (عنوان MAC للشبكة)', 'error');
      return;
    }
    
    // الحصول على SSID (مطلوب!)
    const ssid = formData.get('ssid');
    if (!ssid || !ssid.trim()) {
      window.notificationManager.show('يجب إدخال SSID (اسم الشبكة)', 'error');
      return;
    }
    
    // جمع أنواع الاختبارات المحددة
    const testTypes = [];
    form.querySelectorAll('input[name="testTypes"]:checked').forEach(checkbox => {
      testTypes.push(checkbox.value);
    });

    if (testTypes.length === 0) {
      window.notificationManager.show('يجب اختيار نوع اختبار واحد على الأقل', 'error');
      return;
    }

    let matchingDiscoveredNetwork = this.findMatchingDiscoveredNetwork(
      ssid.trim(),
      bssid.trim()
    );

    if (!matchingDiscoveredNetwork) {
      try {
        const resolvedTarget = await this.resolveCurrentWirelessTarget(
          authorizationId,
          ssid.trim(),
          bssid.trim()
        );

        if (resolvedTarget) {
          matchingDiscoveredNetwork = resolvedTarget;

          const ssidInput = document.getElementById('ssid');
          const bssidInput = document.getElementById('bssid');

          if (ssidInput) {
            ssidInput.value = resolvedTarget.ssid || ssid.trim();
          }

          if (bssidInput) {
            bssidInput.value = resolvedTarget.bssid || bssid.trim();
          }

          this.selectedDiscoveredNetwork = resolvedTarget;
        }
      } catch (resolutionError) {
        window.notificationManager.show(
          this.translateNetworkError(resolutionError.message),
          'error'
        );
        return;
      }
    }

    if (this.discoveredNetworksCache.length > 0 && !matchingDiscoveredNetwork) {
      window.notificationManager.show(
        'بيانات الشبكة لا تطابق آخر نتيجة اكتشاف. اختر شبكة من القائمة الظاهرة أو أعد البحث أولاً.',
        'error'
      );
      return;
    }

    // البيانات الصحيحة للإرسال
    const data = {
      target: {
        ssid: matchingDiscoveredNetwork?.ssid || ssid.trim(),
        bssid: matchingDiscoveredNetwork?.bssid || bssid.trim(),
        authorizationId: authorizationId
      },
      config: {
        testTypes: testTypes,
        maxAttempts: 100
      }
    };
    
    window.appLogger?.debug('📡 إرسال بيانات تحليل الشبكة:', data);

    try {
      window.showLoading();
      window.appLogger?.debug('Creating network test:', data);
      
      // عرض قسم النتائج
      const resultsSection = document.getElementById('network-analysis-results');
      const resultsContent = document.getElementById('network-results-content');
      
      if (resultsSection) {
        resultsSection.style.display = 'block';
        resultsContent.innerHTML = `
          <div class="loading-spinner" style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 32px; color: #667eea;"></i>
            <p style="margin-top: 15px; color: #666;">جاري تحليل الشبكة...</p>
          </div>
        `;
        
        // التمرير إلى قسم النتائج
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      
      const response = await api.createNetworkTest(data);
      window.appLogger?.debug('Network test created:', response);
      
      if (response.success) {
        window.notificationManager.show('تم بدء تحليل الشبكة بنجاح!', 'success');

        if (resultsContent) {
          const jobId = response.data.jobId || response.data.id;
          resultsContent.innerHTML = this.renderQueuedNetworkJob({
            jobId,
            ssid,
            bssid,
            testTypes
          });
          this.trackNetworkAnalysis(jobId, resultsContent);
        }

        window.networkAnalyzerManager?.loadNetworkAnalyses?.();
      } else {
        throw new Error(response.error?.message || 'فشل إنشاء اختبار الشبكة');
      }
    } catch (error) {
      console.error('Error creating network test:', error);
      window.notificationManager.show('فشل بدء تحليل الشبكة: ' + error.message, 'error');
      
      // عرض رسالة خطأ في قسم النتائج
      const resultsContent = document.getElementById('network-results-content');
      if (resultsContent) {
        resultsContent.innerHTML = `
          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-right: 4px solid #dc2626;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i class="fas fa-exclamation-circle" style="color: #dc2626; font-size: 24px;"></i>
              <div>
                <h4 style="margin: 0 0 5px 0; color: #dc2626;">فشل بدء التحليل</h4>
                <p style="margin: 0; color: #991b1b; font-size: 14px;">${error.message}</p>
              </div>
            </div>
          </div>
        `;
      }
    } finally {
      window.hideLoading();
    }
  }

  /**
   * اكتشاف الشبكات المتاحة
   */
  async discoverNetworks() {
    const container = document.getElementById('discovered-networks');
    if (!container) return;

    // التحقق من التصريح أولاً
    const authSelect = document.getElementById('authorizationId');
    const authorizationId = authSelect ? authSelect.value : null;
    
    if (!authorizationId) {
      window.notificationManager.show('يجب اختيار تصريح أولاً', 'error');
      return;
    }

    try {
      container.innerHTML = '<p style="text-align: center;"><i class="fas fa-spinner fa-spin"></i> جاري البحث...</p>';
      
      const response = await api.discoverAccessPoints(authorizationId);
      window.appLogger?.debug('Discovered networks:', response);
      
      if (response.success && response.data?.jobId) {
        const jobId = response.data.jobId;
        container.innerHTML = this.renderDiscoveryPending(jobId);
        this.trackNetworkDiscovery(jobId, container);
      } else {
        container.innerHTML = '<p style="color: #666; text-align: center;">لم يتمكن الخادم من جدولة عملية الاكتشاف</p>';
      }
    } catch (error) {
      console.error('Error discovering networks:', error);
      container.innerHTML = `<p style="color: #dc2626; text-align: center;">فشل اكتشاف الشبكات: ${error.message}</p>`;
    }
  }

  renderQueuedNetworkJob({ jobId, ssid, bssid, testTypes }) {
    return `
      <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding: 15px; background: #eff6ff; border-radius: 8px;">
          <i class="fas fa-clock" style="color: #2563eb; font-size: 24px;"></i>
          <div style="flex: 1;">
            <h4 style="margin: 0; color: #1d4ed8;">تمت جدولة التحليل</h4>
            <p style="margin: 5px 0 0 0; font-size: 13px; color: #2563eb;">معرف المهمة: ${jobId || 'N/A'}</p>
          </div>
          <span style="padding: 8px 12px; background: #dbeafe; color: #1d4ed8; border-radius: 999px; font-size: 12px; font-weight: 700;">
            QUEUED
          </span>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-wifi" style="color: #667eea;"></i>
            معلومات التنفيذ
          </h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
            <div style="padding: 12px; background: #f0f7ff; border-radius: 8px; border-right: 3px solid #3b82f6;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">SSID</div>
              <div style="font-weight: 600; color: #333; font-size: 15px;">${ssid || 'Unknown'}</div>
            </div>
            <div style="padding: 12px; background: #fef3c7; border-radius: 8px; border-right: 3px solid #f59e0b;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">BSSID</div>
              <div style="font-weight: 600; color: #333; font-size: 13px; font-family: monospace;">${bssid}</div>
            </div>
            <div style="padding: 12px; background: #ede9fe; border-radius: 8px; border-right: 3px solid #8b5cf6;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">الحالة</div>
              <div style="font-weight: 600; color: #333; font-size: 15px;">في انتظار Runner مناسب</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-tasks" style="color: #8b5cf6;"></i>
            الاختبارات المطلوبة
          </h4>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${testTypes.map(type => `
              <span style="padding: 8px 16px; background: #667eea; color: white; border-radius: 20px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-check-circle"></i> ${type}
              </span>
            `).join('')}
          </div>
        </div>

        <div style="padding: 15px; background: #fff7ed; border-right: 4px solid #f97316; border-radius: 8px;">
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            <i class="fas fa-info-circle" style="color: #ea580c; font-size: 20px; margin-top: 2px;"></i>
            <div style="font-size: 13px; color: #9a3412; line-height: 1.6;">
              لا يعرض النظام نتائج أو تقدماً تخمينياً. ستظهر البيانات فقط بعد أن يطالب Runner بالمهمة ويرسل الحالة والنتائج الفعلية.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderNetworkTestTypeOptions() {
    return this.getNetworkTestTypeCatalog().map((testType) => {
      const checked = testType.defaultChecked ? 'checked' : '';
      const badge = testType.supported
        ? '<span style="font-size: 11px; color: #166534; background: #dcfce7; padding: 3px 8px; border-radius: 999px;">مدعوم</span>'
        : '<span style="font-size: 11px; color: #9a3412; background: #ffedd5; padding: 3px 8px; border-radius: 999px;">يحتاج متطلبات</span>';

      return `
        <label style="display: block; border: 1px solid ${testType.supported ? '#dbeafe' : '#fde7d3'}; background: ${testType.supported ? '#f8fbff' : '#fffaf5'}; border-radius: 10px; padding: 12px; opacity: 1;">
          <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 6px;">
            <span style="display: inline-flex; align-items: center; gap: 8px;">
              <input type="checkbox" name="testTypes" value="${testType.id}" ${checked}>
              <strong style="color: #111827;">${testType.label}</strong>
            </span>
            ${badge}
          </div>
          <div style="font-size: 12px; color: #6b7280; line-height: 1.7; padding-right: 26px;">
            ${testType.description}
          </div>
        </label>
      `;
    }).join('');
  }

  trackNetworkAnalysis(jobId, container) {
    this.clearNetworkAnalysisPolling();

    const refresh = async () => {
      try {
        const statusResponse = await api.getNetworkTestStatus(jobId);
        const status = String(statusResponse.data?.status || '').toUpperCase();
        const testResponse = await api.getNetworkTest(jobId);
        const analysis = testResponse.data?.test || {};

        if (['COMPLETED', 'FAILED', 'UNSUPPORTED', 'CANCELLED'].includes(status)) {
          this.clearNetworkAnalysisPolling();

          let results = {};
          try {
            const resultsResponse = await api.getNetworkResults(jobId);
            results = resultsResponse.data?.results || {};
          } catch (resultsError) {
            window.appLogger?.warn('Network results fetch failed:', resultsError);
          }

          container.innerHTML = this.renderNetworkAnalysisSummary(analysis, results);
          window.networkAnalyzerManager?.loadNetworkAnalyses?.();
          return;
        }

        container.innerHTML = this.renderNetworkAnalysisProgress(analysis, status);
      } catch (error) {
        this.clearNetworkAnalysisPolling();
        container.innerHTML = this.renderNetworkErrorState(
          'تعذر متابعة حالة التحليل الحالي.',
          error.message
        );
      }
    };

    refresh();
    this.networkAnalysisPoller = setInterval(refresh, 4000);
  }

  trackNetworkDiscovery(jobId, container) {
    this.clearNetworkDiscoveryPolling();

    const refresh = async () => {
      try {
        const statusResponse = await api.getDiscoveryJobStatus(jobId);
        const status = String(statusResponse.data?.status || '').toUpperCase();

        if (['COMPLETED', 'FAILED', 'UNSUPPORTED', 'CANCELLED'].includes(status)) {
          this.clearNetworkDiscoveryPolling();

          if (status !== 'COMPLETED') {
            const discoveryResponse = await api.getDiscoveryJob(jobId);
            const discovery = discoveryResponse.data?.discovery || {};
            container.innerHTML = this.renderNetworkErrorState(
              'تعذر إكمال اكتشاف الشبكات.',
              discovery.errorMessage || discovery.error_message || 'انتهت المهمة دون نتائج قابلة للاستخدام.'
            );
            return;
          }

          const resultsResponse = await api.getDiscoveryResults(jobId);
          const results = resultsResponse.data || {};
          this.discoveredNetworksCache = Array.isArray(results.accessPoints)
            ? results.accessPoints
            : [];
          this.selectedDiscoveredNetwork = null;
          container.innerHTML = this.renderDiscoveredNetworks(results);
          return;
        }

        container.innerHTML = this.renderDiscoveryPending(jobId, status);
      } catch (error) {
        this.clearNetworkDiscoveryPolling();
        container.innerHTML = this.renderNetworkErrorState(
          'فشل اكتشاف الشبكات.',
          error.message
        );
      }
    };

    refresh();
    this.networkDiscoveryPoller = setInterval(refresh, 3000);
  }

  clearNetworkAnalysisPolling() {
    if (this.networkAnalysisPoller) {
      clearInterval(this.networkAnalysisPoller);
      this.networkAnalysisPoller = null;
    }
  }

  clearNetworkDiscoveryPolling() {
    if (this.networkDiscoveryPoller) {
      clearInterval(this.networkDiscoveryPoller);
      this.networkDiscoveryPoller = null;
    }
  }

  renderDiscoveryPending(jobId, status = 'QUEUED') {
    return `
      <div style="background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; border-radius: 8px; padding: 16px; line-height: 1.8;">
        <div style="font-weight: 700; margin-bottom: 6px;">جارٍ اكتشاف الشبكات المتاحة</div>
        <div>معرف المهمة: <code>${jobId}</code></div>
        <div>الحالة الحالية: ${this.getNetworkStatusText(status)}</div>
        <div style="font-size: 13px; margin-top: 8px;">سيتم تحديث هذه القائمة تلقائيًا عند وصول النتائج من الخادم.</div>
      </div>
    `;
  }

  renderDiscoveredNetworks(results) {
    const networks = Array.isArray(results.accessPoints) ? results.accessPoints : [];

    if (!networks.length) {
      return `
        <div style="background: #f8fafc; border: 1px solid #e5e7eb; color: #475569; border-radius: 8px; padding: 16px;">
          لم يتم العثور على شبكات قابلة للرصد في هذه المحاولة.
        </div>
      `;
    }

    return `
      <div style="display: grid; gap: 10px;">
        ${networks.map((network, index) => `
          <button
            type="button"
            class="discovered-network-card"
            data-ssid="${this.escapeHtmlAttribute(network.ssid || '')}"
            data-bssid="${this.escapeHtmlAttribute(network.bssid || '')}"
            onclick="window.operationsManager.selectDiscoveredNetwork(this)"
            style="text-align: right; background: white; border: 1px solid #dbe4f0; border-radius: 10px; padding: 14px; cursor: pointer; transition: 0.2s;"
          >
            <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 8px;">
              <strong style="color: #111827;">${this.escapeHtml(network.ssid || `شبكة ${index + 1}`)}</strong>
              <span style="font-size: 12px; color: #475569; background: #eef2ff; padding: 5px 10px; border-radius: 999px;">
                ${this.escapeHtml(network.security || 'UNKNOWN')}
              </span>
            </div>
            <div style="font-family: monospace; color: #334155; margin-bottom: 6px;">${this.escapeHtml(network.bssid || '-')}</div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 13px; color: #64748b;">
              <span>القناة: ${this.escapeHtml(String(network.channel ?? '-'))}</span>
              <span>الإشارة: ${this.escapeHtml(this.formatSignal(network.signalPercent, network.signalStrength))}</span>
            </div>
          </button>
        `).join('')}
        <div style="font-size: 13px; color: #64748b; padding: 4px 2px;">
          اختر أي شبكة من القائمة لتعبئة حقول SSID و BSSID تلقائيًا.
        </div>
      </div>
    `;
  }

  selectDiscoveredNetwork(button) {
    const ssidInput = document.getElementById('ssid');
    const bssidInput = document.getElementById('bssid');
    const selectedSsid = button.dataset.ssid || '';
    const selectedBssid = button.dataset.bssid || '';

    if (ssidInput) {
      ssidInput.value = selectedSsid;
    }

    if (bssidInput) {
      bssidInput.value = selectedBssid;
    }

    this.selectedDiscoveredNetwork =
      this.findMatchingDiscoveredNetwork(selectedSsid, selectedBssid) || {
        ssid: selectedSsid,
        bssid: selectedBssid
      };

    document.querySelectorAll('.discovered-network-card').forEach((item) => {
      item.style.borderColor = '#dbe4f0';
      item.style.boxShadow = 'none';
      item.style.background = 'white';
    });

    button.style.borderColor = '#6366f1';
    button.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
    button.style.background = '#f8faff';

    window.notificationManager?.show('تم اختيار الشبكة وتعبئة الحقول تلقائيًا.', 'success');
  }

  findMatchingDiscoveredNetwork(ssid, bssid) {
    const normalizedSsid = this.normalizeNetworkSsid(ssid);
    const normalizedBssid = this.normalizeNetworkBssid(bssid);

    return this.discoveredNetworksCache.find((network) => {
      const sameBssid =
        normalizedBssid &&
        this.normalizeNetworkBssid(network.bssid) === normalizedBssid;
      const sameSsid =
        normalizedSsid &&
        this.normalizeNetworkSsid(network.ssid) === normalizedSsid;

      return sameBssid && sameSsid;
    }) || null;
  }

  normalizeNetworkSsid(value) {
    return String(value || '').trim().toLocaleLowerCase();
  }

  normalizeNetworkBssid(value) {
    return String(value || '').trim().toLowerCase();
  }

  async resolveCurrentWirelessTarget(authorizationId, ssid, bssid) {
    const discoveryResponse = await api.discoverAccessPoints(authorizationId);
    const jobId = discoveryResponse.data?.jobId;

    if (!jobId) {
      throw new Error('تعذر بدء التحقق الحالي من الشبكات المتاحة.');
    }

    const results = await this.waitForDiscoveryResults(jobId);
    const accessPoints = Array.isArray(results.accessPoints) ? results.accessPoints : [];
    this.discoveredNetworksCache = accessPoints;

    const exactMatch = this.findMatchingDiscoveredNetwork(ssid, bssid);
    if (exactMatch) {
      return exactMatch;
    }

    const normalizedSsid = this.normalizeNetworkSsid(ssid);
    const sameSsid = accessPoints.find((network) => {
      return this.normalizeNetworkSsid(network.ssid) === normalizedSsid;
    });

    if (sameSsid) {
      window.notificationManager.show(
        `تم تحديث عنوان BSSID تلقائيًا إلى ${sameSsid.bssid} لأن الشبكة الحالية ظهرت بعنوان مختلف في الرصد الجديد.`,
        'info'
      );
      return sameSsid;
    }

    throw new Error(
      'لم يتم العثور على الشبكة المطلوبة في نتائج الرصد الحالية. اختر شبكة من نتيجة الاكتشاف المباشر أو أعد البحث ثم أعد المحاولة.'
    );
  }

  async waitForDiscoveryResults(jobId, timeoutMs = 15000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const statusResponse = await api.getDiscoveryJobStatus(jobId);
      const status = String(statusResponse.data?.status || '').toUpperCase();

      if (status === 'COMPLETED') {
        const resultsResponse = await api.getDiscoveryResults(jobId);
        return resultsResponse.data || {};
      }

      if (['FAILED', 'UNSUPPORTED', 'CANCELLED'].includes(status)) {
        const discoveryResponse = await api.getDiscoveryJob(jobId);
        const discovery = discoveryResponse.data?.discovery || {};
        throw new Error(
          discovery.errorMessage ||
            discovery.error_message ||
            'تعذر إكمال عملية اكتشاف الشبكات.'
        );
      }

      await this.delay(1200);
    }

    throw new Error('استغرق التحقق من الشبكات وقتًا أطول من المتوقع. أعد المحاولة بعد لحظات.');
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  renderNetworkAnalysisProgress(analysis, status) {
    const requestedTypes = Array.isArray(analysis.requestedTestTypes)
      ? analysis.requestedTestTypes.map((type) => this.translateNetworkTestType(type)).join('، ')
      : 'غير محدد';

    return `
      <div style="background: white; padding: 20px; border-radius: 10px; border: 1px solid #e5e7eb;">
        <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 16px;">
          <div>
            <h4 style="margin: 0 0 6px 0; color: #111827;">التحليل قيد التنفيذ</h4>
            <div style="font-size: 13px; color: #64748b;">تتم متابعة الحالة تلقائيًا كل بضع ثوانٍ.</div>
          </div>
          <span style="padding: 8px 12px; background: #dbeafe; color: #1d4ed8; border-radius: 999px; font-size: 12px; font-weight: 700;">
            ${this.getNetworkStatusText(status)}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
          ${this.renderMetricCard('SSID', this.escapeHtml(analysis.ssid || analysis.target?.ssid || '-'))}
          ${this.renderMetricCard('BSSID', `<code>${this.escapeHtml(analysis.bssid || analysis.target?.bssid || '-')}</code>`)}
          ${this.renderMetricCard('أنواع الاختبارات', this.escapeHtml(requestedTypes))}
          ${this.renderMetricCard('آخر تحديث', this.formatNetworkDate(analysis.updatedAt || analysis.updated_at))}
        </div>
      </div>
    `;
  }

  renderNetworkAnalysisSummary(analysis, results) {
    const status = String(analysis.status || '').toUpperCase();
    const findings = Array.isArray(results.findings) ? results.findings : [];
    const assessmentChecks = Array.isArray(results.assessmentChecks) ? results.assessmentChecks : [];
    const accessPoint = results.accessPoint || {};
    const requestedTypes = Array.isArray(analysis.requestedTestTypes)
      ? analysis.requestedTestTypes.map((type) => this.translateNetworkTestType(type)).join('، ')
      : 'غير محدد';

    if (status !== 'COMPLETED') {
      return this.renderNetworkErrorState(
        'لم يكتمل تحليل الشبكة بنجاح.',
        analysis.errorMessage || analysis.error_message || 'انتهت المهمة بحالة غير مكتملة.'
      );
    }

    return `
      <div style="display: grid; gap: 16px;">
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px;">
          <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 16px;">
            <div>
              <h4 style="margin: 0 0 6px 0; color: #111827;">اكتمل تحليل الشبكة</h4>
              <div style="font-size: 13px; color: #64748b;">تم استلام النتائج الفعلية من المحرك التنفيذي.</div>
            </div>
            <span style="padding: 8px 12px; background: #dcfce7; color: #166534; border-radius: 999px; font-size: 12px; font-weight: 700;">
              مكتمل
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
            ${this.renderMetricCard('SSID', this.escapeHtml(results.targetSsid || analysis.ssid || '-'))}
            ${this.renderMetricCard('BSSID', `<code>${this.escapeHtml(results.targetBssid || analysis.bssid || '-')}</code>`)}
            ${this.renderMetricCard('نوع الحماية', this.escapeHtml(results.security || accessPoint.security || 'غير معروف'))}
            ${this.renderMetricCard('عدد النتائج', String(results.findingCount ?? findings.length))}
            ${this.renderMetricCard('القناة', this.escapeHtml(String(accessPoint.channel ?? '-')))}
            ${this.renderMetricCard('قوة الإشارة', this.escapeHtml(this.formatSignal(accessPoint.signalPercent, accessPoint.signalStrength)))}
            ${this.renderMetricCard('نوع الراديو', this.escapeHtml(accessPoint.radioType || 'غير معروف'))}
            ${this.renderMetricCard('أنواع الاختبارات', this.escapeHtml(requestedTypes))}
          </div>
        </div>

        ${findings.length ? `
          <div style="display: grid; gap: 12px;">
            ${findings.map((finding) => this.renderNetworkFindingCard(finding)).join('')}
          </div>
        ` : `
          <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px; color: #475569;">
            لم يتم اكتشاف ملاحظات أمنية إضافية في هذه الجولة.
          </div>
        `}

        ${assessmentChecks.length ? `
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 18px;">
            <h4 style="margin: 0 0 12px 0; color: #111827;">ما الذي تم التحقق منه فعليًا</h4>
            <div style="display: grid; gap: 10px;">
              ${assessmentChecks.map((check) => this.renderAssessmentCheck(check)).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  renderNetworkFindingCard(finding) {
    const severity = String(finding.severity || 'LOW').toUpperCase();
    const evidence = Array.isArray(finding.evidence) ? finding.evidence : [];
    const colors = {
      CRITICAL: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
      HIGH: { bg: '#fff7ed', border: '#f97316', text: '#9a3412' },
      MEDIUM: { bg: '#fefce8', border: '#eab308', text: '#854d0e' },
      LOW: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' }
    };
    const color = colors[severity] || colors.LOW;

    return `
      <div style="background: ${color.bg}; border-right: 4px solid ${color.border}; border-radius: 10px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; gap: 12px; align-items: start; margin-bottom: 10px;">
          <div>
            <h4 style="margin: 0 0 6px 0; color: #111827;">${this.escapeHtml(finding.title || finding.type || 'نتيجة أمنية')}</h4>
            <div style="font-size: 12px; color: #64748b;">${this.escapeHtml(finding.type || '')}</div>
          </div>
          <span style="padding: 6px 10px; border-radius: 999px; background: white; color: ${color.text}; font-size: 12px; font-weight: 700;">
            ${this.getSeverityArabicLabel(severity)}
          </span>
        </div>
        <p style="margin: 0 0 10px 0; color: #374151; line-height: 1.8;">${this.escapeHtml(finding.description || 'لا يوجد وصف تفصيلي.')}</p>
        ${evidence.length ? `
          <div style="background: rgba(255,255,255,0.75); border-radius: 8px; padding: 12px; margin-bottom: 10px;">
            <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">الأدلة</div>
            ${evidence.map((item) => `
              <div style="font-size: 13px; color: #334155; margin-bottom: 6px;">${this.escapeHtml(item.description || '')}</div>
            `).join('')}
          </div>
        ` : ''}
        ${finding.remediation ? `
          <div style="font-size: 13px; color: #065f46; background: #ecfdf5; border-right: 3px solid #10b981; border-radius: 8px; padding: 12px;">
            <strong>التوصية:</strong> ${this.escapeHtml(finding.remediation)}
          </div>
        ` : ''}
      </div>
    `;
  }

  renderNetworkErrorState(title, message) {
    const translatedMessage = this.translateNetworkError(message);

    return `
      <div style="background: #fee2e2; padding: 20px; border-radius: 8px; border-right: 4px solid #dc2626;">
        <div style="display: flex; align-items: start; gap: 10px;">
          <i class="fas fa-exclamation-circle" style="color: #dc2626; font-size: 24px;"></i>
          <div>
            <h4 style="margin: 0 0 6px 0; color: #dc2626;">${this.escapeHtml(title)}</h4>
            <p style="margin: 0; color: #991b1b; font-size: 14px; line-height: 1.7;">${this.escapeHtml(translatedMessage)}</p>
          </div>
        </div>
      </div>
    `;
  }

  renderMetricCard(label, value) {
    return `
      <div style="padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb;">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${label}</div>
        <div style="font-weight: 600; color: #111827; font-size: 14px; line-height: 1.7;">${value || '-'}</div>
      </div>
    `;
  }

  renderAssessmentCheck(check) {
    const palette = {
      passed: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', label: 'ناجح' },
      warning: { bg: '#fff7ed', border: '#f97316', text: '#9a3412', label: 'يتطلب انتباه' },
      info: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8', label: 'معلومة' }
    };
    const style = palette[check.status] || palette.info;

    return `
      <div style="background: ${style.bg}; border-right: 4px solid ${style.border}; border-radius: 10px; padding: 12px;">
        <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 6px;">
          <strong style="color: #111827;">${this.escapeHtml(check.title || 'تحقق')}</strong>
          <span style="font-size: 11px; color: ${style.text}; background: rgba(255,255,255,0.8); padding: 4px 8px; border-radius: 999px;">${style.label}</span>
        </div>
        <div style="font-size: 13px; color: #374151; line-height: 1.8;">
          ${this.escapeHtml(check.detail || '')}
        </div>
      </div>
    `;
  }

  getNetworkStatusText(status) {
    const labels = {
      QUEUED: 'في الانتظار',
      CLAIMED: 'تم استلام المهمة',
      RUNNING: 'قيد التنفيذ',
      ARTIFACT_UPLOADING: 'جارٍ رفع النتائج',
      COMPLETED: 'مكتمل',
      FAILED: 'فشل',
      UNSUPPORTED: 'غير مدعوم',
      CANCELLED: 'ملغي'
    };
    return labels[String(status || '').toUpperCase()] || String(status || '-');
  }

  getSeverityArabicLabel(severity) {
    const labels = {
      CRITICAL: 'حرج',
      HIGH: 'عالٍ',
      MEDIUM: 'متوسط',
      LOW: 'منخفض'
    };
    return labels[String(severity || '').toUpperCase()] || String(severity || '-');
  }

  translateNetworkTestType(type) {
    const labels = {
      TRAFFIC_ANALYSIS: 'تحليل المرور اللاسلكي',
      WPA_HANDSHAKE_CAPTURE: 'التقاط WPA Handshake',
      DEAUTH_ATTACK: 'اختبار Deauthentication',
      WEP_CRACK: 'اختبار كسر WEP',
      EVIL_TWIN: 'اختبار Evil Twin'
    };
    return labels[type] || type;
  }

  getNetworkTestTypeCatalog() {
    if (Array.isArray(this.networkRuntimeReadiness?.tests) && this.networkRuntimeReadiness.tests.length > 0) {
      return this.networkRuntimeReadiness.tests.map((test) => ({
        id: test.id,
        label: test.label,
        description: test.reason || test.description,
        supported: Boolean(test.supported),
        defaultChecked: test.id === 'TRAFFIC_ANALYSIS' && Boolean(test.supported),
      }));
    }

    return [
      {
        id: 'TRAFFIC_ANALYSIS',
        label: 'تحليل المرور اللاسلكي',
        description: 'رصد سلبي للشبكة، قراءة مؤشرات الحماية، وفحص المؤشرات الظاهرة فعليًا من النظام.',
        supported: true,
        defaultChecked: true
      },
      {
        id: 'WPA_HANDSHAKE_CAPTURE',
        label: 'التقاط WPA Handshake',
        description: 'يحتاج بطاقة لاسلكية بوضع monitor وrunner متخصص وأدوات إضافية غير مفعلة في هذا التشغيل.',
        supported: false,
        defaultChecked: false
      },
      {
        id: 'DEAUTH_ATTACK',
        label: 'اختبار Deauthentication',
        description: 'اختبار هجومي غير مفعل في هذا النظام الحالي لأنه يحتاج runner هجومي مصرح به.',
        supported: false,
        defaultChecked: false
      },
      {
        id: 'WEP_CRACK',
        label: 'اختبار كسر WEP',
        description: 'غير متاح في هذا التشغيل الحالي، ويحتاج بيئة منفصلة وأذونات إضافية.',
        supported: false,
        defaultChecked: false
      },
      {
        id: 'EVIL_TWIN',
        label: 'اختبار Evil Twin',
        description: 'غير مفعل حاليًا لأن هذا السيناريو يحتاج بنية هجومية ورقابة تشغيل خاصة.',
        supported: false,
        defaultChecked: false
      }
    ];
  }

  renderRuntimeReadinessSummary(readiness) {
    const tools = Array.isArray(readiness?.tools) ? readiness.tools : [];
    const capabilities = Array.isArray(readiness?.capabilities) ? readiness.capabilities : [];

    return `
      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px;">
        <div style="font-weight: 700; color: #111827; margin-bottom: 8px;">جاهزية محرك التنفيذ الحالي</div>
        <div style="display: grid; gap: 6px; font-size: 13px; color: #475569; line-height: 1.7;">
          <div><strong>النظام:</strong> ${this.escapeHtml(String(readiness?.platform || '-'))}</div>
          <div><strong>الأدوات المكتشفة:</strong> ${this.escapeHtml(tools.length ? tools.join('، ') : 'لا توجد أدوات لاسلكية كافية')}</div>
          <div><strong>القدرات المفعلة:</strong> ${this.escapeHtml(capabilities.length ? capabilities.join('، ') : 'لا توجد قدرات معلنة')}</div>
        </div>
      </div>
    `;
  }

  formatSignal(signalPercent, signalStrength) {
    if (typeof signalPercent === 'number' && typeof signalStrength === 'number') {
      return `${signalPercent}% (${signalStrength} dBm)`;
    }
    if (typeof signalPercent === 'number') {
      return `${signalPercent}%`;
    }
    if (typeof signalStrength === 'number') {
      return `${signalStrength} dBm`;
    }
    return 'غير معروف';
  }

  formatNetworkDate(dateString) {
    if (!dateString) {
      return '-';
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString('ar-SA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  escapeHtmlAttribute(value) {
    return this.escapeHtml(value).replace(/`/g, '&#96;');
  }

  translateNetworkError(message) {
    const text = String(message || '').trim();

    if (!text) {
      return 'حدث خطأ غير متوقع.';
    }

    const knownErrors = {
      'Target wireless network was not found in the current scan results':
        'لم يتم العثور على الشبكة المطلوبة في نتائج الرصد الحالية. اختر شبكة من نتيجة الاكتشاف المباشر أو أعد البحث ثم أعد المحاولة.',
      'Wireless discovery is not supported on this runner':
        'بيئة التنفيذ الحالية لا تدعم اكتشاف الشبكات اللاسلكية.',
      'Wireless assessment is not supported on this runner':
        'بيئة التنفيذ الحالية لا تدعم تحليل الشبكات اللاسلكية.',
    };

    return knownErrors[text] || text;
  }

  /**
   * اختيار شبكة من القائمة المكتشفة
   */
  selectNetwork(bssid, ssid) {
    const bssidInput = document.getElementById('bssid');
    const ssidInput = document.getElementById('ssid');
    
    if (bssidInput) bssidInput.value = bssid;
    if (ssidInput) ssidInput.value = ssid;
    
    window.notificationManager.show('تم اختيار الشبكة', 'success');
  }

  /**
   * إنشاء modal
   */
  createModal(title, content) {
    try {
      window.appLogger?.debug('✓ Creating modal:', title);
      
      // إزالة أي modal موجود
      this.closeModal();

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.display = 'block';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
          <div class="modal-header">
            <h2>${title}</h2>
            <button class="btn-icon" onclick="window.operationsManager.closeModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
        </div>
      `;

      window.appLogger?.debug('✓ Modal element created');
      
      // التحقق من وجود document.body
      if (!document.body) {
        throw new Error('document.body غير موجود!');
      }
      
      document.body.appendChild(modal);
      window.appLogger?.debug('✓ Modal appended to body');

      // إغلاق عند النقر خارج المحتوى
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });

      window.appLogger?.debug('✓ Modal created successfully');
      return modal;
    } catch (error) {
      console.error('❌ Error in createModal:', error);
      throw error;
    }
  }

  /**
   * إغلاق modal
   */
  closeModal() {
    this.clearNetworkAnalysisPolling();
    this.clearNetworkDiscoveryPolling();

    if (this.currentModal) {
      this.currentModal.remove();
      this.currentModal = null;
    }
    
    // إزالة أي modals أخرى
    document.querySelectorAll('.modal').forEach(modal => {
      if (!modal.id || modal.id !== 'loginModal') {
        modal.remove();
      }
    });

    document.querySelectorAll('.discovered-network-card').forEach((button) => {
      button.removeEventListener('click', this.handleDiscoveredNetworkSelection);
    });
  }

  /**
   * عرض نافذة تقدم فحص الويب
   */
  showScanProgress(scanId, targetUrl) {
    const progressModal = document.createElement('div');
    progressModal.className = 'modal';
    progressModal.style.display = 'block';
    progressModal.innerHTML = `
      <div class="modal-content" style="max-width: 95%; width: 1200px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h2>
            <i class="fas fa-spinner fa-spin"></i>
            جاري فحص الموقع...
          </h2>
          <button class="btn-icon" onclick="this.closest('.modal').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <!-- معلومات الفحص -->
          <div class="scan-info-card" style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <div style="margin-bottom: 10px;">
              <strong style="color: #666;">الهدف:</strong>
              <span style="color: #333;">${targetUrl}</span>
            </div>
            <div style="margin-bottom: 10px;">
              <strong style="color: #666;">معرف الفحص:</strong>
              <span style="color: #333; font-family: monospace;">${scanId}</span>
            </div>
            <div>
              <strong style="color: #666;">الحالة:</strong>
              <span id="scan-status-badge" class="status-badge" style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">جاري التنفيذ</span>
            </div>
          </div>

          <!-- شريط التقدم -->
          <div style="margin-bottom: 20px;">
            <div style="background: #e5e7eb; height: 30px; border-radius: 15px; overflow: hidden; position: relative;">
              <div id="progress-bar" style="background: linear-gradient(90deg, #3b82f6, #8b5cf6); height: 100%; width: 0%; transition: width 0.3s; display: flex; align-items: center; justify-content: center;">
                <span id="progress-text" style="color: white; font-weight: bold; font-size: 14px; position: absolute; left: 50%; transform: translateX(-50%);">0%</span>
              </div>
            </div>
            <p id="progress-message" style="text-align: center; color: #666; margin-top: 10px;">جاري تهيئة الفحص...</p>
          </div>

          <!-- إحصائيات الفحص -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #3b82f6;" id="urls-scanned">0</div>
              <div style="color: #666; font-size: 12px;">صفحات تم فحصها</div>
            </div>
            <div id="vulns-card" style="background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #f59e0b;" id="vulns-found">0</div>
              <div style="color: #666; font-size: 12px;">ثغرات مكتشفة</div>
            </div>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;" id="scan-duration">0s</div>
              <div style="color: #666; font-size: 12px;">المدة</div>
            </div>
          </div>

          <!-- نتائج الفحص (مخفية في البداية) -->
          <div id="scan-results" style="display: none;">
            <h3 style="margin-bottom: 15px;">
              <i class="fas fa-check-circle" style="color: #10b981;"></i>
              نتائج الفحص
            </h3>
            <div id="scan-results-content"></div>
          </div>
          
          <!-- زر عرض الثغرات (يظهر عند وجود ثغرات) -->
          <div id="show-vulnerabilities-section" style="display: none; text-align: center; margin-top: 15px;">
            <button id="show-vulns-btn" class="btn-primary" style="padding: 12px 24px; font-size: 14px;">
              <i class="fas fa-bug"></i>
              عرض قائمة الثغرات المكتشفة
            </button>
          </div>

          <!-- سجل الفحص -->
          <div style="margin-top: 20px;">
            <h4 style="margin-bottom: 10px; color: #666;">
              <i class="fas fa-list"></i>
              سجل الفحص
            </h4>
            <div id="scan-log" style="background: #1f2937; color: #e5e7eb; padding: 15px; border-radius: 8px; max-height: 200px; overflow-y: auto; font-family: monospace; font-size: 12px;">
              <div>[${new Date().toLocaleTimeString('ar-SA')}] تم بدء الفحص...</div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onclick="this.closest('.modal').remove()">
            إغلاق
          </button>
          <button id="stop-scan-btn" class="btn-danger" onclick="window.operationsManager.stopWebScan('${scanId}')">
            <i class="fas fa-stop"></i>
            إيقاف الفحص
          </button>
          <button id="view-details-btn" class="btn-primary" style="display: none;" onclick="window.operationsManager.viewScanDetails('${scanId}')">
            <i class="fas fa-eye"></i>
            عرض التفاصيل الكاملة
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(progressModal);
    
    // بدء مراقبة التقدم
    this.monitorWebScanProgress(scanId);
  }

  /**
   * مراقبة تقدم فحص الويب
   */
  async monitorWebScanProgress(scanId) {
    let progress = 0;
    let checkCount = 0;
    const maxChecks = 300; // 5 دقائق (300 * 1 ثانية)
    const startTime = Date.now();
    const seenLogIds = new Set();

    const checkProgress = async () => {
      try {
        checkCount++;
        
        // التحقق من حالة الفحص من الخادم
        const [response, logsResponse] = await Promise.all([
          api.getScanStatus(scanId),
          api.getScanLogs(scanId).catch(() => ({ success: false, data: { logs: [] } }))
        ]);
        
        window.appLogger?.debug(`[Monitor ${checkCount}] Status response:`, response);
        
        if (response.success && response.data) {
          const {
            status,
            total_requests,
            total_vulnerabilities,
            progress: reportedProgress,
            statusMessage,
            page_errors,
            errorMessage
          } = response.data;
          
          window.appLogger?.debug(`[Monitor ${checkCount}] Status: ${status}, Requests: ${total_requests}, Vulns: ${total_vulnerabilities}`);

          const logs = logsResponse?.data?.logs || [];
          logs.forEach((log) => {
            if (!log?.id || seenLogIds.has(log.id)) {
              return;
            }
            seenLogIds.add(log.id);
            this.addLogEntry(this.translateScanLogMessage(log.message, log.metadata));
          });
          
          // تحديث الإحصائيات
          const urlsElement = document.getElementById('urls-scanned');
          const vulnsElement = document.getElementById('vulns-found');
          const durationElement = document.getElementById('scan-duration');
          
          if (urlsElement) urlsElement.textContent = total_requests || 0;
          if (vulnsElement) vulnsElement.textContent = total_vulnerabilities || 0;
          
          // تحديث المدة
          const duration = Math.floor((Date.now() - startTime) / 1000);
          if (durationElement) durationElement.textContent = duration + 's';
          
          // تحديث التقدم
          if (status === 'RUNNING' || status === 'PENDING') {
            if (typeof reportedProgress === 'number') {
              progress = reportedProgress;
            } else {
              progress = Math.min(90, Math.max(progress, Math.round((checkCount / maxChecks) * 85)));
            }
            this.updateProgressBar(
              progress,
              statusMessage || `تم فحص ${total_requests || 0} صفحة حتى الآن`
            );
            if (page_errors > 0) {
              this.addLogEntry(`تنبيه: تعذر الوصول إلى ${page_errors} صفحة أثناء الفحص، وتمت متابعة التنفيذ.`);
            }
          } else if (status === 'COMPLETED') {
            this.updateProgressBar(100, statusMessage || 'اكتمل الفحص وتم حفظ النتائج');
            this.addLogEntry('✅ اكتمل الفحص بنجاح!');
            this.addLogEntry(`📊 النتائج النهائية: ${total_requests || 0} صفحة، ${total_vulnerabilities || 0} ثغرة`);
            
            // انتظار ثانية واحدة للتأكد من حفظ جميع البيانات
            await this.sleep(1000);
            
            window.appLogger?.debug(`[Monitor] Calling displayWebScanResults with scanId: ${scanId}`);
            await this.displayWebScanResults(scanId);
            return;
          } else if (status === 'FAILED' || status === 'STOPPED') {
            this.addLogEntry(`❌ ${status === 'FAILED' ? 'فشل الفحص' : 'تم إيقاف الفحص'}${errorMessage ? `: ${errorMessage}` : ''}`);
            this.updateScanStatus(status === 'FAILED' ? 'فشل' : 'متوقف', 'failed');
            return;
          }
        }

        // الاستمرار في المراقبة
        if (checkCount < maxChecks) {
          setTimeout(checkProgress, 1000);
        } else {
          this.addLogEntry('⏱️ انتهت مهلة الفحص');
          this.updateScanStatus('انتهت المهلة', 'timeout');
        }
      } catch (error) {
        console.error('Error checking scan progress:', error);
        this.addLogEntry(`❌ خطأ في التحقق من التقدم: ${error.message}`);
        
        // إعادة المحاولة في حالة الخطأ
        if (checkCount < maxChecks) {
          setTimeout(checkProgress, 2000); // انتظار ثانيتين قبل إعادة المحاولة
        }
      }
    };

    checkProgress();
  }

  /**
   * دالة مساعدة للانتظار
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * تحديث شريط التقدم
   */
  updateProgressBar(progress, customMessage = null) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progressMessage = document.getElementById('progress-message');

    if (progressBar) {
      progressBar.style.width = progress + '%';
    }
    if (progressText) {
      progressText.textContent = Math.round(progress) + '%';
    }
    if (progressMessage) {
      if (customMessage) {
        progressMessage.textContent = customMessage;
      } else if (progress < 30) {
        progressMessage.textContent = 'جاري الزحف إلى الصفحات...';
      } else if (progress < 60) {
        progressMessage.textContent = 'جاري فحص الثغرات...';
      } else if (progress < 90) {
        progressMessage.textContent = 'جاري تحليل النتائج...';
      } else {
        progressMessage.textContent = 'جاري إنهاء الفحص...';
      }
    }
  }

  /**
   * إضافة إدخال للسجل
   */
  addLogEntry(message) {
    const logContainer = document.getElementById('scan-log');
    if (!logContainer) return;

    const logEntry = document.createElement('div');
    logEntry.textContent = `[${new Date().toLocaleTimeString('ar-SA')}] ${message}`;
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  /**
   * تحديث حالة الفحص
   */
  updateScanStatus(statusText, statusClass) {
    const statusBadge = document.getElementById('scan-status-badge');
    if (statusBadge) {
      const colors = {
        'completed': '#10b981',
        'failed': '#ef4444',
        'timeout': '#f59e0b'
      };
      statusBadge.style.background = colors[statusClass] || '#6b7280';
      statusBadge.textContent = statusText;
    }

    // إخفاء زر الإيقاف
    const stopBtn = document.getElementById('stop-scan-btn');
    if (stopBtn) {
      stopBtn.style.display = 'none';
    }

    // إظهار زر عرض التفاصيل
    const viewBtn = document.getElementById('view-details-btn');
    if (viewBtn && statusClass === 'completed') {
      viewBtn.style.display = 'inline-block';
    }
  }

  /**
   * عرض نتائج فحص الويب
   */
  async displayWebScanResults(scanId) {
    try {
      // حفظ scanId للاستخدام لاحقاً
      this.currentScanId = scanId;

      const [resultsResponse, vulnerabilitiesResponse, logsResponse, artifactsResponse] = await Promise.all([
        api.getScanResults(scanId),
        api.getScanVulnerabilities(scanId),
        api.getScanLogs(scanId).catch(() => ({ data: { logs: [] } })),
        api.getScanArtifacts(scanId).catch(() => ({ data: { artifacts: [] } }))
      ]);

      const results = resultsResponse.data || {};
      const vulnerabilities = vulnerabilitiesResponse.data || [];
      const logs = logsResponse.data?.logs || [];
      const artifacts = artifactsResponse.data?.artifacts || [];
      const resultsSection = document.getElementById('scan-results');
      const resultsContent = document.getElementById('scan-results-content');
      const showVulnsSection = document.getElementById('show-vulnerabilities-section');
      const completedChecks = Array.isArray(results.completedChecks) ? results.completedChecks : [];
      const limitations = Array.isArray(results.limitations) ? results.limitations : [];
      const pageErrors = Array.isArray(results.pageErrors) ? results.pageErrors : [];

      if (resultsSection && resultsContent) {
        resultsSection.style.display = 'block';

        if (vulnerabilities.length === 0) {
          resultsContent.innerHTML = `
            <div style="padding: 24px; background: #eff6ff; border-radius: 8px; border-right: 4px solid #3b82f6;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <i class="fas fa-info-circle" style="font-size: 28px; color: #2563eb;"></i>
                <div>
                  <p style="color: #1d4ed8; margin: 0; font-size: 18px; font-weight: bold;">لم يتم رصد ثغرات ضمن الفحوصات المنفذة</p>
                  <p style="color: #475569; margin: 6px 0 0 0; font-size: 14px;">هذه ليست شهادة أمان كاملة، بل نتيجة الفحص غير التداخلي الذي نُفذ على الصفحات المتاحة.</p>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px;">
                <div style="background: white; padding: 14px; border-radius: 8px;">
                  <div style="color: #64748b; font-size: 12px;">صفحات تم فحصها</div>
                  <div style="font-size: 20px; font-weight: bold; color: #0f172a;">${results.totalRequests || 0}</div>
                </div>
                <div style="background: white; padding: 14px; border-radius: 8px;">
                  <div style="color: #64748b; font-size: 12px;">متوسط الاستجابة</div>
                  <div style="font-size: 20px; font-weight: bold; color: #0f172a;">${results.averageResponseTimeMs ? `${results.averageResponseTimeMs}ms` : 'غير متاح'}</div>
                </div>
                <div style="background: white; padding: 14px; border-radius: 8px;">
                  <div style="color: #64748b; font-size: 12px;">صفحات تعذر الوصول لها</div>
                  <div style="font-size: 20px; font-weight: bold; color: ${pageErrors.length ? '#dc2626' : '#0f172a'};">${pageErrors.length}</div>
                </div>
              </div>
              ${completedChecks.length ? `
                <div style="margin-top: 16px;">
                  <div style="font-size: 13px; color: #334155; font-weight: bold; margin-bottom: 8px;">ما الذي تم التحقق منه فعليًا</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${completedChecks.map((item) => `
                      <span style="background: white; color: #1e3a8a; border: 1px solid #bfdbfe; padding: 6px 10px; border-radius: 999px; font-size: 12px;">${item}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
              ${limitations.length ? `
                <div style="margin-top: 16px; background: #ffffff; border-radius: 8px; padding: 12px;">
                  <div style="font-size: 13px; color: #334155; font-weight: bold; margin-bottom: 8px;">قيود يجب معرفتها</div>
                  <ul style="margin: 0; padding-right: 18px; color: #475569; font-size: 13px; line-height: 1.8;">
                    ${limitations.map((item) => `<li>${item}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          `;
        } else {
          const normalizedVulnerabilities = vulnerabilities.map((v) => ({
            ...v,
            severity: String(v.severity || 'LOW').toUpperCase()
          }));
          const severityCounts = {
            CRITICAL: normalizedVulnerabilities.filter(v => v.severity === 'CRITICAL').length,
            HIGH: normalizedVulnerabilities.filter(v => v.severity === 'HIGH').length,
            MEDIUM: normalizedVulnerabilities.filter(v => v.severity === 'MEDIUM').length,
            LOW: normalizedVulnerabilities.filter(v => v.severity === 'LOW').length
          };

          resultsContent.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
              <div style="background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${severityCounts.CRITICAL}</div>
                <div style="color: #666; font-size: 12px;">حرجة</div>
              </div>
              <div style="background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${severityCounts.HIGH}</div>
                <div style="color: #666; font-size: 12px;">عالية</div>
              </div>
              <div style="background: #fef9c3; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #eab308;">${severityCounts.MEDIUM}</div>
                <div style="color: #666; font-size: 12px;">متوسطة</div>
              </div>
              <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">${severityCounts.LOW}</div>
                <div style="color: #666; font-size: 12px;">منخفضة</div>
              </div>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 15px; border: 2px solid #e5e7eb;">
              <h4 style="margin: 0 0 15px 0; color: #111827; font-size: 18px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; font-weight: bold;">
                <i class="fas fa-bug" style="color: #3b82f6;"></i> قائمة الثغرات المكتشفة (${normalizedVulnerabilities.length} ثغرة)
              </h4>
              <div style="max-height: 500px; overflow-y: auto; padding-left: 5px;">
                ${normalizedVulnerabilities.map((v, i) => `
                  <div style="background: white; padding: 15px; margin-bottom: 12px; border-radius: 8px; border-right: 5px solid ${
                    v.severity === 'CRITICAL' ? '#dc2626' :
                    v.severity === 'HIGH' ? '#f59e0b' :
                    v.severity === 'MEDIUM' ? '#eab308' : '#3b82f6'
                  }; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                      <div style="flex: 1;">
                        <div style="font-size: 15px; font-weight: bold; color: #111827; margin-bottom: 5px;">
                          <span style="background: #e5e7eb; color: #374151; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">#${i + 1}</span>
                          ${v.type.replace(/_/g, ' ')}
                        </div>
                        <div style="font-size: 13px; color: #6b7280; margin-top: 5px;">
                          <i class="fas fa-tag" style="color: #3b82f6;"></i> <strong>النوع:</strong> ${this.translateVulnType(v.type)}
                        </div>
                      </div>
                      <span style="background: ${
                        v.severity === 'CRITICAL' ? '#fef2f2' :
                        v.severity === 'HIGH' ? '#fef3c7' :
                        v.severity === 'MEDIUM' ? '#fef9c3' : '#f0f9ff'
                      }; color: ${
                        v.severity === 'CRITICAL' ? '#dc2626' :
                        v.severity === 'HIGH' ? '#f59e0b' :
                        v.severity === 'MEDIUM' ? '#eab308' : '#3b82f6'
                      }; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: bold; white-space: nowrap; border: 2px solid ${
                        v.severity === 'CRITICAL' ? '#dc2626' :
                        v.severity === 'HIGH' ? '#f59e0b' :
                        v.severity === 'MEDIUM' ? '#eab308' : '#3b82f6'
                      };">${this.translateSeverity(v.severity)}</span>
                    </div>
                    <div style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-right: 3px solid #3b82f6;">
                      <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: bold;">
                        <i class="fas fa-map-marker-alt" style="color: #3b82f6;"></i> المكان في الموقع:
                      </div>
                      <div style="font-size: 13px; color: #111827; word-break: break-all; font-family: 'Courier New', monospace; background: white; padding: 8px; border-radius: 4px;">
                        ${v.location}
                      </div>
                    </div>
                    <div style="margin-bottom: 10px;">
                      <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: bold;">
                        <i class="fas fa-info-circle" style="color: #3b82f6;"></i> الوصف التفصيلي:
                      </div>
                      <div style="font-size: 13px; color: #374151; line-height: 1.6; background: #f9fafb; padding: 10px; border-radius: 4px;">
                        ${v.description}
                      </div>
                    </div>
                    ${v.cvss_score ? `
                      <div style="display: inline-block; background: #f0f9ff; color: #1e40af; padding: 6px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; border: 1px solid #3b82f6;">
                        <i class="fas fa-chart-line"></i> CVSS Score: ${v.cvss_score}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
              ${completedChecks.length ? `
                <div style="margin-top: 12px; padding: 12px; background: white; border-radius: 6px;">
                  <div style="font-size: 13px; color: #334155; font-weight: bold; margin-bottom: 8px;">الفحوصات التي تم تنفيذها فعليًا</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${completedChecks.map((item) => `
                      <span style="background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; padding: 6px 10px; border-radius: 999px; font-size: 12px;">${item}</span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;

          if (showVulnsSection) {
            showVulnsSection.style.display = 'block';
            const showVulnsBtn = document.getElementById('show-vulns-btn');
            if (showVulnsBtn && this.currentScanId) {
              const currentScanId = this.currentScanId;
              showVulnsBtn.onclick = () => {
                this.showVulnerabilitiesModal(currentScanId);
              };
            }
          }

          const vulnsCard = document.getElementById('vulns-card');
          if (vulnsCard && this.currentScanId && !vulnsCard.dataset.bound) {
            vulnsCard.style.cursor = 'pointer';
            vulnsCard.title = 'اضغط لعرض قائمة الثغرات';
            const currentScanId = this.currentScanId;
            vulnsCard.onclick = () => {
              this.showVulnerabilitiesModal(currentScanId);
            };
            vulnsCard.dataset.bound = 'true';

            const clickHint = document.createElement('div');
            clickHint.style.cssText = 'color: #f59e0b; font-size: 10px; margin-top: 5px;';
            clickHint.innerHTML = '<i class="fas fa-mouse-pointer"></i> اضغط للعرض';
            vulnsCard.appendChild(clickHint);
          }
        }

        if (logs.length) {
          logs.forEach((log) => this.addLogEntry(this.translateScanLogMessage(log.message, log.metadata)));
        }
        if (artifacts.length) {
          this.addLogEntry(`تم حفظ ${artifacts.length} ملف ناتج من الفحص للمراجعة والتقارير.`);
        }

        this.updateScanStatus('مكتمل', 'completed');
      }
    } catch (error) {
      console.error('Error displaying scan results:', error);
      this.addLogEntry('❌ خطأ في عرض النتائج');
      this.updateScanStatus('خطأ', 'failed');
    }
  }

  /**
   * عرض modal الثغرات المكتشفة
   */
  async showVulnerabilitiesModal(scanId) {
    try {
      // عرض loading
      if (window.loadingManager && window.loadingManager.show) {
        window.loadingManager.show();
      }
      
      window.appLogger?.debug(`Loading vulnerabilities for scan: ${scanId}`);
      
      // جلب الثغرات
      const response = await api.get(`/scans/web/${scanId}/vulnerabilities`);
      
      window.appLogger?.debug('Vulnerabilities response:', response);
      
      if (!response.success || !response.data) {
        throw new Error('فشل تحميل الثغرات');
      }
      
      const vulnerabilities = Array.isArray(response.data) ? response.data : [];
      
      window.appLogger?.debug(`Found ${vulnerabilities.length} vulnerabilities`);
      
      // إنشاء modal
      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.style.display = 'block';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header">
            <h2>
              <i class="fas fa-bug"></i>
              الثغرات المكتشفة (${vulnerabilities.length})
            </h2>
            <button class="btn-icon" onclick="this.closest('.modal').remove()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal-body">
            ${this.renderVulnerabilitiesList(vulnerabilities)}
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="this.closest('.modal').remove()">
              إغلاق
            </button>
            <button class="btn-primary" onclick="window.operationsManager.downloadVulnerabilitiesReport('${scanId}')">
              <i class="fas fa-download"></i>
              تحميل التقرير
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
      
      // إخفاء loading
      if (window.loadingManager && window.loadingManager.hide) {
        window.loadingManager.hide();
      }
    } catch (error) {
      console.error('Error showing vulnerabilities modal:', error);
      
      // إخفاء loading
      if (window.loadingManager && window.loadingManager.hide) {
        window.loadingManager.hide();
      }
      
      // عرض رسالة خطأ
      if (window.notificationManager && window.notificationManager.show) {
        window.notificationManager.show('فشل تحميل الثغرات: ' + error.message, 'error');
      } else {
        alert('فشل تحميل الثغرات: ' + error.message);
      }
    }
  }

  /**
   * عرض قائمة الثغرات
   */
  renderVulnerabilitiesList(vulnerabilities) {
    if (!vulnerabilities || vulnerabilities.length === 0) {
      return `
        <div style="text-align: center; padding: 60px;">
          <i class="fas fa-shield-alt" style="font-size: 64px; color: #10b981;"></i>
          <p style="color: #10b981; margin-top: 20px; font-size: 20px;">لم يتم اكتشاف ثغرات! 🎉</p>
          <p style="color: #666; font-size: 16px;">الموقع آمن من الثغرات الشائعة</p>
        </div>
      `;
    }

    // تجميع الثغرات حسب الخطورة
    const severityCounts = {
      CRITICAL: vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
      HIGH: vulnerabilities.filter(v => v.severity === 'HIGH').length,
      MEDIUM: vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
      LOW: vulnerabilities.filter(v => v.severity === 'LOW').length
    };

    return `
      <!-- إحصائيات الخطورة -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px;">
        <div style="background: #fef2f2; padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #fecaca;">
          <div style="font-size: 32px; font-weight: bold; color: #dc2626;">${severityCounts.CRITICAL}</div>
          <div style="color: #991b1b; font-size: 14px; font-weight: bold; margin-top: 5px;">🔴 حرجة</div>
        </div>
        <div style="background: #fef3c7; padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #fde68a;">
          <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${severityCounts.HIGH}</div>
          <div style="color: #92400e; font-size: 14px; font-weight: bold; margin-top: 5px;">🟠 عالية</div>
        </div>
        <div style="background: #fef9c3; padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #fde047;">
          <div style="font-size: 32px; font-weight: bold; color: #eab308;">${severityCounts.MEDIUM}</div>
          <div style="color: #713f12; font-size: 14px; font-weight: bold; margin-top: 5px;">🟡 متوسطة</div>
        </div>
        <div style="background: #f0f9ff; padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #bae6fd;">
          <div style="font-size: 32px; font-weight: bold; color: #3b82f6;">${severityCounts.LOW}</div>
          <div style="color: #1e40af; font-size: 14px; font-weight: bold; margin-top: 5px;">🟢 منخفضة</div>
        </div>
      </div>

      <!-- قائمة الثغرات -->
      <div style="background: #f9fafb; padding: 20px; border-radius: 10px;">
        <h3 style="margin: 0 0 20px 0; color: #111827; font-size: 18px;">
          <i class="fas fa-list"></i> قائمة الثغرات التفصيلية
        </h3>
        
        ${vulnerabilities.map((vuln, index) => {
          const severityColors = {
            'CRITICAL': { bg: '#fef2f2', border: '#dc2626', text: '#991b1b', badge: '#dc2626' },
            'HIGH': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', badge: '#f59e0b' },
            'MEDIUM': { bg: '#fef9c3', border: '#eab308', text: '#713f12', badge: '#eab308' },
            'LOW': { bg: '#f0f9ff', border: '#3b82f6', text: '#1e40af', badge: '#3b82f6' }
          };
          
          const colors = severityColors[vuln.severity] || severityColors['LOW'];
          
          return `
            <div style="background: white; padding: 20px; margin-bottom: 15px; border-radius: 10px; border-right: 5px solid ${colors.border}; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <!-- رأس الثغرة -->
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                <div style="flex: 1;">
                  <h4 style="margin: 0 0 5px 0; color: #111827; font-size: 16px;">
                    <span style="color: #6b7280; font-weight: normal;">#${index + 1}</span>
                    ${vuln.type.replace(/_/g, ' ')}
                  </h4>
                  <div style="font-size: 13px; color: #6b7280;">
                    <i class="fas fa-tag"></i> ${this.translateVulnType(vuln.type)}
                  </div>
                </div>
                <span style="background: ${colors.bg}; color: ${colors.badge}; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; white-space: nowrap;">
                  ${this.translateSeverity(vuln.severity)}
                </span>
              </div>

              <!-- الموقع -->
              <div style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">
                  <i class="fas fa-map-marker-alt"></i> الموقع:
                </div>
                <div style="font-size: 13px; color: #374151; word-break: break-all; font-family: monospace;">
                  ${vuln.location}
                </div>
              </div>

              <!-- الوصف -->
              <div style="margin-bottom: 12px;">
                <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">
                  <i class="fas fa-info-circle"></i> الوصف:
                </div>
                <div style="font-size: 14px; color: #374151; line-height: 1.6;">
                  ${vuln.description}
                </div>
              </div>

              ${vuln.evidence ? `
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">
                    <i class="fas fa-search"></i> الدليل:
                  </div>
                  <div style="background: #1f2937; color: #e5e7eb; padding: 10px; border-radius: 6px; font-size: 12px; font-family: monospace; overflow-x: auto;">
                    ${vuln.evidence}
                  </div>
                </div>
              ` : ''}

              ${vuln.remediation ? `
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px;">
                    <i class="fas fa-wrench"></i> الحل المقترح:
                  </div>
                  <div style="background: #f0fdf4; color: #166534; padding: 10px; border-radius: 6px; font-size: 13px; border-right: 3px solid #10b981;">
                    ${vuln.remediation}
                  </div>
                </div>
              ` : ''}

              <!-- معلومات إضافية -->
              <div style="display: flex; gap: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
                ${vuln.cvss_score ? `
                  <div>
                    <i class="fas fa-chart-line"></i>
                    <strong>CVSS Score:</strong> ${vuln.cvss_score}
                  </div>
                ` : ''}
                <div>
                  <i class="fas fa-clock"></i>
                  <strong>اكتُشفت في:</strong> ${new Date(vuln.discovered_at).toLocaleString('ar-EG')}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  translateScanLogMessage(message, metadata = {}) {
    switch (message) {
      case 'Starting web assessment':
        return `بدء فحص الويب على ${metadata.targetUrl || 'الهدف المحدد'}`;
      case 'Fetching page':
        return `جاري جلب الصفحة: ${metadata.url || ''}`;
      case 'Fetched page successfully':
        return `تم فحص ${metadata.url || 'صفحة'} بنجاح (${metadata.statusCode || '-'}) خلال ${metadata.responseTimeMs || '-'}ms`;
      case 'Failed to fetch page':
        return `تعذر جلب ${metadata.url || 'صفحة'}: ${metadata.error || 'خطأ غير معروف'}`;
      case 'Completed web assessment':
        return `اكتمل الفحص: ${metadata.urlsScanned || 0} صفحة، ${metadata.totalFindings || 0} نتيجة، ${metadata.pageErrors || 0} أخطاء وصول.`;
      default:
        return message;
    }
  }

  /**
   * ترجمة نوع الثغرة
   */
  translateVulnType(type) {
    const translations = {
      'SQL_INJECTION': 'حقن SQL',
      'XSS': 'البرمجة النصية عبر المواقع',
      'CSRF': 'تزوير الطلبات عبر المواقع',
      'DIRECTORY_TRAVERSAL': 'اجتياز الدليل',
      'COMMAND_INJECTION': 'حقن الأوامر',
      'XXE': 'كيان XML خارجي',
      'SSRF': 'تزوير طلب من جانب الخادم',
      'OPEN_REDIRECT': 'إعادة توجيه مفتوحة',
      'SECURITY_MISCONFIGURATION': 'خطأ في التكوين الأمني',
      'SENSITIVE_DATA_EXPOSURE': 'كشف البيانات الحساسة',
      'MISSING_SECURITY_HEADER': 'غياب ترويسة أمان',
      'INSECURE_TRANSPORT': 'نقل غير مشفر'
    };
    return translations[type] || type;
  }

  /**
   * ترجمة مستوى الخطورة
   */
  translateSeverity(severity) {
    const normalizedSeverity = String(severity || '').toUpperCase();
    const translations = {
      'CRITICAL': 'حرجة',
      'HIGH': 'عالية',
      'MEDIUM': 'متوسطة',
      'LOW': 'منخفضة',
      'INFO': 'معلومات'
    };
    return translations[normalizedSeverity] || severity;
  }

  /**
   * تحميل تقرير الثغرات
   */
  async downloadVulnerabilitiesReport(scanId) {
    try {
      // عرض loading
      if (window.loadingManager && window.loadingManager.show) {
        window.loadingManager.show();
      }
      
      // عرض إشعار
      if (window.notificationManager && window.notificationManager.show) {
        window.notificationManager.show('جاري تحميل التقرير...', 'info');
      }
      
      await api.getScanReport(scanId, 'pdf');
      
      // عرض نجاح
      if (window.notificationManager && window.notificationManager.show) {
        window.notificationManager.show('تم تحميل التقرير بنجاح', 'success');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      
      // عرض خطأ
      if (window.notificationManager && window.notificationManager.show) {
        window.notificationManager.show('فشل تحميل التقرير: ' + error.message, 'error');
      } else {
        alert('فشل تحميل التقرير: ' + error.message);
      }
    } finally {
      // إخفاء loading
      if (window.loadingManager && window.loadingManager.hide) {
        window.loadingManager.hide();
      }
    }
  }

  /**
   * إيقاف فحص الويب
   */
  async stopWebScan(scanId) {
    if (!confirm('هل أنت متأكد من إيقاف هذا الفحص؟')) {
      return;
    }

    try {
      const response = await api.post(`/scans/web/${scanId}/stop`);
      
      if (response.success) {
        this.addLogEntry('⏹️ تم إيقاف الفحص');
        this.updateScanStatus('متوقف', 'failed');
        window.notificationManager.show('تم إيقاف الفحص', 'info');
      }
    } catch (error) {
      console.error('Error stopping scan:', error);
      window.notificationManager.show('فشل إيقاف الفحص', 'error');
    }
  }

  /**
   * عرض تفاصيل الفحص
   */
  viewScanDetails(scanId) {
    // إغلاق النافذة الحالية
    document.querySelectorAll('.modal').forEach(modal => modal.remove());
    
    // الانتقال إلى صفحة فحص الويب
    window.navigationManager.navigateTo('web-scan');
    
    // تحميل تفاصيل الفحص
    setTimeout(() => {
      if (window.webScannerManager) {
        window.webScannerManager.loadScanDetails(scanId);
      }
    }, 500);
  }
}

// إنشاء نسخة عامة
window.operationsManager = new OperationsManager();

// تهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  if (window.operationsManager) {
    window.operationsManager.initialize();
  }
});

