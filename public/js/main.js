// Main Application Logic
document.addEventListener('DOMContentLoaded', async () => {
    window.appLogger?.debug('='.repeat(50));
    window.appLogger?.debug('✓ Initializing Application');
    window.appLogger?.debug('='.repeat(50));
    
    // تهيئة auth إذا لم يكن موجود
    if (!window.auth) {
        window.auth = new AuthManager(api);
    }
    
    // التحقق من المصادقة
    if (!window.auth.isAuthenticated()) {
        window.appLogger?.debug('⚠ User not authenticated, redirecting to login');
        window.location.href = '/login.html';
        return;
    }

    // التحقق من الجلسة
    const isValid = await window.auth.checkSession();
    if (!isValid) {
        window.appLogger?.debug('⚠ Session invalid, redirecting to login');
        window.location.href = '/login.html';
        return;
    }

    window.appLogger?.debug('✓ User authenticated');

    // تهيئة جميع المكونات الأساسية
    await initializeComponents();
    
    // تهيئة Navigation Manager
    setupNavigation();
    
    // تهيئة Dashboard Manager
    await window.dashboardManager.initialize();
    
    // بدء Navigation
    window.navigationManager.initialize();
    
    // إعداد event listeners عامة
    setupGlobalEventListeners();
    
    // بدء polling للـ Dashboard
    startDashboardPolling();
    
    window.appLogger?.debug('='.repeat(50));
    window.appLogger?.debug('✓ Application Ready');
    window.appLogger?.debug('='.repeat(50));
});

/**
 * تهيئة جميع المكونات الأساسية
 */
async function initializeComponents() {
    window.appLogger?.debug('Initializing core components...');
    
    // 1. State Manager (already initialized as singleton)
    if (window.stateManager) {
        window.appLogger?.debug('✓ State Manager ready');
    }
    
    // 2. API Client (already initialized)
    if (window.api) {
        window.appLogger?.debug('✓ API Client ready');
    }
    
    // 3. Error Handler (already initialized)
    if (window.errorHandler) {
        window.appLogger?.debug('✓ Error Handler ready');
    }
    
    // 4. Input Validator (already initialized)
    if (window.inputValidator) {
        window.appLogger?.debug('✓ Input Validator ready');
    }
    
    // 5. Inactivity Detector (already initialized)
    if (window.inactivityDetector) {
        window.appLogger?.debug('✓ Inactivity Detector ready');
    }
    
    // 6. Notification Manager (already initialized)
    if (window.notificationManager) {
        window.appLogger?.debug('✓ Notification Manager ready');
    }
    
    // 7. Loading Manager (already initialized)
    if (window.loadingManager) {
        window.appLogger?.debug('✓ Loading Manager ready');
    }
    
    // 8. Table Manager (already initialized)
    if (window.tableManager) {
        window.appLogger?.debug('✓ Table Manager ready');
    }
    
    // 9. Navigation Manager (already initialized)
    if (window.navigationManager) {
        window.appLogger?.debug('✓ Navigation Manager ready');
    }
    
    // 10. Operations Manager
    if (window.operationsManager) {
        window.operationsManager.initialize();
        window.appLogger?.debug('✓ Operations Manager initialized');
    }
    
    // 11. Network Analyzer Manager
    if (window.NetworkAnalyzerManager && window.stateManager && window.api) {
        window.networkAnalyzerManager = new NetworkAnalyzerManager(window.stateManager, window.api);
        window.appLogger?.debug('✓ Network Analyzer Manager initialized');
    }
    
    // 12. Web Scanner Manager
    if (window.WebScannerManager && window.stateManager && window.api) {
        window.webScannerManager = new WebScannerManager(window.stateManager, window.api);
        window.appLogger?.debug('✓ Web Scanner Manager initialized');
    }
    
    // 13. Phishing Campaign Manager
    if (window.PhishingCampaignManager && window.stateManager && window.api) {
        window.phishingCampaignManager = new PhishingCampaignManager(window.stateManager, window.api);
        window.appLogger?.debug('✓ Phishing Campaign Manager initialized');
    }
    
    // 14. تحميل معلومات المستخدم
    try {
        const userResponse = await api.getCurrentUser();
        if (userResponse.success && userResponse.data) {
            window.stateManager.setUser(userResponse.data);
            
            // تحديث اسم المستخدم في الواجهة
            const usernameElement = document.getElementById('username');
            if (usernameElement) {
                usernameElement.textContent = userResponse.data.username || 'المستخدم';
            }
            
            window.appLogger?.debug('✓ User info loaded:', userResponse.data.username);
        }
    } catch (error) {
        console.warn('Could not load user info:', error.message);
    }
    
    window.appLogger?.debug('✓ All components initialized');
}

/**
 * بدء polling للـ Dashboard
 */
function startDashboardPolling() {
    // Polling يتم تلقائياً في initialize() للـ dashboardManager
    // لا حاجة لاستدعاء startPolling() بشكل منفصل
    window.appLogger?.debug('Dashboard polling is already running from initialize()');
}

/**
 * إعداد التنقل وتسجيل جميع الـ routes
 */
function setupNavigation() {
    const nav = window.navigationManager;
    
    // تسجيل routes
    nav.registerRoute('dashboard', {
        title: 'لوحة التحكم',
        handler: async () => {
            nav.showSection('dashboard-page');
            await window.dashboardManager.renderDashboard();
        }
    });
    
    nav.registerRoute('web-scan', {
        title: 'فحص الويب',
        handler: async () => {
            nav.showSection('web-scan-page');
            await loadWebScansSection();
        }
    });
    
    nav.registerRoute('phishing', {
        title: 'حملات التصيد',
        handler: async () => {
            nav.showSection('phishing-page');
            await loadPhishingSection();
        }
    });
    
    nav.registerRoute('network', {
        title: 'تحليل الشبكات',
        handler: async () => {
            nav.showSection('network-page');
            await loadNetworkSection();
        }
    });
    
    nav.registerRoute('reports', {
        title: 'التقارير',
        handler: async () => {
            nav.showSection('reports-page');
            await loadReportsSection();
        }
    });
    
    nav.registerRoute('authorizations', {
        title: 'التصاريح',
        handler: async () => {
            nav.showSection('authorizations-page');
            await loadAuthorizationsSection();
        }
    });
    
    nav.registerRoute('audit', {
        title: 'السجلات',
        handler: async () => {
            nav.showSection('audit-page');
            await loadAuditSection();
        }
    });
}

/**
 * إعداد event listeners عامة
 */
function setupGlobalEventListeners() {
    // Menu toggle
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    menuToggle?.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await window.auth.logout();
    });
}

/**
 * تحميل قسم فحص الويب
 */
async function loadWebScansSection() {
    const page = document.getElementById('web-scan-page');
    page.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2>فحص الويب</h2>
                <button class="btn-primary btn-sm" onclick="window.operationsManager.showOperationForm('web-scan')">
                    <i class="fas fa-plus"></i> فحص جديد
                </button>
            </div>
            <div class="card-body">
                <div id="scansList">جاري التحميل...</div>
            </div>
        </div>
    `;

    // استخدام Web Scanner Manager
    await window.webScannerManager.loadScans();
}

/**
 * تحميل قسم حملات التصيد
 */
async function loadPhishingSection() {
    const page = document.getElementById('phishing-page');
    page.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2>حملات التصيد</h2>
                <button class="btn-primary btn-sm" onclick="window.operationsManager.showOperationForm('phishing')">
                    <i class="fas fa-plus"></i> حملة جديدة
                </button>
            </div>
            <div class="card-body">
                <div id="campaignsList">جاري التحميل...</div>
            </div>
        </div>
    `;

    // استخدام Phishing Campaign Manager
    await window.phishingCampaignManager.loadCampaigns();
}

/**
 * تحميل قسم تحليل الشبكات
 */
async function loadNetworkSection() {
    const page = document.getElementById('network-page');
    page.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2>تحليل الشبكات</h2>
                <button class="btn-primary btn-sm" onclick="window.operationsManager.showOperationForm('network')">
                    <i class="fas fa-plus"></i> تحليل جديد
                </button>
            </div>
            <div class="card-body">
                <div id="network-analyses-list">جاري تحميل التحليلات...</div>
            </div>
        </div>
        <div id="network-analysis-details" style="margin-top: 20px;"></div>
    `;

    await window.networkAnalyzerManager.loadNetworkAnalyses();
}

/**
 * تحميل قسم التقارير
 */
async function loadReportsSection() {
    const page = document.getElementById('reports-page');
    
    // استخدام template
    const template = document.getElementById('reports-template');
    if (template) {
        page.innerHTML = template.innerHTML;
    } else {
        // fallback إذا لم يكن template موجود
        page.innerHTML = `
            <div class="reports-section">
                <div class="section-header">
                    <h2>التقارير</h2>
                    <button class="btn-primary" onclick="reportManager.showGenerateReportModal()">
                        <i class="fas fa-plus"></i> إنشاء تقرير جديد
                    </button>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div id="reports-list">جاري التحميل...</div>
                    </div>
                </div>
            </div>
        `;
    }

    // تهيئة وتحميل التقارير
    if (window.reportManager) {
        await window.reportManager.initialize();
    }
}

/**
 * تحميل قسم التصاريح
 */
async function loadAuthorizationsSection() {
    const page = document.getElementById('authorizations-page');
    page.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h2>التصاريح</h2>
                <button class="btn-primary btn-sm" onclick="showNewAuthorizationModal()">
                    <i class="fas fa-plus"></i> تصريح جديد
                </button>
            </div>
            <div class="card-body">
                <div id="authorizationsList">جاري التحميل...</div>
            </div>
        </div>
    `;

    try {
        showLoading();
        const response = await api.getAuthorizations();
        const authorizations = response.success ? response.data.authorizations || response.data : [];
        renderAuthorizationsList(authorizations);
        hideLoading();
    } catch (error) {
        console.error('Error loading authorizations:', error);
        window.notificationManager.show('فشل تحميل التصاريح', 'error');
        hideLoading();
    }
}

function renderAuthorizationsList(authorizations) {
    const container = document.getElementById('authorizationsList');
    if (!authorizations || !authorizations.length) {
        container.innerHTML = '<p class="text-center">لا توجد تصاريح</p>';
        return;
    }

    container.innerHTML = authorizations.map(auth => `
        <div class="activity-item">
            <div class="activity-icon ${auth.status === 'ACTIVE' ? 'green' : 'red'}">
                <i class="fas fa-key"></i>
            </div>
            <div class="activity-content">
                <p class="activity-title">${auth.organization_name || auth.target_system || 'غير محدد'}</p>
                <p class="activity-time">الحالة: ${translateStatus(auth.status)}</p>
            </div>
            <button class="btn-secondary btn-sm" onclick="viewAuthorization('${auth.id}')">
                عرض
            </button>
        </div>
    `).join('');
}

/**
 * تحميل قسم السجلات
 */
async function loadAuditSection() {
    const page = document.getElementById('audit-page');
    
    // استخدام template
    const template = document.getElementById('audit-logs-template');
    if (template) {
        page.innerHTML = template.innerHTML;
    } else {
        // fallback إذا لم يكن template موجود
        page.innerHTML = `
            <div class="audit-logs-section">
                <div class="section-header">
                    <h2>سجلات التدقيق</h2>
                </div>
                <div class="card">
                    <div class="card-body">
                        <div id="audit-logs-list">جاري التحميل...</div>
                    </div>
                </div>
            </div>
        `;
    }

    // تهيئة وتحميل السجلات
    if (!window.auditLoggerManager) {
        window.auditLoggerManager = new AuditLoggerManager(api, window.stateManager);
    }
    
    await window.auditLoggerManager.initialize();
}

/**
 * دوال مساعدة
 */
function translateStatus(status) {
    const translations = {
        'PENDING': 'قيد الانتظار',
        'RUNNING': 'قيد التشغيل',
        'COMPLETED': 'مكتمل',
        'FAILED': 'فشل',
        'STOPPED': 'متوقف',
        'ACTIVE': 'نشط',
        'INACTIVE': 'غير نشط'
    };
    return translations[status?.toUpperCase()] || status;
}

// دوال عرض النماذج (placeholders)
function showNewScanModal() {
    window.notificationManager.show('قريباً: نموذج فحص جديد', 'info');
}

function showNewCampaignModal() {
    // استخدام Operations Manager لعرض نموذج حملة جديدة
    window.operationsManager.showOperationForm('phishing');
}

function showNewNetworkTestModal() {
    // استخدام Operations Manager لعرض نموذج اختبار الشبكة
    window.operationsManager.showOperationForm('network');
}

function showNewAuthorizationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>
                    <i class="fas fa-key"></i>
                    تصريح جديد
                </h2>
                <button class="btn-icon" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="authorization-form" class="operation-form">
                    <div class="form-group">
                        <label for="auth-org-name">
                            <i class="fas fa-building"></i>
                            اسم المنظمة *
                        </label>
                        <input 
                            type="text" 
                            id="auth-org-name" 
                            name="organizationName"
                            placeholder="شركة ABC" 
                            required
                        >
                        <small class="form-help">اسم الشركة أو المنظمة التي تمنح التصريح</small>
                    </div>

                    <div class="form-group">
                        <label for="auth-target-system">
                            <i class="fas fa-server"></i>
                            النظام المستهدف *
                        </label>
                        <input 
                            type="text" 
                            id="auth-target-system" 
                            name="targetSystem"
                            placeholder="example.com" 
                            required
                        >
                        <small class="form-help">النطاق أو النظام المصرح بفحصه</small>
                    </div>

                    <div class="form-group">
                        <label for="auth-operation-type">
                            <i class="fas fa-tasks"></i>
                            نوع العملية *
                        </label>
                        <select id="auth-operation-type" name="operationType" required>
                            <option value="">اختر نوع العملية...</option>
                            <option value="WEB_SCAN">فحص الويب</option>
                            <option value="PHISHING_CAMPAIGN">حملة تصيد</option>
                            <option value="NETWORK_TEST">اختبار شبكة</option>
                            <option value="ALL">جميع العمليات</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="auth-scope">
                            <i class="fas fa-crosshairs"></i>
                            النطاق
                        </label>
                        <textarea 
                            id="auth-scope" 
                            name="scope"
                            rows="3"
                            placeholder="النطاقات المصرح بها (سطر لكل نطاق)&#10;example.com&#10;*.example.com&#10;192.168.1.0/24"
                        ></textarea>
                        <small class="form-help">النطاقات أو الشبكات المصرح بفحصها</small>
                    </div>

                    <div class="form-group">
                        <label for="auth-start-date">
                            <i class="fas fa-calendar-alt"></i>
                            تاريخ البداية *
                        </label>
                        <input 
                            type="date" 
                            id="auth-start-date" 
                            name="startDate"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="auth-end-date">
                            <i class="fas fa-calendar-check"></i>
                            تاريخ النهاية *
                        </label>
                        <input 
                            type="date" 
                            id="auth-end-date" 
                            name="endDate"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label for="auth-reference">
                            <i class="fas fa-file-contract"></i>
                            رقم المرجع
                        </label>
                        <input 
                            type="text" 
                            id="auth-reference" 
                            name="referenceNumber"
                            placeholder="AUTH-2025-001"
                        >
                        <small class="form-help">رقم التصريح أو العقد</small>
                    </div>

                    <div class="form-group">
                        <label for="auth-contact">
                            <i class="fas fa-user"></i>
                            جهة الاتصال
                        </label>
                        <input 
                            type="text" 
                            id="auth-contact" 
                            name="contactPerson"
                            placeholder="أحمد محمد - ahmad@example.com"
                        >
                        <small class="form-help">الشخص المسؤول في المنظمة</small>
                    </div>

                    <div class="form-group">
                        <label for="auth-notes">
                            <i class="fas fa-sticky-note"></i>
                            ملاحظات
                        </label>
                        <textarea 
                            id="auth-notes" 
                            name="notes"
                            rows="3"
                            placeholder="أي ملاحظات إضافية..."
                        ></textarea>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-check"></i>
                            إنشاء التصريح
                        </button>
                        <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // تعيين التاريخ الافتراضي (اليوم)
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('auth-start-date').value = today;
    
    // تعيين تاريخ النهاية (بعد شهر)
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('auth-end-date').value = nextMonth.toISOString().split('T')[0];

    // معالجة إرسال النموذج
    const form = document.getElementById('authorization-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAuthorizationSubmit(e);
    });

    // إغلاق عند النقر خارج المحتوى
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function handleAuthorizationSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    // تحويل النطاق من نص إلى مصفوفة
    const scopeText = formData.get('scope') || '';
    const scopeDomains = scopeText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // تحويل نوع العملية إلى مصفوفة
    const operationType = formData.get('operationType');
    const allowedOperations = operationType === 'ALL' 
        ? ['WEB_SCAN', 'PHISHING_CAMPAIGN', 'NETWORK_TEST']
        : [operationType];

    const data = {
        organizationName: formData.get('organizationName'),
        scope: {
            domains: scopeDomains.length > 0 ? scopeDomains : [formData.get('targetSystem')],
            ipRanges: [],
            networks: [],
            emailDomains: []
        },
        validFrom: formData.get('startDate'),
        validUntil: formData.get('endDate'),
        signedBy: formData.get('contactPerson') || formData.get('organizationName'),
        digitalSignature: 'MANUAL_' + Date.now(), // توقيع مؤقت
        allowedOperations: allowedOperations
    };

    try {
        showLoading();
        window.appLogger?.debug('Creating authorization:', data);
        
        const response = await api.createAuthorization(data);
        window.appLogger?.debug('Authorization created:', response);
        
        if (response.success) {
            // إغلاق النموذج
            document.querySelector('.modal').remove();
            
            window.notificationManager.show('تم إنشاء التصريح بنجاح!', 'success');
            
            // إعادة تحميل قائمة التصاريح
            await loadAuthorizationsSection();
        } else {
            throw new Error(response.error?.message || 'فشل إنشاء التصريح');
        }
    } catch (error) {
        console.error('Error creating authorization:', error);
        window.notificationManager.show('فشل إنشاء التصريح: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function showGenerateReportModal() {
    window.notificationManager.show('قريباً: نموذج تقرير جديد', 'info');
}

function viewScan(id) {
    window.notificationManager.show('جاري تحميل تفاصيل الفحص...', 'info');
    
    // عرض modal بتفاصيل الفحص
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>تفاصيل الفحص</h2>
                <button class="btn-icon" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" id="scan-details-content">
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 32px;"></i>
                    <p>جاري التحميل...</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // تحميل تفاصيل الفحص
    loadScanDetails(id);
}

async function loadScanDetails(id) {
    try {
        const [scanResponse, vulnsResponse] = await Promise.all([
            api.getScan(id),
            api.getScanVulnerabilities(id)
        ]);
        
        const scan = scanResponse.success ? scanResponse.data : null;
        const vulns = vulnsResponse.success ? vulnsResponse.data : [];
        
        if (!scan) {
            throw new Error('فشل تحميل تفاصيل الفحص');
        }
        
        const content = document.getElementById('scan-details-content');
        if (content) {
            content.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <h3>معلومات الفحص</h3>
                    <p><strong>الهدف:</strong> ${scan.target_url}</p>
                    <p><strong>الحالة:</strong> ${translateStatus(scan.status)}</p>
                    <p><strong>بدأ في:</strong> ${new Date(scan.started_at).toLocaleString('ar-EG')}</p>
                    ${scan.completed_at ? `<p><strong>انتهى في:</strong> ${new Date(scan.completed_at).toLocaleString('ar-EG')}</p>` : ''}
                    <p><strong>عدد الثغرات:</strong> ${scan.total_vulnerabilities || 0}</p>
                </div>
                
                <div>
                    <h3>الثغرات المكتشفة</h3>
                    ${vulns.length > 0 ? `
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f3f4f6;">
                                    <th style="padding: 10px; text-align: right;">النوع</th>
                                    <th style="padding: 10px; text-align: right;">الخطورة</th>
                                    <th style="padding: 10px; text-align: right;">الوصف</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${vulns.map(vuln => `
                                    <tr style="border-bottom: 1px solid #e5e7eb;">
                                        <td style="padding: 10px;">${vuln.type}</td>
                                        <td style="padding: 10px;">
                                            <span style="padding: 4px 8px; border-radius: 4px; background: ${getSeverityColor(vuln.severity)}; color: white; font-size: 12px;">
                                                ${vuln.severity}
                                            </span>
                                        </td>
                                        <td style="padding: 10px;">${vuln.description}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p style="text-align: center; color: #666;">لم يتم اكتشاف ثغرات</p>'}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading scan details:', error);
        const content = document.getElementById('scan-details-content');
        if (content) {
            content.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f59e0b;"></i>
                    <p style="color: #666;">فشل تحميل التفاصيل</p>
                    <p style="color: #999; font-size: 14px;">${error.message}</p>
                </div>
            `;
        }
    }
}

function getSeverityColor(severity) {
    const colors = {
        'CRITICAL': '#dc2626',
        'HIGH': '#f97316',
        'MEDIUM': '#eab308',
        'LOW': '#3b82f6',
        'INFO': '#6b7280'
    };
    return colors[severity] || '#6b7280';
}

function viewCampaign(id) {
    // استخدام Phishing Campaign Manager لعرض تفاصيل الحملة
    window.phishingCampaignManager.viewCampaignDetails(id);
}

function viewNetworkTest(id) {
    // استخدام Network Analyzer Manager لعرض تفاصيل التحليل
    window.networkAnalyzerManager.loadAnalysisDetails(id);
}

function viewAuthorization(id) {
    window.notificationManager.show('جاري تحميل تفاصيل التصريح...', 'info');
    
    // عرض modal بتفاصيل التصريح
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2>
                    <i class="fas fa-key"></i>
                    تفاصيل التصريح
                </h2>
                <button class="btn-icon" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" id="authorization-details-content">
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 32px;"></i>
                    <p>جاري التحميل...</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // تحميل تفاصيل التصريح
    loadAuthorizationDetails(id);
}

async function loadAuthorizationDetails(id) {
    try {
        const response = await api.getAuthorization(id);
        
        if (!response.success) {
            throw new Error('فشل تحميل تفاصيل التصريح');
        }
        
        const auth = response.data;
        
        const content = document.getElementById('authorization-details-content');
        if (content) {
            const statusClass = auth.status === 'ACTIVE' ? 'green' : auth.status === 'EXPIRED' ? 'red' : 'gray';
            const statusText = auth.status === 'ACTIVE' ? 'نشط' : auth.status === 'EXPIRED' ? 'منتهي' : 'ملغي';
            
            content.innerHTML = `
                <div style="margin-bottom: 20px;">
                    <div class="info-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                        <div class="info-item">
                            <label><i class="fas fa-building"></i> المنظمة</label>
                            <p><strong>${auth.organization_name || 'غير محدد'}</strong></p>
                        </div>
                        <div class="info-item">
                            <label><i class="fas fa-server"></i> النظام المستهدف</label>
                            <p><strong>${auth.target_system || 'غير محدد'}</strong></p>
                        </div>
                        <div class="info-item">
                            <label><i class="fas fa-tasks"></i> نوع العملية</label>
                            <p>${translateOperationType(auth.operation_type)}</p>
                        </div>
                        <div class="info-item">
                            <label><i class="fas fa-flag"></i> الحالة</label>
                            <p>
                                <span class="status-badge ${statusClass}">
                                    <i class="fas fa-circle"></i>
                                    ${statusText}
                                </span>
                            </p>
                        </div>
                        <div class="info-item">
                            <label><i class="fas fa-calendar-alt"></i> تاريخ البداية</label>
                            <p>${new Date(auth.start_date).toLocaleDateString('ar-EG')}</p>
                        </div>
                        <div class="info-item">
                            <label><i class="fas fa-calendar-check"></i> تاريخ النهاية</label>
                            <p>${new Date(auth.end_date).toLocaleDateString('ar-EG')}</p>
                        </div>
                        ${auth.reference_number ? `
                            <div class="info-item">
                                <label><i class="fas fa-file-contract"></i> رقم المرجع</label>
                                <p>${auth.reference_number}</p>
                            </div>
                        ` : ''}
                        ${auth.contact_person ? `
                            <div class="info-item">
                                <label><i class="fas fa-user"></i> جهة الاتصال</label>
                                <p>${auth.contact_person}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${auth.scope ? `
                    <div style="margin-bottom: 20px;">
                        <h3 style="margin-bottom: 10px;">
                            <i class="fas fa-crosshairs"></i>
                            النطاق المصرح به
                        </h3>
                        <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                            ${auth.scope.domains && auth.scope.domains.length > 0 ? `
                                <div style="margin-bottom: 10px;">
                                    <strong>النطاقات:</strong>
                                    <ul style="margin: 5px 0; padding-right: 20px;">
                                        ${auth.scope.domains.map(d => `<li>${d}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                            ${auth.scope.ipRanges && auth.scope.ipRanges.length > 0 ? `
                                <div style="margin-bottom: 10px;">
                                    <strong>نطاقات IP:</strong>
                                    <ul style="margin: 5px 0; padding-right: 20px;">
                                        ${auth.scope.ipRanges.map(ip => `<li>${ip}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}
                
                ${auth.notes ? `
                    <div style="margin-bottom: 20px;">
                        <h3 style="margin-bottom: 10px;">
                            <i class="fas fa-sticky-note"></i>
                            ملاحظات
                        </h3>
                        <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
                            <p style="white-space: pre-wrap;">${auth.notes}</p>
                        </div>
                    </div>
                ` : ''}
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    <small style="color: #666;">
                        <i class="fas fa-info-circle"></i>
                        تم الإنشاء في: ${new Date(auth.created_at).toLocaleString('ar-EG')}
                    </small>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading authorization details:', error);
        const content = document.getElementById('authorization-details-content');
        if (content) {
            content.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f59e0b;"></i>
                    <p style="color: #666;">فشل تحميل التفاصيل</p>
                    <p style="color: #999; font-size: 14px;">${error.message}</p>
                </div>
            `;
        }
    }
}

function translateOperationType(type) {
    const types = {
        'WEB_SCAN': 'فحص الويب',
        'PHISHING_CAMPAIGN': 'حملة تصيد',
        'NETWORK_TEST': 'اختبار شبكة',
        'ALL': 'جميع العمليات'
    };
    return types[type] || type;
}

