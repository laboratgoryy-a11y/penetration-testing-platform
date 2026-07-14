// Report Manager - إدارة التقارير الحقيقية
class ReportManager {
    constructor(stateManager, apiClient) {
        this.stateManager = stateManager;
        this.apiClient = apiClient;
        this.reports = [];
        this.filters = {
            type: 'all',
            dateFrom: null,
            dateTo: null,
            status: 'all'
        };
        this.availableScans = [];
        this.availableCampaigns = [];
        this.availableNetworkTests = [];
    }

    // تهيئة المدير
    async initialize() {
        await this.loadAvailableOperations();
        await this.loadReports();
    }

    // تحميل العمليات المتاحة لإنشاء التقارير
    async loadAvailableOperations() {
        try {
            // تحميل الفحوصات
            const scansResponse = await this.apiClient.getScans();
            this.availableScans = scansResponse.data?.scans || [];

            // تحميل الحملات
            const campaignsResponse = await this.apiClient.getCampaigns();
            this.availableCampaigns = campaignsResponse.data?.campaigns || [];

            // تحميل اختبارات الشبكة
            const networkResponse = await this.apiClient.getNetworkTests();
            this.availableNetworkTests = networkResponse.data?.tests || [];
        } catch (error) {
            console.error('Error loading available operations:', error);
        }
    }

    // تحميل قائمة التقارير
    async loadReports() {
        try {
            this.stateManager.updateState({ loading: true, error: null });
            
            const response = await this.apiClient.getReports();
            this.reports = response.data?.reports || [];
            
            this.stateManager.updateState({
                reports: this.reports,
                loading: false
            });
            
            this.renderReportsList();
        } catch (error) {
            console.error('Error loading reports:', error);
            this.stateManager.updateState({
                loading: false,
                error: error.message
            });
            showToast('فشل تحميل التقارير: ' + error.message, 'error');
        }
    }

    // عرض نموذج توليد تقرير جديد
    showGenerateReportModal() {
        const modal = this.createModal('إنشاء تقرير جديد', `
            <form id="generateReportForm">
                <div class="form-group">
                    <label>نوع التقرير</label>
                    <select id="reportType" class="form-control" required>
                        <option value="">-- اختر نوع التقرير --</option>
                        <option value="scan">تقرير فحص ويب</option>
                        <option value="campaign">تقرير حملة تصيد</option>
                        <option value="network">تقرير اختبار شبكة</option>
                    </select>
                </div>
                
                <div id="reportSpecificFields"></div>
                
                <div class="form-group">
                    <label>صيغة التقرير</label>
                    <select id="reportFormat" class="form-control" required>
                        <option value="PDF">PDF</option>
                        <option value="HTML">HTML</option>
                        <option value="JSON">JSON</option>
                    </select>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">
                        إلغاء
                    </button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-file-alt"></i> إنشاء التقرير
                    </button>
                </div>
            </form>
        `);

        // تحديث الحقول عند تغيير نوع التقرير
        const reportTypeSelect = modal.querySelector('#reportType');
        reportTypeSelect.addEventListener('change', () => {
            this.updateReportForm(modal);
        });

        // معالجة إرسال النموذج
        modal.querySelector('#generateReportForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.generateReport(modal);
        });
    }

    // تحديث حقول النموذج حسب نوع التقرير
    updateReportForm(modal) {
        const reportType = modal.querySelector('#reportType').value;
        const container = modal.querySelector('#reportSpecificFields');
        
        if (!container) return;

        let fields = '';
        
        switch(reportType) {
            case 'scan':
                fields = `
                    <div class="form-group">
                        <label>اختر الفحص</label>
                        <select id="reportEntityId" class="form-control" required>
                            <option value="">-- اختر فحص --</option>
                            ${this.availableScans.map(scan => `
                                <option value="${scan.id}">
                                    ${scan.target_url || scan.targetUrl} - ${this.formatDate(scan.created_at || scan.createdAt)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
                break;
            case 'campaign':
                fields = `
                    <div class="form-group">
                        <label>اختر الحملة</label>
                        <select id="reportEntityId" class="form-control" required>
                            <option value="">-- اختر حملة --</option>
                            ${this.availableCampaigns.map(campaign => `
                                <option value="${campaign.id}">
                                    ${campaign.name} - ${this.formatDate(campaign.created_at || campaign.createdAt)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
                break;
            case 'network':
                fields = `
                    <div class="form-group">
                        <label>اختر اختبار الشبكة</label>
                        <select id="reportEntityId" class="form-control" required>
                            <option value="">-- اختر اختبار --</option>
                            ${this.availableNetworkTests.map(test => `
                                <option value="${test.id}">
                                    ${test.target?.ssid || 'Unknown'} - ${this.formatDate(test.created_at || test.createdAt)}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                `;
                break;
        }
        
        container.innerHTML = fields;
    }

    // توليد تقرير جديد
    async generateReport(modal) {
        const reportType = modal.querySelector('#reportType').value;
        const entityId = modal.querySelector('#reportEntityId')?.value;
        const format = modal.querySelector('#reportFormat').value;

        if (!reportType || !entityId) {
            showToast('يرجى ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        try {
            window.showLoading('جاري إنشاء التقرير...');

            await this.apiClient.createReport({
                reportType: reportType.toUpperCase(),
                format,
                sourceJobId: entityId,
                metadata: {
                    entityType: reportType,
                    entityId
                }
            });

            showToast('تمت جدولة إنشاء التقرير بنجاح', 'success');
            
            window.hideLoading();
            modal.remove();
            
            // إعادة تحميل قائمة التقارير
            await this.loadReports();
            
        } catch (error) {
            window.hideLoading();
            console.error('Error generating report:', error);
            showToast('فشل إنشاء التقرير: ' + error.message, 'error');
        }
    }

    // تحميل تقرير
    async downloadReport(reportId, format) {
        try {
            window.showLoading('جاري تحميل التقرير...');
            await this.apiClient.downloadReport(reportId, format);
            window.hideLoading();
        } catch (error) {
            window.hideLoading();
            console.error('Error downloading report:', error);
            showToast('فشل تحميل التقرير: ' + error.message, 'error');
        }
    }

    // تطبيق الفلاتر
    filterReports(filters) {
        this.filters = { ...this.filters, ...filters };
        this.renderReportsList();
    }

    // الحصول على التقارير المفلترة
    getFilteredReports() {
        let filtered = [...this.reports];

        // فلترة حسب النوع
        if (this.filters.type && this.filters.type !== 'all') {
            filtered = filtered.filter(r => r.type === this.filters.type);
        }

        // فلترة حسب التاريخ
        if (this.filters.dateFrom) {
            const fromDate = new Date(this.filters.dateFrom);
            filtered = filtered.filter(r => new Date(r.created_at || r.createdAt) >= fromDate);
        }

        if (this.filters.dateTo) {
            const toDate = new Date(this.filters.dateTo);
            filtered = filtered.filter(r => new Date(r.created_at || r.createdAt) <= toDate);
        }

        // فلترة حسب الحالة
        if (this.filters.status && this.filters.status !== 'all') {
            filtered = filtered.filter(r => r.status === this.filters.status);
        }

        return filtered;
    }

    // عرض قائمة التقارير
    renderReportsList() {
        const container = document.getElementById('reports-list');
        if (!container) return;

        const filteredReports = this.getFilteredReports();

        if (filteredReports.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-alt"></i>
                    <p>لا توجد تقارير</p>
                    <button class="btn-primary" onclick="reportManager.showGenerateReportModal()">
                        <i class="fas fa-plus"></i> إنشاء تقرير جديد
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>النوع</th>
                            <th>التاريخ</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredReports.map(report => `
                            <tr>
                                <td>
                                    <i class="fas fa-file-${this.getReportIcon(report.type)}"></i>
                                    ${this.getReportTypeName(report.type)}
                                </td>
                                <td>${this.formatDate(report.created_at || report.createdAt)}</td>
                                <td>
                                    <span class="badge badge-${this.getStatusColor(report.status)}">
                                        ${this.getStatusName(report.status)}
                                    </span>
                                </td>
                                <td>
                                    <div class="btn-group">
                                        <button class="btn-sm btn-secondary" 
                                                onclick="reportManager.downloadReport('${report.id}', 'pdf')"
                                                title="تحميل PDF">
                                            <i class="fas fa-file-pdf"></i>
                                        </button>
                                        <button class="btn-sm btn-secondary" 
                                                onclick="reportManager.downloadReport('${report.id}', 'html')"
                                                title="تحميل HTML">
                                            <i class="fas fa-file-code"></i>
                                        </button>
                                        <button class="btn-sm btn-secondary" 
                                                onclick="reportManager.downloadReport('${report.id}', 'json')"
                                                title="تحميل JSON">
                                            <i class="fas fa-file-alt"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // الحصول على أيقونة التقرير
    getReportIcon(type) {
        const icons = {
            'scan': 'pdf',
            'campaign': 'chart-line',
            'network': 'network-wired',
            'comprehensive': 'file-alt'
        };
        return icons[type] || 'file';
    }

    // الحصول على اسم نوع التقرير
    getReportTypeName(type) {
        const names = {
            'scan': 'تقرير فحص ويب',
            'campaign': 'تقرير حملة تصيد',
            'network': 'تقرير اختبار شبكة',
            'comprehensive': 'تقرير شامل'
        };
        return names[type] || type;
    }

    // الحصول على لون الحالة
    getStatusColor(status) {
        const colors = {
            'completed': 'success',
            'generating': 'warning',
            'failed': 'danger',
            'pending': 'info'
        };
        return colors[status] || 'secondary';
    }

    // الحصول على اسم الحالة
    getStatusName(status) {
        const names = {
            'completed': 'مكتمل',
            'generating': 'قيد الإنشاء',
            'failed': 'فشل',
            'pending': 'قيد الانتظار'
        };
        return names[status] || status;
    }

    // تنسيق التاريخ
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    // إنشاء نافذة منبثقة
    createModal(title, content, size = 'medium') {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content ${size}">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="btn-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    // تنظيف الموارد
    destroy() {
        this.reports = [];
        this.availableScans = [];
        this.availableCampaigns = [];
        this.availableNetworkTests = [];
    }
}

// تصدير للاستخدام العام
window.ReportManager = ReportManager;

// إنشاء instance عام
window.reportManager = null;

// تهيئة reportManager عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    if (window.stateManager && window.api) {
        window.reportManager = new ReportManager(window.stateManager, window.api);
    }
});


