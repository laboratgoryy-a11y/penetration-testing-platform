// Network Testing functionality
class NetworkTester {
    constructor() {
        this.currentTest = null;
    }

    showNewNetworkTestModal() {
        const modal = this.createModal('اختبار شبكة جديد', `
            <form id="newNetworkTestForm">
                <div class="form-group">
                    <label>BSSID (عنوان MAC لنقطة الوصول) *</label>
                    <input type="text" id="networkTarget" required placeholder="00:11:22:33:44:55">
                    <small>عنوان MAC لنقطة الوصول اللاسلكية</small>
                </div>
                
                <div class="form-group">
                    <label>نوع الاختبار *</label>
                    <select id="networkTestType">
                        <option value="TRAFFIC_ANALYSIS">فحص لاسلكي سلبي قائم على الرصد</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>رقم التصريح *</label>
                    <input type="text" id="networkAuthorizationId" required placeholder="UUID">
                    <small>معرف التصريح الممنوح لهذا الاختبار</small>
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="networkNotifyAdmin" checked>
                        إشعار المسؤول عند اكتشاف ثغرات حرجة
                    </label>
                </div>
                
                <button type="submit" class="btn-primary btn-block">بدء الاختبار</button>
            </form>
        `);

        document.getElementById('newNetworkTestForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createNetworkTest();
            modal.remove();
        });
    }

    async createNetworkTest() {
        const testData = {
            target: {
                bssid: document.getElementById('networkTarget').value,
                authorizationId: document.getElementById('networkAuthorizationId').value
            },
            config: {
                testTypes: [document.getElementById('networkTestType').value],
                timeout: 300,
                notifyOnCritical: document.getElementById('networkNotifyAdmin').checked
            }
        };

        try {
            window.showLoading();
            const response = await api.createNetworkTest(testData);
            window.hideLoading();
            
            if (response.success) {
                showToast('تم بدء اختبار الشبكة بنجاح', 'success');
                app.loadNetwork();
                
                // Start monitoring test status
                if (response.data.id || response.data.sessionId) {
                    this.monitorTestProgress(response.data.id || response.data.sessionId);
                }
            }
        } catch (error) {
            window.hideLoading();
            showToast(error.message || 'فشل بدء الاختبار', 'error');
        }
    }

    async monitorTestProgress(testId) {
        const checkStatus = async () => {
            try {
                const response = await api.getNetworkStatus(testId);
                if (response.success) {
                    const status = String(response.data.status || '').toUpperCase();
                    
                    if (status === 'COMPLETED' || status === 'FAILED') {
                        showToast(`الاختبار ${status === 'COMPLETED' ? 'اكتمل' : 'فشل'}`, status === 'COMPLETED' ? 'success' : 'error');
                        app.loadNetwork();
                        return;
                    }
                    
                    // Continue monitoring
                    setTimeout(checkStatus, 5000);
                }
            } catch (error) {
                console.error('Error monitoring test:', error);
            }
        };
        
        checkStatus();
    }

    async viewNetworkTest(testId) {
        try {
            window.showLoading();
            const [testResponse, resultsResponse] = await Promise.all([
                api.getNetworkTest(testId),
                api.getNetworkResults(testId).catch(() => ({ data: [] }))
            ]);
            window.hideLoading();

            const test = testResponse.data;
            const results = resultsResponse.data || [];

            this.showNetworkTestDetails(test, results);
        } catch (error) {
            window.hideLoading();
            showToast('فشل تحميل تفاصيل الاختبار', 'error');
        }
    }

    showNetworkTestDetails(test, results) {
        const modal = this.createModal(`تفاصيل اختبار الشبكة - ${test.target_network}`, `
            <div class="network-test-details">
                <div class="detail-row">
                    <strong>نوع الاختبار:</strong>
                    <span>${this.getTestTypeName(test.test_type)}</span>
                </div>
                <div class="detail-row">
                    <strong>الحالة:</strong>
                    <span class="badge ${this.getStatusClass(test.status)}">${test.status}</span>
                </div>
                <div class="detail-row">
                    <strong>تاريخ البدء:</strong>
                    <span>${new Date(test.created_at).toLocaleString('ar')}</span>
                </div>
                <div class="detail-row">
                    <strong>عدد الأجهزة المكتشفة:</strong>
                    <span>${results.devices?.length || 0}</span>
                </div>
                <div class="detail-row">
                    <strong>عدد الثغرات:</strong>
                    <span>${results.vulnerabilities?.length || 0}</span>
                </div>
                
                <h3 style="margin-top: 20px;">الأجهزة المكتشفة</h3>
                <div class="devices-list">
                    ${this.renderDevices(results.devices || [])}
                </div>
                
                <h3 style="margin-top: 20px;">الثغرات المكتشفة</h3>
                <div class="vulnerabilities-list">
                    ${this.renderNetworkVulnerabilities(results.vulnerabilities || [])}
                </div>
            </div>
        `, 'large');
    }

    renderDevices(devices) {
        if (!devices.length) {
            return '<p class="text-center">لم يتم اكتشاف أجهزة</p>';
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>عنوان IP</th>
                        <th>عنوان MAC</th>
                        <th>اسم الجهاز</th>
                        <th>المنافذ المفتوحة</th>
                    </tr>
                </thead>
                <tbody>
                    ${devices.map(device => `
                        <tr>
                            <td>${device.ip_address}</td>
                            <td>${device.mac_address || '-'}</td>
                            <td>${device.hostname || '-'}</td>
                            <td>${device.open_ports?.join(', ') || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    renderNetworkVulnerabilities(vulnerabilities) {
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
                    <small>الجهاز: ${vuln.device_ip || 'غير محدد'}</small>
                    ${vuln.port ? `<small>المنفذ: ${vuln.port}</small>` : ''}
                </div>
            </div>
        `).join('');
    }

    getTestTypeName(type) {
        const names = {
            'port_scan': 'فحص المنافذ',
            'vulnerability_scan': 'فحص الثغرات',
            'network_mapping': 'رسم خريطة الشبكة',
            'access_point_discovery': 'اكتشاف نقاط الوصول'
        };
        return names[type] || type;
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
window.NetworkTester = new NetworkTester();

