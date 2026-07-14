/**
 * IP Scan Comparison Manager
 * إدارة مقارنة نتائج فحوصات IP
 */

class IPScanComparisonManager {
    constructor() {
        this.selectedScans = [];
        this.comparisonData = null;
    }

    /**
     * تهيئة مدير المقارنة
     */
    initialize() {
        window.appLogger?.debug('Initializing IP Scan Comparison Manager...');
        this.setupEventListeners();
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // زر فتح نافذة المقارنة
        const compareBtn = document.getElementById('compare-scans-btn');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => this.showComparisonModal());
        }
    }

    /**
     * عرض نافذة اختيار الفحوصات للمقارنة
     */
    async showComparisonModal() {
        try {
            // جلب قائمة الفحوصات المكتملة
            const scans = await this.fetchCompletedScans();

            if (scans.length < 2) {
                notificationManager.show(
                    'يجب أن يكون لديك فحصين مكتملين على الأقل للمقارنة',
                    'warning'
                );
                return;
            }

            const modalHtml = `
                <div class="modal-overlay" id="comparison-modal">
                    <div class="modal-content large">
                        <div class="modal-header">
                            <h2><i class="fas fa-exchange-alt"></i> مقارنة الفحوصات</h2>
                            <button class="btn-close" onclick="ipScanComparisonManager.closeModal()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="modal-body">
                            <div class="comparison-selection">
                                <div class="form-group">
                                    <label for="scan1-select">الفحص الأول *</label>
                                    <select id="scan1-select" class="form-control" required>
                                        <option value="">-- اختر الفحص الأول --</option>
                                        ${scans.map(scan => `
                                            <option value="${scan.id}">
                                                ${scan.target_value} - ${this.formatDate(scan.completed_at)}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>

                                <div class="comparison-arrow">
                                    <i class="fas fa-arrows-alt-h fa-2x"></i>
                                </div>

                                <div class="form-group">
                                    <label for="scan2-select">الفحص الثاني *</label>
                                    <select id="scan2-select" class="form-control" required>
                                        <option value="">-- اختر الفحص الثاني --</option>
                                        ${scans.map(scan => `
                                            <option value="${scan.id}">
                                                ${scan.target_value} - ${this.formatDate(scan.completed_at)}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="modal-actions">
                                <button type="button" class="btn btn-secondary" 
                                        onclick="ipScanComparisonManager.closeModal()">
                                    إلغاء
                                </button>
                                <button type="button" class="btn btn-primary" 
                                        onclick="ipScanComparisonManager.performComparison()">
                                    <i class="fas fa-exchange-alt"></i> مقارنة
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHtml);
        } catch (error) {
            console.error('Error showing comparison modal:', error);
            notificationManager.show('فشل في عرض نافذة المقارنة', 'error');
        }
    }

    /**
     * جلب الفحوصات المكتملة
     */
    async fetchCompletedScans() {
        try {
            const response = await fetch('/api/v1/ip-scans?status=COMPLETED', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch scans');
            }

            const data = await response.json();
            return data.data.scans || [];
        } catch (error) {
            console.error('Error fetching completed scans:', error);
            throw error;
        }
    }

    /**
     * تنفيذ المقارنة
     */
    async performComparison() {
        const scan1Id = document.getElementById('scan1-select').value;
        const scan2Id = document.getElementById('scan2-select').value;

        if (!scan1Id || !scan2Id) {
            notificationManager.show('يرجى اختيار فحصين للمقارنة', 'warning');
            return;
        }

        if (scan1Id === scan2Id) {
            notificationManager.show('يرجى اختيار فحصين مختلفين', 'warning');
            return;
        }

        try {
            loadingManager.showGlobal('جاري المقارنة...');

            const response = await fetch('/api/v1/ip-scans/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ scan1Id, scan2Id })
            });

            if (!response.ok) {
                throw new Error('Comparison failed');
            }

            const data = await response.json();
            this.comparisonData = data.data;

            this.closeModal();
            this.displayComparisonResults();

            notificationManager.show('تمت المقارنة بنجاح', 'success');
        } catch (error) {
            console.error('Error performing comparison:', error);
            notificationManager.show('فشل في تنفيذ المقارنة', 'error');
        } finally {
            loadingManager.hideGlobal();
        }
    }

    /**
     * عرض نتائج المقارنة
     */
    displayComparisonResults() {
        if (!this.comparisonData) {
            return;
        }

        const { changes, summary } = this.comparisonData;

        const resultsHtml = `
            <div class="modal-overlay" id="comparison-results-modal">
                <div class="modal-content extra-large">
                    <div class="modal-header">
                        <h2><i class="fas fa-chart-line"></i> نتائج المقارنة</h2>
                        <button class="btn-close" onclick="ipScanComparisonManager.closeResultsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- ملخص المقارنة -->
                        ${this.renderComparisonSummary(summary)}

                        <!-- التغييرات التفصيلية -->
                        <div class="comparison-details">
                            <div class="tabs">
                                <button class="tab-btn active" data-tab="hosts">
                                    <i class="fas fa-server"></i> المضيفين
                                </button>
                                <button class="tab-btn" data-tab="ports">
                                    <i class="fas fa-door-open"></i> المنافذ
                                </button>
                                <button class="tab-btn" data-tab="vulnerabilities">
                                    <i class="fas fa-shield-alt"></i> الثغرات
                                </button>
                                <button class="tab-btn" data-tab="services">
                                    <i class="fas fa-cogs"></i> الخدمات
                                </button>
                            </div>

                            <div class="tab-content">
                                <div class="tab-pane active" id="hosts-tab">
                                    ${this.renderHostChanges(changes)}
                                </div>
                                <div class="tab-pane" id="ports-tab">
                                    ${this.renderPortChanges(changes)}
                                </div>
                                <div class="tab-pane" id="vulnerabilities-tab">
                                    ${this.renderVulnerabilityChanges(changes)}
                                </div>
                                <div class="tab-pane" id="services-tab">
                                    ${this.renderServiceChanges(changes)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', resultsHtml);
        this.setupTabSwitching();
    }

    /**
     * عرض ملخص المقارنة
     */
    renderComparisonSummary(summary) {
        const riskLevelClass = {
            'INCREASED': 'danger',
            'DECREASED': 'success',
            'UNCHANGED': 'info'
        }[summary.riskLevel];

        const riskLevelText = {
            'INCREASED': 'ازدادت المخاطر',
            'DECREASED': 'انخفضت المخاطر',
            'UNCHANGED': 'لم تتغير المخاطر'
        }[summary.riskLevel];

        return `
            <div class="comparison-summary">
                <div class="summary-header">
                    <h3>ملخص التغييرات</h3>
                    <span class="risk-badge ${riskLevelClass}">
                        <i class="fas fa-exclamation-triangle"></i> ${riskLevelText}
                    </span>
                </div>

                <div class="summary-stats">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-exchange-alt"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${summary.totalChanges}</div>
                            <div class="stat-label">إجمالي التغييرات</div>
                        </div>
                    </div>

                    <div class="stat-card ${summary.newHostsCount > 0 ? 'new' : ''}">
                        <div class="stat-icon">
                            <i class="fas fa-plus-circle"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${summary.newHostsCount}</div>
                            <div class="stat-label">مضيفين جدد</div>
                        </div>
                    </div>

                    <div class="stat-card ${summary.removedHostsCount > 0 ? 'removed' : ''}">
                        <div class="stat-icon">
                            <i class="fas fa-minus-circle"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${summary.removedHostsCount}</div>
                            <div class="stat-label">مضيفين محذوفين</div>
                        </div>
                    </div>

                    <div class="stat-card ${summary.newPortsCount > 0 ? 'new' : ''}">
                        <div class="stat-icon">
                            <i class="fas fa-door-open"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${summary.newPortsCount}</div>
                            <div class="stat-label">منافذ جديدة</div>
                        </div>
                    </div>

                    <div class="stat-card ${summary.closedPortsCount > 0 ? 'removed' : ''}">
                        <div class="stat-icon">
                            <i class="fas fa-door-closed"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${summary.closedPortsCount}</div>
                            <div class="stat-label">منافذ مغلقة</div>
                        </div>
                    </div>

                    <div class="stat-card ${summary.newVulnerabilitiesCount > 0 ? 'danger' : ''}">
                        <div class="stat-icon">
                            <i class="fas fa-bug"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${summary.newVulnerabilitiesCount}</div>
                            <div class="stat-label">ثغرات جديدة</div>
                        </div>
                    </div>

                    <div class="stat-card ${summary.fixedVulnerabilitiesCount > 0 ? 'success' : ''}">
                        <div class="stat-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${summary.fixedVulnerabilitiesCount}</div>
                            <div class="stat-label">ثغرات مصلحة</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * عرض تغييرات المضيفين
     */
    renderHostChanges(changes) {
        const { newHosts, removedHosts, modifiedHosts } = changes;

        if (newHosts.length === 0 && removedHosts.length === 0 && modifiedHosts.length === 0) {
            return '<div class="no-changes">لا توجد تغييرات في المضيفين</div>';
        }

        return `
            <div class="changes-section">
                ${newHosts.length > 0 ? `
                    <div class="change-group new">
                        <h4><i class="fas fa-plus-circle"></i> مضيفين جدد (${newHosts.length})</h4>
                        <table class="changes-table">
                            <thead>
                                <tr>
                                    <th>عنوان IP</th>
                                    <th>اسم المضيف</th>
                                    <th>الحالة</th>
                                    <th>التفاصيل</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${newHosts.map(host => `
                                    <tr>
                                        <td><code>${host.ipAddress}</code></td>
                                        <td>${host.hostname || '-'}</td>
                                        <td><span class="badge ${host.status}">${host.status}</span></td>
                                        <td>${host.details || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                ${removedHosts.length > 0 ? `
                    <div class="change-group removed">
                        <h4><i class="fas fa-minus-circle"></i> مضيفين محذوفين (${removedHosts.length})</h4>
                        <table class="changes-table">
                            <thead>
                                <tr>
                                    <th>عنوان IP</th>
                                    <th>اسم المضيف</th>
                                    <th>الحالة</th>
                                    <th>التفاصيل</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${removedHosts.map(host => `
                                    <tr>
                                        <td><code>${host.ipAddress}</code></td>
                                        <td>${host.hostname || '-'}</td>
                                        <td><span class="badge ${host.status}">${host.status}</span></td>
                                        <td>${host.details || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                ${modifiedHosts.length > 0 ? `
                    <div class="change-group modified">
                        <h4><i class="fas fa-edit"></i> مضيفين معدلين (${modifiedHosts.length})</h4>
                        <table class="changes-table">
                            <thead>
                                <tr>
                                    <th>عنوان IP</th>
                                    <th>اسم المضيف</th>
                                    <th>الحالة</th>
                                    <th>التفاصيل</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${modifiedHosts.map(host => `
                                    <tr>
                                        <td><code>${host.ipAddress}</code></td>
                                        <td>${host.hostname || '-'}</td>
                                        <td><span class="badge ${host.status}">${host.status}</span></td>
                                        <td>${host.details || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * عرض تغييرات المنافذ
     */
    renderPortChanges(changes) {
        const { newPorts, closedPorts } = changes;

        if (newPorts.length === 0 && closedPorts.length === 0) {
            return '<div class="no-changes">لا توجد تغييرات في المنافذ</div>';
        }

        return `
            <div class="changes-section">
                ${newPorts.length > 0 ? `
                    <div class="change-group new">
                        <h4><i class="fas fa-plus-circle"></i> منافذ جديدة (${newPorts.length})</h4>
                        <table class="changes-table">
                            <thead>
                                <tr>
                                    <th>عنوان IP</th>
                                    <th>المنفذ</th>
                                    <th>البروتوكول</th>
                                    <th>الحالة</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${newPorts.map(port => `
                                    <tr>
                                        <td><code>${port.ipAddress}</code></td>
                                        <td><strong>${port.port}</strong></td>
                                        <td>${port.protocol}</td>
                                        <td><span class="badge ${port.newState}">${port.newState}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                ${closedPorts.length > 0 ? `
                    <div class="change-group removed">
                        <h4><i class="fas fa-minus-circle"></i> منافذ مغلقة (${closedPorts.length})</h4>
                        <table class="changes-table">
                            <thead>
                                <tr>
                                    <th>عنوان IP</th>
                                    <th>المنفذ</th>
                                    <th>البروتوكول</th>
                                    <th>الحالة السابقة</th>
                                    <th>الحالة الجديدة</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${closedPorts.map(port => `
                                    <tr>
                                        <td><code>${port.ipAddress}</code></td>
                                        <td><strong>${port.port}</strong></td>
                                        <td>${port.protocol}</td>
                                        <td><span class="badge ${port.oldState}">${port.oldState || '-'}</span></td>
                                        <td><span class="badge ${port.newState}">${port.newState || 'closed'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * عرض تغييرات الثغرات
     */
    renderVulnerabilityChanges(changes) {
        const { newVulnerabilities, fixedVulnerabilities } = changes;

        if (newVulnerabilities.length === 0 && fixedVulnerabilities.length === 0) {
            return '<div class="no-changes">لا توجد تغييرات في الثغرات</div>';
        }

        return `
            <div class="changes-section">
                ${newVulnerabilities.length > 0 ? `
                    <div class="change-group danger">
                        <h4><i class="fas fa-bug"></i> ثغرات جديدة (${newVulnerabilities.length})</h4>
                        <table class="changes-table">
                            <thead>
                                <tr>
                                    <th>عنوان IP</th>
                                    <th>النوع</th>
                                    <th>الخطورة</th>
                                    <th>العنوان</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${newVulnerabilities.map(vuln => `
                                    <tr>
                                        <td><code>${vuln.ipAddress}</code></td>
                                        <td>${vuln.type}</td>
                                        <td><span class="severity-badge ${vuln.severity.toLowerCase()}">${vuln.severity}</span></td>
                                        <td>${vuln.title}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                ${fixedVulnerabilities.length > 0 ? `
                    <div class="change-group success">
                        <h4><i class="fas fa-check-circle"></i> ثغرات مصلحة (${fixedVulnerabilities.length})</h4>
                        <table class="changes-table">
                            <thead>
                                <tr>
                                    <th>عنوان IP</th>
                                    <th>النوع</th>
                                    <th>الخطورة</th>
                                    <th>العنوان</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${fixedVulnerabilities.map(vuln => `
                                    <tr>
                                        <td><code>${vuln.ipAddress}</code></td>
                                        <td>${vuln.type}</td>
                                        <td><span class="severity-badge ${vuln.severity.toLowerCase()}">${vuln.severity}</span></td>
                                        <td>${vuln.title}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * عرض تغييرات الخدمات
     */
    renderServiceChanges(changes) {
        const { newServices, removedServices } = changes;

        if (newServices.length === 0 && removedServices.length === 0) {
            return '<div class="no-changes">لا توجد تغييرات في الخدمات</div>';
        }

        return `
            <div class="changes-section">
                ${newServices.length > 0 ? `
                    <div class="change-group new">
                        <h4><i class="fas fa-plus-circle"></i> خدمات جديدة/معدلة (${newServices.length})</h4>
                        <table class="changes-table">
                            <thead>
                                <tr>
                                    <th>عنوان IP</th>
                                    <th>المنفذ</th>
                                    <th>الخدمة</th>
                                    <th>الإصدار السابق</th>
                                    <th>الإصدار الجديد</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${newServices.map(service => `
                                    <tr>
                                        <td><code>${service.ipAddress}</code></td>
                                        <td><strong>${service.port}</strong></td>
                                        <td>${service.serviceName}</td>
                                        <td>${service.oldVersion || '-'}</td>
                                        <td><span class="badge new">${service.newVersion || 'جديد'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}

                ${removedServices.length > 0 ? `
                    <div class="change-group removed">
                        <h4><i class="fas fa-minus-circle"></i> خدمات محذوفة (${removedServices.length})</h4>
                        <table class="changes-table">
                            <thead>
                                <tr>
                                    <th>عنوان IP</th>
                                    <th>المنفذ</th>
                                    <th>الخدمة</th>
                                    <th>الإصدار</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${removedServices.map(service => `
                                    <tr>
                                        <td><code>${service.ipAddress}</code></td>
                                        <td><strong>${service.port}</strong></td>
                                        <td>${service.serviceName}</td>
                                        <td>${service.oldVersion || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * إعداد التبديل بين التبويبات
     */
    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');

                // إزالة active من جميع الأزرار والتبويبات
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanes.forEach(pane => pane.classList.remove('active'));

                // إضافة active للزر والتبويب المحدد
                button.classList.add('active');
                document.getElementById(`${tabName}-tab`).classList.add('active');
            });
        });
    }

    /**
     * تنسيق التاريخ
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * إغلاق نافذة الاختيار
     */
    closeModal() {
        const modal = document.getElementById('comparison-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * إغلاق نافذة النتائج
     */
    closeResultsModal() {
        const modal = document.getElementById('comparison-results-modal');
        if (modal) {
            modal.remove();
        }
    }
}

// إنشاء نسخة عامة
const ipScanComparisonManager = new IPScanComparisonManager();

// تهيئة عند تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ipScanComparisonManager.initialize();
    });
} else {
    ipScanComparisonManager.initialize();
}

