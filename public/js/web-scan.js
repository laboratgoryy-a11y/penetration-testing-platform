// Web Scanning functionality
class WebScanner {
    constructor() {
        this.currentScan = null;
    }

    showNewScanModal() {
        const modal = this.createModal('فحص ويب جديد', `
            <form id="newScanForm">
                <div class="form-group">
                    <label>رابط الموقع المستهدف *</label>
                    <input type="url" id="scanTargetUrl" required placeholder="https://example.com">
                    <small>يجب أن يبدأ بـ http:// أو https://</small>
                </div>
                
                <div class="form-group">
                    <label>نطاق الفحص (اختياري)</label>
                    <input type="text" id="scanScope" placeholder="*.example.com">
                    <small>حدد النطاق المسموح للفحص</small>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="scanRobotsTxt" checked>
                        احترام ملف robots.txt
                    </label>
                </div>
                
                <div class="form-group">
                    <label>رقم التصريح *</label>
                    <input type="text" id="scanAuthorizationId" required placeholder="UUID">
                    <small>معرف التصريح الممنوح لهذا الفحص</small>
                </div>
                
                <button type="submit" class="btn-primary btn-block">بدء الفحص</button>
            </form>
        `);

        document.getElementById('newScanForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createScan();
            modal.remove();
        });
    }

    async createScan() {
        const scanData = {
            target: {
                url: document.getElementById('scanTargetUrl').value,
                authorizationId: document.getElementById('scanAuthorizationId').value
            },
            config: {
                scope: document.getElementById('scanScope').value || undefined,
                respectRobotsTxt: document.getElementById('scanRobotsTxt').checked,
                maxDepth: 3,
                maxPages: 100
            }
        };

        try {
            window.showLoading();
            const response = await api.createScan(scanData);
            window.hideLoading();
            
            if (response.success) {
                showToast('تم بدء الفحص بنجاح', 'success');
                app.loadWebScans();
                
                // Start monitoring scan status
                if (response.data.id || response.data.sessionId) {
                    this.monitorScanProgress(response.data.id || response.data.sessionId);
                }
            }
        } catch (error) {
            window.hideLoading();
            showToast(error.message || 'فشل بدء الفحص', 'error');
        }
    }

    async monitorScanProgress(scanId) {
        const checkStatus = async () => {
            try {
                const response = await api.getScanStatus(scanId);
                if (response.success) {
                    const status = String(response.data.status || '').toUpperCase();
                    
                    if (status === 'COMPLETED' || status === 'FAILED') {
                        showToast(`الفحص ${status === 'COMPLETED' ? 'اكتمل' : 'فشل'}`, status === 'COMPLETED' ? 'success' : 'error');
                        app.loadWebScans();
                        return;
                    }
                    
                    // Continue monitoring
                    setTimeout(checkStatus, 5000);
                }
            } catch (error) {
                console.error('Error monitoring scan:', error);
            }
        };
        
        checkStatus();
    }

    async viewScan(scanId) {
        try {
            window.showLoading();
            const [scanResponse, resultsResponse] = await Promise.all([
                api.getScan(scanId),
                api.getScanResults(scanId).catch(() => ({ data: { findings: [] } }))
            ]);
            window.hideLoading();

            const scan = scanResponse.data;
            const results = Array.isArray(resultsResponse.data?.findings)
                ? resultsResponse.data.findings
                : [];

            this.showScanDetails(scan, results);
        } catch (error) {
            window.hideLoading();
            showToast('فشل تحميل تفاصيل الفحص', 'error');
        }
    }

    showScanDetails(scan, results) {
        const modal = this.createModal(`تفاصيل الفحص - ${scan.target_url}`, `
            <div class="scan-details">
                <div class="detail-row">
                    <strong>الحالة:</strong>
                    <span class="badge ${this.getStatusClass(scan.status)}">${scan.status}</span>
                </div>
                <div class="detail-row">
                    <strong>تاريخ البدء:</strong>
                    <span>${new Date(scan.created_at).toLocaleString('ar')}</span>
                </div>
                <div class="detail-row">
                    <strong>عدد الثغرات:</strong>
                    <span>${results.length}</span>
                </div>
                
                <h3 style="margin-top: 20px;">الثغرات المكتشفة</h3>
                <div class="vulnerabilities-list">
                    ${this.renderVulnerabilities(results)}
                </div>
            </div>
        `, 'large');
    }

    renderVulnerabilities(vulnerabilities) {
        if (!vulnerabilities.length) {
            return '<p class="text-center">لم يتم اكتشاف ثغرات</p>';
        }

        return vulnerabilities.map(vuln => `
            <div class="vulnerability-item ${this.getSeverityClass(vuln.severity)}">
                <div class="vuln-header">
                    <h4>${vuln.vulnerability_type}</h4>
                    <span class="severity-badge">${vuln.severity}</span>
                </div>
                <p>${vuln.description || 'لا يوجد وصف'}</p>
                <div class="vuln-details">
                    <small>الموقع: ${vuln.location || 'غير محدد'}</small>
                </div>
            </div>
        `).join('');
    }

    getStatusClass(status) {
        const classes = {
            'pending': 'warning',
            'running': 'info',
            'completed': 'success',
            'failed': 'danger'
        };
        return classes[status] || 'secondary';
    }

    getSeverityClass(severity) {
        const classes = {
            'critical': 'severity-critical',
            'high': 'severity-high',
            'medium': 'severity-medium',
            'low': 'severity-low'
        };
        return classes[severity?.toLowerCase()] || '';
    }

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
}

// Export for use in main app
window.WebScanner = new WebScanner();
