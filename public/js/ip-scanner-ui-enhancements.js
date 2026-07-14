(function () {
    if (typeof window === 'undefined' || !window.IPScannerManager && !window.ipScannerManager) {
        return;
    }

    const ManagerClass = window.IPScannerManager || (window.ipScannerManager && window.ipScannerManager.constructor);
    if (!ManagerClass) {
        return;
    }

    ManagerClass.prototype.getStatusText = function(status) {
        const normalized = String(status || '').toUpperCase();
        const statusTexts = {
            PENDING: 'في الانتظار',
            RUNNING: 'قيد التنفيذ',
            COMPLETED: 'مكتمل',
            FAILED: 'فشل',
            CANCELLED: 'ملغي',
            STOPPED: 'متوقف',
            TIMEOUT: 'انتهت المهلة',
            UP: 'متاح',
            DOWN: 'غير متاح',
            OPEN: 'مفتوح',
            CLOSED: 'مغلق',
            FILTERED: 'مفلتر'
        };
        return statusTexts[normalized] || status || 'غير معروف';
    };

    ManagerClass.prototype.formatDate = function(dateString) {
        if (!dateString) {
            return '-';
        }

        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return '-';
        }

        return new Intl.DateTimeFormat('ar-SA', {
            dateStyle: 'medium',
            timeStyle: 'short'
        }).format(date);
    };

    ManagerClass.prototype.displayRecentScans = function(scans) {
        const container = document.getElementById('recent-scans-list');
        if (!container) return;

        if (!Array.isArray(scans) || scans.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>لا توجد فحوصات IP حديثة حتى الآن.</p>
                </div>
            `;
            return;
        }

        const sortedScans = [...scans].sort((left, right) => {
            return new Date(right.created_at || right.createdAt || 0) - new Date(left.created_at || left.createdAt || 0);
        });

        container.innerHTML = sortedScans.map((scan) => {
            const status = this.getStatusText(scan.status);
            const scanType = this.scanTypes?.[scan.scan_type] || scan.scan_type || 'فحص IP';
            const target = scan.target_value || scan.targetValue || '-';
            const progress = typeof scan.progress === 'number' ? Math.round(scan.progress) : null;

            return `
                <div class="scan-card" data-scan-id="${scan.id}">
                    <div class="scan-header">
                        <div class="scan-info">
                            <h4>${target}</h4>
                            <span class="scan-type">${scanType}</span>
                        </div>
                        <span class="status-badge status-${String(scan.status || '').toLowerCase()}">${status}</span>
                    </div>
                    <div class="scan-meta">
                        <span><i class="fas fa-clock"></i> ${this.formatDate(scan.started_at || scan.startedAt || scan.created_at || scan.createdAt)}</span>
                        ${progress !== null ? `<span><i class="fas fa-percentage"></i> ${progress}%</span>` : ''}
                    </div>
                    <div class="scan-actions">
                        <button class="btn-sm btn-primary" onclick="window.ipScannerManager.viewScanDetails('${scan.id}')">
                            <i class="fas fa-eye"></i> عرض
                        </button>
                        ${String(scan.status || '').toUpperCase() === 'RUNNING' ? `
                            <button class="btn-sm btn-danger" onclick="window.ipScannerManager.stopScan('${scan.id}')">
                                <i class="fas fa-stop"></i> إيقاف
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    };

    ManagerClass.prototype.showScanProgress = function(scanId) {
        const progressModal = `
            <div class="modal-overlay" id="scan-progress-modal">
                <div class="modal-content extra-large scan-progress-dialog">
                    <div class="modal-header modal-drag-handle">
                        <h2><i class="fas fa-spinner fa-spin"></i> جاري فحص الهدف...</h2>
                        <div class="modal-header-actions">
                            <button class="btn-secondary btn-sm" onclick="window.ipScannerManager.closeScanProgress()">
                                <i class="fas fa-arrow-right"></i> رجوع
                            </button>
                            <button class="btn-close" onclick="window.ipScannerManager.closeScanProgress()">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div class="modal-body modal-scrollable">
                        <div class="scan-info-card">
                            <div class="info-row">
                                <span class="label">معرف الفحص</span>
                                <span class="value" id="scan-id-display">${scanId}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">الحالة</span>
                                <span class="value" id="scan-status-display">
                                    <span class="status-badge status-running">قيد التنفيذ</span>
                                </span>
                            </div>
                            <div class="info-row">
                                <span class="label">وقت البدء</span>
                                <span class="value" id="scan-start-time">${this.formatDate(new Date().toISOString())}</span>
                            </div>
                        </div>

                        <div class="progress-section">
                            <div class="progress-bar-container">
                                <div class="progress-bar" id="scan-progress-bar" style="width: 0%">
                                    <span class="progress-text" id="scan-progress-text">0%</span>
                                </div>
                            </div>
                            <p class="progress-message" id="scan-progress-message">جاري تهيئة فحص IP...</p>
                        </div>

                        <div id="scan-results-section" style="display: none;">
                            <h3><i class="fas fa-table"></i> نتائج الفحص</h3>
                            <div id="scan-results-content"></div>
                        </div>

                        <div class="scan-log">
                            <h4><i class="fas fa-list"></i> سجل التنفيذ</h4>
                            <div class="log-container" id="scan-log-container">
                                <div class="log-entry">
                                    <span class="log-time">${new Date().toLocaleTimeString('ar-SA')}</span>
                                    <span class="log-message">تم إنشاء مهمة الفحص وبدء المراقبة.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="window.ipScannerManager.closeScanProgress()">
                            إغلاق
                        </button>
                        <button class="btn-danger" id="stop-scan-btn" onclick="window.ipScannerManager.stopCurrentScan()">
                            <i class="fas fa-stop"></i> إيقاف الفحص
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', progressModal);
        this.makeProgressModalInteractive();
        this.monitorScanProgress(scanId);
    };

    ManagerClass.prototype.makeProgressModalInteractive = function() {
        const overlay = document.getElementById('scan-progress-modal');
        const dialog = overlay?.querySelector('.modal-content');
        const handle = overlay?.querySelector('.modal-drag-handle');

        if (!overlay || !dialog || !handle) {
            return;
        }

        const rect = dialog.getBoundingClientRect();
        dialog.style.position = 'fixed';
        dialog.style.left = `${Math.max(16, rect.left)}px`;
        dialog.style.top = `${Math.max(16, rect.top)}px`;
        dialog.style.margin = '0';

        let dragging = false;
        let offsetX = 0;
        let offsetY = 0;

        const onMouseMove = (event) => {
            if (!dragging) return;

            const maxLeft = Math.max(16, window.innerWidth - dialog.offsetWidth - 16);
            const maxTop = Math.max(16, window.innerHeight - dialog.offsetHeight - 16);
            const nextLeft = Math.min(Math.max(16, event.clientX - offsetX), maxLeft);
            const nextTop = Math.min(Math.max(16, event.clientY - offsetY), maxTop);

            dialog.style.left = `${nextLeft}px`;
            dialog.style.top = `${nextTop}px`;
        };

        const stopDragging = () => {
            dragging = false;
            document.body.classList.remove('is-dragging-modal');
        };

        handle.addEventListener('mousedown', (event) => {
            if (event.target.closest('button')) {
                return;
            }

            dragging = true;
            offsetX = event.clientX - dialog.getBoundingClientRect().left;
            offsetY = event.clientY - dialog.getBoundingClientRect().top;
            document.body.classList.add('is-dragging-modal');
            event.preventDefault();
        });

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', stopDragging);

        this.progressModalCleanup = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', stopDragging);
            document.body.classList.remove('is-dragging-modal');
        };
    };

    ManagerClass.prototype.monitorScanProgress = async function(scanId) {
        this.currentScanId = scanId;
        let checkCount = 0;
        let lastStatusMessage = '';
        let lastProgress = -1;
        const maxChecks = 240;

        const checkProgress = async () => {
            try {
                checkCount += 1;
                const response = await api.getIpScanStatus(scanId);

                if (!response.success || !response.data) {
                    throw new Error(response.error || 'تعذر جلب حالة الفحص');
                }

                const status = String(response.data.status || '').toUpperCase();
                const progress = typeof response.data.progress === 'number'
                    ? Math.max(0, Math.min(100, Math.round(response.data.progress)))
                    : (status === 'COMPLETED' ? 100 : lastProgress >= 0 ? lastProgress : 0);
                const statusMessage = response.data.statusMessage || this.getStatusText(status);
                const totalsMessage = `الأجهزة: ${response.data.totalHosts || 0} | المنافذ المفتوحة: ${response.data.totalPorts || 0} | الملاحظات الأمنية: ${response.data.totalVulnerabilities || 0}`;

                this.updateProgressBar(progress, statusMessage);
                this.updateScanStatus(this.getStatusText(status), status.toLowerCase() || 'running');

                if (progress !== lastProgress || statusMessage !== lastStatusMessage) {
                    this.addLogEntry(`${statusMessage} - ${totalsMessage}`);
                    lastProgress = progress;
                    lastStatusMessage = statusMessage;
                }

                if (status === 'COMPLETED') {
                    this.updateProgressBar(100, 'اكتمل الفحص وتم تحميل النتائج.');
                    this.addLogEntry('اكتمل الفحص بنجاح وتم جلب النتائج الحقيقية.', 'success');
                    await this.displayScanResults(scanId);
                    return;
                }

                if (status === 'FAILED') {
                    const errorMessage = response.data.errorMessage || statusMessage || 'فشل تنفيذ الفحص.';
                    this.addLogEntry(`فشل الفحص: ${errorMessage}`, 'error');
                    this.updateScanStatus('فشل', 'failed');
                    return;
                }

                if (status === 'CANCELLED') {
                    this.addLogEntry('تم إيقاف الفحص بناءً على طلب المستخدم.', 'warning');
                    this.updateScanStatus('ملغي', 'stopped');
                    return;
                }

                if (checkCount < maxChecks) {
                    setTimeout(checkProgress, 1000);
                } else {
                    this.addLogEntry('استغرق الفحص وقتًا أطول من المتوقع. ما زال يمكن مراجعة السجل والنتائج الحالية.', 'warning');
                    this.updateScanStatus('متأخر', 'timeout');
                }
            } catch (error) {
                console.error('Error checking scan progress:', error);
                this.addLogEntry('تعذر تحديث حالة الفحص من الخادم.', 'error');
            }
        };

        checkProgress();
    };

    ManagerClass.prototype.updateProgressBar = function(progress, customMessage = null) {
        const progressBar = document.getElementById('scan-progress-bar');
        const progressText = document.getElementById('scan-progress-text');
        const progressMessage = document.getElementById('scan-progress-message');

        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${Math.round(progress)}%`;
        }
        if (progressMessage) {
            if (customMessage) {
                progressMessage.textContent = customMessage;
            } else if (progress < 25) {
                progressMessage.textContent = 'جاري التحقق من الهدف وتجهيز مراحل الفحص.';
            } else if (progress < 60) {
                progressMessage.textContent = 'جاري فحص المنافذ والخدمات الفعلية.';
            } else if (progress < 90) {
                progressMessage.textContent = 'جاري تحليل النتائج وتصنيف الملاحظات.';
            } else {
                progressMessage.textContent = 'جاري إنهاء الفحص وتجهيز التقرير.';
            }
        }
    };

    ManagerClass.prototype.displayScanResults = async function(scanId) {
        try {
            const [scanResponse, resultsResponse, logsResponse, artifactsResponse] = await Promise.all([
                api.getIpScan(scanId),
                api.getIpScanResults(scanId),
                api.getIpScanLogs(scanId),
                api.getIpScanArtifacts(scanId)
            ]);

            if (!resultsResponse.success) {
                throw new Error(resultsResponse.error || 'تعذر تحميل نتائج الفحص');
            }

            const scan = scanResponse.data || {};
            const results = resultsResponse.data || {};
            const logs = logsResponse.data?.logs || [];
            const artifacts = artifactsResponse.data?.artifacts || [];
            const resultsSection = document.getElementById('scan-results-section');
            const resultsContent = document.getElementById('scan-results-content');

            if (!resultsSection || !resultsContent) {
                return;
            }

            const hosts = Array.isArray(results.hosts) ? results.hosts : [];
            const ports = Array.isArray(results.ports) ? results.ports : [];
            const services = Array.isArray(results.services) ? results.services : [];
            const vulnerabilities = Array.isArray(results.vulnerabilities) ? results.vulnerabilities : [];
            const limitations = Array.isArray(results.limitations) ? results.limitations : [];
            const executionMode = results.executionMode === 'nmap' ? 'Nmap' : 'المحرك الداخلي TCP';
            const targetValue = results.targetValue || scan.target_value || scan.targetValue || '-';
            const resolvedHostname = results.resolvedHostname || hosts[0]?.hostname || '-';
            const totalHosts = results.totalHosts ?? hosts.length;
            const totalPorts = results.totalPorts ?? ports.length;
            const totalVulnerabilities = results.totalVulnerabilities ?? vulnerabilities.length;

            const summaryMessage = totalPorts === 0
                ? 'تم الوصول إلى الهدف ولكن لم يتم اكتشاف منافذ TCP مفتوحة ضمن نطاق الفحص الحالي. هذا شائع في الهواتف التي تغلق المنافذ أو تعمل خلف جدار حماية.'
                : `تم اكتشاف ${totalPorts} منفذ مفتوح و${services.length} خدمة و${totalVulnerabilities} ملاحظة أمنية.`;

            resultsContent.innerHTML = `
                <div class="results-grid">
                    <div class="result-card">
                        <div class="result-icon"><i class="fas fa-server"></i></div>
                        <div class="result-info"><h4>${totalHosts}</h4><p>أجهزة مكتشفة</p></div>
                    </div>
                    <div class="result-card">
                        <div class="result-icon"><i class="fas fa-door-open"></i></div>
                        <div class="result-info"><h4>${totalPorts}</h4><p>منافذ مفتوحة</p></div>
                    </div>
                    <div class="result-card">
                        <div class="result-icon"><i class="fas fa-cogs"></i></div>
                        <div class="result-info"><h4>${services.length}</h4><p>خدمات معروفة</p></div>
                    </div>
                    <div class="result-card">
                        <div class="result-icon"><i class="fas fa-shield-alt"></i></div>
                        <div class="result-info"><h4>${totalVulnerabilities}</h4><p>ملاحظات أمنية</p></div>
                    </div>
                </div>

                <div class="scan-summary-banner">${summaryMessage}</div>

                ${this.renderResultsTable(
                    'معلومات الفحص',
                    ['الحقل', 'القيمة'],
                    [
                        ['الهدف', targetValue],
                        ['نمط التنفيذ', executionMode],
                        ['اسم المضيف', resolvedHostname],
                        ['نوع الفحص', this.scanTypes?.[scan.scan_type] || scan.scan_type || 'فحص IP'],
                        ['الحالة النهائية', this.getStatusText(scan.status || 'COMPLETED')],
                        ['عدد ملفات الأثر', artifacts.length]
                    ],
                    'لا توجد معلومات عامة متاحة لهذا الفحص.'
                )}

                ${this.renderResultsTable(
                    'الأجهزة المكتشفة',
                    ['عنوان IP', 'اسم المضيف', 'الحالة', 'نظام التشغيل', 'المنافذ المفتوحة', 'الثغرات'],
                    hosts.map((host) => [
                        host.ip_address || host.ip || '-',
                        host.hostname || '-',
                        this.getStatusText(host.status || host.state || 'UP'),
                        host.os_name || host.os || 'غير معروف',
                        host.port_count ?? host.open_ports ?? 0,
                        host.vulnerability_count ?? 0
                    ]),
                    'لم يتم اكتشاف أجهزة إضافية في هذا الفحص.'
                )}

                ${this.renderResultsTable(
                    'المنافذ والخدمات',
                    ['عنوان IP', 'المنفذ', 'البروتوكول', 'الحالة', 'الخدمة', 'الإصدار أو الاستجابة'],
                    ports.map((port) => [
                        port.ip_address || '-',
                        port.port || '-',
                        port.protocol || '-',
                        this.getStatusText(port.state || '-'),
                        port.service_name || port.service || 'غير معروف',
                        [port.service_product, port.service_version].filter(Boolean).join(' ') || 'غير متاح'
                    ]),
                    'لم يتم اكتشاف منافذ مفتوحة ضمن المنافذ التي تم فحصها.'
                )}

                ${this.renderResultsTable(
                    'الملاحظات الأمنية',
                    ['عنوان IP', 'الخطورة', 'العنوان', 'المنفذ', 'الثقة', 'الوصف'],
                    vulnerabilities.map((item) => [
                        item.ip_address || '-',
                        this.formatSeverity(item.severity),
                        item.title || item.type || '-',
                        item.port || '-',
                        this.formatConfidence(item.confidence),
                        item.description || '-'
                    ]),
                    'لم يتم رصد ملاحظات أمنية ضمن الفحوصات المنفذة.'
                )}

                ${limitations.length ? `
                    <div class="results-details">
                        <h4><i class="fas fa-info-circle"></i> ملاحظات وحدود التنفيذ</h4>
                        <div class="scan-notes-list">
                            ${limitations.map((item) => `<div class="scan-note-item">${item}</div>`).join('')}
                        </div>
                    </div>
                ` : ''}
            `;

            const logContainer = document.getElementById('scan-log-container');
            if (logContainer && logs.length) {
                logContainer.innerHTML = logs.map((entry) => `
                    <div class="log-entry log-${String(entry.level || 'info').toLowerCase()}">
                        <span class="log-time">${this.formatDate(entry.createdAt || entry.created_at)}</span>
                        <span class="log-message">${entry.message || entry.summary || 'حدث جديد في مسار الفحص'}</span>
                    </div>
                `).join('');
            }

            resultsSection.style.display = 'block';
            this.updateScanStatus('مكتمل', 'completed');
        } catch (error) {
            console.error('Error displaying scan results:', error);
            this.addLogEntry('تعذر عرض النتائج النهائية للفحص.', 'error');
        }
    };

    ManagerClass.prototype.renderResultsTable = function(title, headers, rows, emptyMessage) {
        const hasRows = Array.isArray(rows) && rows.length > 0;

        return `
            <div class="results-details">
                <h4><i class="fas fa-table"></i> ${title}</h4>
                <div class="scan-results-table-wrapper">
                    ${hasRows ? `
                        <table class="data-table scan-results-table">
                            <thead>
                                <tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
                            </thead>
                            <tbody>
                                ${rows.map((columns) => `
                                    <tr>${columns.map((column) => `<td>${column ?? '-'}</td>`).join('')}</tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `
                        <div class="empty-state compact-empty-state">${emptyMessage}</div>
                    `}
                </div>
            </div>
        `;
    };

    ManagerClass.prototype.formatSeverity = function(severity) {
        const value = String(severity || '').toLowerCase();
        const labels = {
            critical: 'حرجة',
            high: 'عالية',
            medium: 'متوسطة',
            low: 'منخفضة'
        };
        return labels[value] || 'غير مصنفة';
    };

    ManagerClass.prototype.formatConfidence = function(confidence) {
        const value = String(confidence || '').toLowerCase();
        const labels = {
            high: 'مرتفعة',
            medium: 'متوسطة',
            low: 'منخفضة'
        };
        return labels[value] || 'غير محددة';
    };

    ManagerClass.prototype.updateScanStatus = function(statusText, statusClass) {
        const statusDisplay = document.getElementById('scan-status-display');
        if (statusDisplay) {
            statusDisplay.innerHTML = `<span class="status-badge status-${statusClass}">${statusText}</span>`;
        }

        const modalHeader = document.querySelector('#scan-progress-modal .modal-header h2');
        if (modalHeader) {
            const iconMap = {
                completed: 'fa-check-circle',
                failed: 'fa-times-circle',
                stopped: 'fa-stop-circle',
                timeout: 'fa-clock',
                running: 'fa-spinner fa-spin'
            };
            const icon = iconMap[statusClass] || 'fa-info-circle';
            modalHeader.innerHTML = `<i class="fas ${icon}"></i> ${statusClass === 'running' ? 'جاري فحص الهدف...' : `حالة الفحص: ${statusText}`}`;
        }

        const stopBtn = document.getElementById('stop-scan-btn');
        if (stopBtn && ['completed', 'failed', 'stopped', 'timeout'].includes(statusClass)) {
            stopBtn.style.display = 'none';
        }
    };

    ManagerClass.prototype.closeScanProgress = function() {
        if (typeof this.progressModalCleanup === 'function') {
            this.progressModalCleanup();
            this.progressModalCleanup = null;
        }

        const modal = document.getElementById('scan-progress-modal');
        if (modal) {
            modal.remove();
        }
        this.currentScanId = null;
        this.loadRecentScans();
    };
})();
