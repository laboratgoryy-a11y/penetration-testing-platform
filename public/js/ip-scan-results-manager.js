class IPScanResultsManager {
    constructor() {
        this.normalizer = window.IPScanReportNormalizer ? new window.IPScanReportNormalizer() : null;
        this.scanId = null;
        this.scanData = null;
        this.resultsData = {};
        this.reportData = null;
        this.hostsData = [];
        this.portsData = [];
        this.vulnsData = [];
        this.servicesData = [];
        this.filteredHostsData = [];
        this.filteredPortsData = [];
        this.filteredVulnsData = [];
        this.filteredServicesData = [];
        this.hostSearchTerm = '';
        this.hostStatusFilter = 'all';
        this.portSearchTerm = '';
        this.portStateFilter = 'all';
        this.portSortBy = 'risk';
        this.serviceSearchTerm = '';
        this.serviceSortBy = 'service';
        this.vulnSearchTerm = '';
        this.vulnSeverityFilter = 'all';
        this.vulnSortBy = 'severity';
    }

    async initialize(scanId) {
        this.scanId = scanId;

        try {
            loadingManager.showGlobal('جارٍ تحميل تقرير فحص عنوان IP...');
            await this.loadReportContext();
            this.applyAllFilters();
            this.displayScanInfo();
            this.displaySummary();
            this.displayOverview();
            this.displayHosts();
            this.displayPorts();
            this.displayServices();
            this.displayVulnerabilities();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing results:', error);
            this.notify('فشل تحميل تقرير فحص عنوان IP.', 'error');
        } finally {
            loadingManager.hideGlobal();
        }
    }

    async loadReportContext() {
        const urlParams = new URLSearchParams(window.location.search);
        const importKey = urlParams.get('importKey');

        if (importKey) {
            const importedPayload = sessionStorage.getItem(`ipScanImportedReport:${importKey}`);
            if (!importedPayload) {
                throw new Error('Imported report is unavailable');
            }

            this.reportData = JSON.parse(importedPayload);
            this.scanData = {
                id: importKey,
                status: 'COMPLETED',
                target_value: this.reportData.targetValue,
                scan_type: 'IMPORTED_REPORT',
                started_at: this.reportData.startedAt,
                completed_at: this.reportData.finishedAt,
                updated_at: this.reportData.importedAt,
            };
            this.applyReportData();
            return;
        }

        if (!this.scanId) {
            throw new Error('Missing scan ID');
        }

        await this.loadScanData();
        await this.loadResults();
        this.reportData = this.normalizer
            ? this.normalizer.normalizeApiResults(this.scanData, this.resultsData)
            : null;
        this.applyReportData();
    }

    async loadScanData() {
        const response = await api.getIpScan(this.scanId);
        if (!response.success) throw new Error('Failed to load scan data');
        this.scanData = response.data || {};
    }

    async loadResults() {
        const response = await api.getIpScanResults(this.scanId);
        if (!response.success) throw new Error('Failed to load scan results');

        this.resultsData = response.data || {};
        this.hostsData = Array.isArray(this.resultsData.hosts) ? this.resultsData.hosts : [];
        this.portsData = Array.isArray(this.resultsData.ports) ? this.resultsData.ports : [];
        this.vulnsData = Array.isArray(this.resultsData.vulnerabilities) ? this.resultsData.vulnerabilities : [];
        this.servicesData = Array.isArray(this.resultsData.services)
            ? this.resultsData.services
            : this.portsData
                .filter((port) => this.normalizeText(port.state) === 'open')
                .map((port) => ({
                    ip_address: port.ip_address || port.ip || null,
                    port: port.port || null,
                    service_name: port.service_name || port.service || null,
                    transport: port.protocol || 'tcp',
                    service_product: port.service_product || null,
                    service_version: port.service_version || null,
                }));
    }

    applyReportData() {
        const report = this.reportData || {};
        this.resultsData = report;
        this.hostsData = Array.isArray(report.hosts) ? report.hosts : this.hostsData;
        this.portsData = Array.isArray(report.ports) ? report.ports : this.portsData;
        this.vulnsData = Array.isArray(report.findings) ? report.findings : this.vulnsData;
        this.servicesData = Array.isArray(report.services) ? report.services : this.servicesData;
    }

    displayScanInfo() {
        const target = this.scanData.target_value || this.scanData.targetValue || this.resultsData.targetValue || 'غير متاح';
        const scanType = this.getScanTypeLabel(
            this.scanData.scan_type ||
            this.scanData.payload?.config?.scanType ||
            this.scanData.payload?.config?.scan_type ||
            'IP_SCAN'
        );
        const summary = this.buildSummary();

        this.setText('scan-target', target);
        this.setText('scan-type', scanType);
        this.setText('scan-date', this.formatDate(summary.finishedAt));
        this.setText('scan-status-pill', this.getStatusText(this.scanData.status || 'COMPLETED'));
        this.setText('report-source-name', this.reportData?.sourceName || 'فحص النظام الداخلي');
        this.setText('report-source-type', this.reportData?.sourceType || 'runtime-scan');
    }

    displaySummary() {
        const summary = this.buildSummary();
        document.getElementById('summary-stats').innerHTML = `
            ${this.renderStatCard('fa-server', summary.totalHosts, 'الأجهزة المكتشفة')}
            ${this.renderStatCard('fa-door-open', summary.openPorts, 'المنافذ المفتوحة')}
            ${this.renderStatCard('fa-gears', summary.servicesDetected, 'الخدمات المكتشفة')}
            ${this.renderStatCard('fa-triangle-exclamation', summary.totalThreats, 'الملاحظات الأمنية')}
            ${this.renderStatCard('fa-gauge-high', `${summary.riskScore}/100`, 'درجة المخاطر')}
            ${this.renderStatCard('fa-shield-heart', `${summary.securityScore}/100`, 'درجة الأمان')}
        `;

        document.getElementById('summary-content').innerHTML = `
            <div class="summary-hero">
                <div class="summary-hero-text">
                    <h3>الملخص التنفيذي</h3>
                    <p>${summary.executiveSummary}</p>
                </div>
                <div class="summary-hero-badges">
                    <span class="summary-chip">${summary.executionModeLabel}</span>
                    <span class="summary-chip">${summary.scanTypeLabel}</span>
                    <span class="summary-chip">${summary.riskLevelLabel}</span>
                </div>
            </div>

            <details class="result-section" open>
                <summary>ملخص الأصل والفحص</summary>
                ${this.renderKeyValueTable([
                    ['عنوان الأصل', summary.targetValue],
                    ['نوع الفحص', summary.scanTypeLabel],
                    ['حالة المضيف', summary.addressState],
                    ['وقت البدء', this.formatDate(summary.startedAt)],
                    ['وقت الانتهاء', this.formatDate(summary.finishedAt)],
                    ['مدة الفحص', this.formatDuration(summary.scanDuration)],
                    ['نمط التنفيذ', summary.executionModeLabel],
                    ['أخطر خدمة مكتشفة', summary.highestRiskService],
                    ['خدمات وصول عن بعد', summary.hasRemoteAccess ? 'نعم' : 'لا'],
                    ['خدمات ويب', summary.hasWebExposure ? 'نعم' : 'لا'],
                    ['خدمات قواعد بيانات', summary.hasDatabases ? 'نعم' : 'لا'],
                    ['الخدمات الحساسة', summary.sensitiveServices],
                    ['مستوى الثقة', `${summary.confidenceScore}/100`],
                ])}
            </details>

            <details class="result-section" open>
                <summary>مؤشرات المخاطر</summary>
                ${this.renderSummaryGrid([
                    ['درجة المخاطر', `${summary.riskScore}/100`],
                    ['درجة الأمان', `${summary.securityScore}/100`],
                    ['مستوى الثقة', `${summary.confidenceScore}/100`],
                    ['عدد التنبيهات', summary.alerts],
                    ['عدد التحذيرات', summary.warningCount],
                    ['العناصر غير المؤكدة', summary.uncertainItems],
                    ['البيانات غير المتاحة', summary.unavailableCount],
                    ['الحالة العامة', summary.riskLevelLabel],
                ])}
            </details>

            <details class="result-section" open>
                <summary>حدود المصدر والحقول الناقصة</summary>
                ${this.renderEmptyOrList(summary.limitations, 'لا توجد ملاحظات إضافية على المصدر الحالي.')}
            </details>
        `;
    }

    displayOverview() {
        const summary = this.buildSummary();
        const container = document.getElementById('overview-sections');
        if (!container) return;

        container.innerHTML = `
            <details class="result-section" open>
                <summary>هوية الأصل</summary>
                ${this.renderKeyValueTable([
                    ['IP', this.resultsData.targetValue || this.scanData?.target_value],
                    ['Hostname', this.resultsData.hostname],
                    ['Reverse DNS', this.resultsData.reverseDns],
                    ['نوع الهدف', this.resultsData.targetType || 'IP'],
                    ['حالة الاتصال', summary.addressState],
                    ['زمن الاستجابة', this.renderResponseTime(this.resultsData.latencyMs)],
                    ['آخر تحديث', this.formatDate(this.resultsData.finishedAt || this.scanData?.updated_at)],
                ])}
            </details>

            <details class="result-section" open>
                <summary>جدول المنافذ والخدمات</summary>
                ${this.renderPortsTable(this.filteredPortsData, true)}
            </details>

            <details class="result-section" open>
                <summary>تصنيف الخدمات</summary>
                ${this.renderServicesTable(this.filteredServicesData, true)}
                ${this.renderServiceGroups()}
            </details>

            <details class="result-section" open>
                <summary>التحليل الأمني</summary>
                ${this.renderSecurityAnalysis()}
            </details>

            <details class="result-section" open>
                <summary>سجل الفحص</summary>
                ${this.renderTimeline()}
            </details>

            <details class="result-section" open>
                <summary>الخلاصة النهائية</summary>
                <div class="summary-note-block">${summary.executiveSummary}</div>
            </details>
        `;
    }

    displayHosts() {
        const container = document.getElementById('hosts-table-container');
        if (container) container.innerHTML = this.renderHostsTable(this.filteredHostsData, false);
    }

    displayPorts() {
        const container = document.getElementById('ports-table-container');
        if (container) container.innerHTML = this.renderPortsTable(this.filteredPortsData, false);
    }

    displayServices() {
        const container = document.getElementById('services-table-container');
        if (container) container.innerHTML = this.renderServicesTable(this.filteredServicesData, false);
    }

    displayVulnerabilities() {
        const container = document.getElementById('vulns-table-container');
        if (container) container.innerHTML = this.renderVulnerabilitiesTable(this.filteredVulnsData, false);
    }

    renderHostsTable(rows, compact) {
        if (!rows.length) return this.renderEmptyState('لا توجد أجهزة مكتشفة في هذا الفحص.');
        return this.renderTable(
            ['IP', 'MAC Address', 'Hostname', 'Reverse DNS', 'Vendor', 'OS', 'الحالة', 'RTT', 'المنافذ المفتوحة'],
            rows.map((host) => [
                this.renderCode(host.ip_address || host.ip),
                this.safeValue(host.mac_address),
                this.safeValue(host.hostname),
                this.safeValue(host.reverse_dns),
                this.safeValue(host.vendor),
                this.safeValue(host.os_name || host.os),
                this.renderStatusPill(host.status || host.state),
                this.renderResponseTime(host.latency_ms),
                this.safeCount(host.port_count ?? host.open_ports),
            ]),
            compact
        );
    }

    renderPortsTable(rows, compact) {
        if (!rows.length) return this.renderEmptyState('لا توجد بيانات منافذ لهذا الفحص.');
        return this.renderTable(
            ['IP', 'المنفذ', 'البروتوكول', 'الحالة', 'الخدمة', 'الوصف', 'الإصدار/البصمة', 'الخطورة', 'سبب التصنيف', 'التوصية', 'الثقة'],
            rows.map((port) => [
                this.renderCode(port.ip_address || port.ip),
                this.safeValue(port.port),
                this.safeValue(port.protocol),
                this.renderStatusPill(port.state),
                this.safeValue(port.service_label || port.service_name),
                this.safeValue(port.description),
                this.safeValue([port.service_product, port.service_version, port.banner].filter(Boolean).join(' | ')),
                this.renderSeverityPill(port.risk_level),
                this.safeValue(port.risk_reason),
                this.safeValue(port.recommendation),
                this.safeValue(this.getConfidenceLabel(port.confidence)),
            ]),
            compact
        );
    }

    renderServicesTable(rows, compact) {
        if (!rows.length) return this.renderEmptyState('لا توجد خدمات مكتشفة على المنافذ المفتوحة.');
        return this.renderTable(
            ['IP', 'المنفذ', 'الخدمة', 'الفئة', 'البروتوكول', 'الإصدار', 'الثقة'],
            rows.map((service) => [
                this.renderCode(service.ip_address),
                this.safeValue(service.port),
                this.safeValue(service.service_name),
                this.safeValue(this.translateServiceCategory(service.category)),
                this.safeValue(service.transport),
                this.safeValue([service.service_product, service.service_version, service.banner].filter(Boolean).join(' | ')),
                this.safeValue(this.getConfidenceLabel(service.confidence)),
            ]),
            compact
        );
    }

    renderVulnerabilitiesTable(rows, compact) {
        if (!rows.length) return this.renderEmptyState('لم يتم رصد ملاحظات أمنية إضافية في هذا المصدر.');
        return this.renderTable(
            ['IP', 'النوع', 'الخطورة', 'العنوان', 'المنفذ', 'الثقة', 'الوصف', 'التوصية'],
            rows.map((finding) => [
                this.renderCode(finding.ip_address || finding.ip),
                this.safeValue(finding.type),
                this.renderSeverityPill(finding.severity),
                this.safeValue(finding.title),
                this.safeValue(finding.port),
                this.safeValue(this.getConfidenceLabel(finding.confidence)),
                this.safeValue(finding.description),
                this.safeValue(finding.recommendation),
            ]),
            compact
        );
    }

    renderServiceGroups() {
        const grouped = this.resultsData.groupedServices || {};
        const sections = [
            ['خدمات الويب', grouped.web || []],
            ['الوصول عن بعد', grouped.remote || []],
            ['قواعد البيانات', grouped.databases || []],
            ['مشاركة الملفات', grouped.sharing || []],
            ['البنية التحتية', grouped.infrastructure || []],
            ['أخرى', grouped.other || []],
        ];

        return `
            <div class="service-groups-grid">
                ${sections.map(([title, items]) => `
                    <div class="service-group-card">
                        <h5>${title}</h5>
                        <div class="service-group-count">${items.length}</div>
                        <p>${items.length ? items.map((item) => `${item.service_name || 'غير معروف'}:${item.port || '-'}`).join('، ') : 'لا توجد خدمات ضمن هذه المجموعة.'}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderSecurityAnalysis() {
        const analysis = this.resultsData.securityAnalysis || {};
        return `
            <div class="security-analysis-grid">
                <div class="analysis-card">
                    <h5>المنافذ الحساسة</h5>
                    ${analysis.sensitivePorts?.length
                        ? analysis.sensitivePorts.map((item) => `<div class="analysis-item"><strong>${item.service}</strong> على ${item.port}/${item.protocol} - ${this.safeValue(item.reason)}<br><small>الأولوية: ${this.safeValue(item.priority)}</small></div>`).join('')
                        : '<div class="analysis-item">لا توجد منافذ مصنفة عالية الحساسية في النتائج الحالية.</div>'}
                </div>
                <div class="analysis-card">
                    <h5>الخدمات القديمة أو القابلة للمراجعة</h5>
                    ${analysis.legacyServices?.length
                        ? analysis.legacyServices.map((item) => `<div class="analysis-item"><strong>${item.service}</strong> على المنفذ ${item.port} - ${item.reason}</div>`).join('')
                        : '<div class="analysis-item">لم يتم رصد خدمات قديمة واضحة ضمن البيانات المتاحة.</div>'}
                </div>
                <div class="analysis-card">
                    <h5>مؤشرات التعرض</h5>
                    ${analysis.exposureFlags?.length
                        ? analysis.exposureFlags.map((item) => `<div class="analysis-item">${item}</div>`).join('')
                        : '<div class="analysis-item">لا توجد مؤشرات تعرض إضافية مؤكدة من هذا المصدر.</div>'}
                </div>
                <div class="analysis-card">
                    <h5>التوصيات الدفاعية</h5>
                    ${analysis.recommendations?.length
                        ? analysis.recommendations.map((item) => `<div class="analysis-item">${item}</div>`).join('')
                        : '<div class="analysis-item">لا توجد توصيات إضافية من المصدر الحالي.</div>'}
                </div>
            </div>
        `;
    }

    renderTimeline() {
        const items = Array.isArray(this.resultsData.timeline) ? this.resultsData.timeline : [];
        const parsingItems = Array.isArray(this.resultsData.parsingErrors)
            ? this.resultsData.parsingErrors.map((error) => ({
                stage: 'Parsing',
                status: 'تحذير',
                started_at: this.resultsData.importedAt || new Date().toISOString(),
                finished_at: this.resultsData.importedAt || new Date().toISOString(),
                duration_ms: 0,
                parsing_status: 'خطأ',
                note: error,
            }))
            : [];
        const timeline = [...items, ...parsingItems];
        if (!timeline.length) return this.renderEmptyState('لا توجد مراحل مسجلة لهذا الفحص.');

        return `
            <div class="timeline-list">
                ${timeline.map((item) => `
                    <div class="timeline-item">
                        <div class="timeline-dot ${this.timelineStatusClass(item.status)}"></div>
                        <div class="timeline-content">
                            <div class="timeline-title">${this.safeValue(item.stage)} - ${this.safeValue(item.status)}</div>
                            <div class="timeline-time">
                                البداية: ${this.formatDate(item.started_at)} |
                                النهاية: ${this.formatDate(item.finished_at)} |
                                المدة: ${this.formatDurationMs(item.duration_ms)}
                            </div>
                            <div class="timeline-note">حالة الـ parsing: ${this.safeValue(item.parsing_status || 'سليم')}</div>
                            ${item.note ? `<div class="timeline-note">${this.safeValue(item.note)}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderTable(headers, rows, compact) {
        return `
            <div class="table-scroll-wrap ${compact ? 'compact-table' : ''}">
                <table class="data-table detailed-results-table">
                    <thead>
                        <tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>
                    </thead>
                    <tbody>
                        ${rows.map((columns) => `<tr>${columns.map((value) => `<td>${value}</td>`).join('')}</tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderKeyValueTable(rows) {
        return `
            <div class="table-scroll-wrap">
                <table class="data-table key-value-table">
                    <tbody>
                        ${rows.map(([label, value]) => `
                            <tr>
                                <th>${label}</th>
                                <td>${this.safeValue(value)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderSummaryGrid(items) {
        return `
            <div class="summary-grid">
                ${items.map(([label, value]) => `
                    <div class="summary-item">
                        <span class="summary-label">${label}</span>
                        <span class="summary-value">${this.safeValue(value)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderEmptyOrList(items, emptyMessage) {
        if (!Array.isArray(items) || items.length === 0) return this.renderEmptyState(emptyMessage);
        return `<div class="notes-list">${items.map((item) => `<div class="note-item">${this.safeValue(item)}</div>`).join('')}</div>`;
    }

    renderEmptyState(message) {
        return `<div class="no-data"><i class="fas fa-circle-info"></i><p>${message}</p></div>`;
    }

    renderStatCard(icon, value, label) {
        return `
            <div class="stat-card">
                <div class="stat-icon"><i class="fas ${icon}"></i></div>
                <div class="stat-info">
                    <div class="stat-value">${this.safeValue(value)}</div>
                    <div class="stat-label">${label}</div>
                </div>
            </div>
        `;
    }

    renderCode(value) {
        return `<code>${this.safeValue(value)}</code>`;
    }

    renderStatusPill(value) {
        const normalized = this.normalizeText(value) || 'unknown';
        return `<span class="status-chip status-chip-${normalized}">${this.getStatusText(value)}</span>`;
    }

    renderSeverityPill(value) {
        const normalized = this.normalizeText(value) || 'unknown';
        return `<span class="severity-badge ${normalized}">${this.getSeverityLabel(value)}</span>`;
    }

    renderResponseTime(value) {
        return value === null || value === undefined || value === '' ? 'غير متاح' : `${value} ms`;
    }

    buildSummary() {
        const metrics = this.resultsData.metrics || {};
        const startedAt = this.resultsData.startedAt || this.scanData?.started_at || this.scanData?.created_at || null;
        const finishedAt = this.resultsData.finishedAt || this.scanData?.completed_at || this.scanData?.updated_at || null;
        const startedMs = startedAt ? new Date(startedAt).getTime() : Date.now();
        const finishedMs = finishedAt ? new Date(finishedAt).getTime() : Date.now();
        const scanDuration = Math.max(Math.round((finishedMs - startedMs) / 1000), 0);
        const targetValue = this.resultsData.targetValue || this.scanData?.target_value || this.scanData?.targetValue || 'غير متاح';
        const statusLabel = this.getStatusText(this.scanData?.status || 'COMPLETED');
        const executionMode = this.resultsData.executionMode || 'native-tcp';
        const executionModeLabel = {
            nmap: 'Nmap',
            imported: 'مصدر مستورد',
            'xml-import': 'استيراد XML',
            'csv-import': 'استيراد CSV',
            'imported-json': 'استيراد JSON',
            'native-tcp': 'المحرك الداخلي TCP',
        }[executionMode] || executionMode;

        const liveHosts = metrics.liveHosts ?? this.hostsData.filter((host) => this.normalizeText(host.status) === 'up').length;
        const totalHosts = this.hostsData.length;
        const unavailableCount = (this.resultsData.unavailableFields?.length || 0);
        const warningCount = metrics.warnings ?? 0;
        const limitations = [
            ...(Array.isArray(this.resultsData.limitations) ? this.resultsData.limitations : []),
            ...(Array.isArray(this.resultsData.parsingErrors) ? this.resultsData.parsingErrors.map((item) => `تحذير parsing: ${item}`) : []),
            ...(Array.isArray(this.resultsData.unavailableFields) ? this.resultsData.unavailableFields : []),
        ];
        const addressState = totalHosts > 0 ? (liveHosts > 0 ? 'حي' : 'مفلتر أو لا يرد') : 'غير متاح';
        const riskLevelLabel = metrics.riskLevel ? `الخطر العام: ${metrics.riskLevel}` : 'الخطر العام: غير متاح';
        const totalThreats = this.vulnsData.length;
        const openPorts = metrics.openPorts ?? 0;
        const executiveSummaryParts = [
            `تم تحليل الأصل ${targetValue}.`,
            totalHosts ? `عدد الأجهزة المكتشفة: ${totalHosts}.` : 'لم يتم تأكيد أجهزة إضافية من المصدر.',
            openPorts ? `تم رصد ${openPorts} منفذ مفتوح.` : 'لم يتم رصد منافذ مفتوحة ضمن المصدر الحالي.',
            metrics.highestRiskService && metrics.highestRiskService !== 'غير متاح' ? `أخطر خدمة مرصودة: ${metrics.highestRiskService}.` : null,
            metrics.hasRemoteAccess ? 'يوجد تعرض لخدمات وصول عن بعد.' : null,
            metrics.hasDatabases ? 'يوجد تعرض لخدمات قواعد بيانات.' : null,
            metrics.hasWebExposure ? 'يوجد تعرض لخدمات ويب.' : null,
            totalThreats ? `عدد الملاحظات الأمنية: ${totalThreats}.` : 'لا توجد ملاحظات أمنية مؤكدة إضافية من المصدر.',
        ].filter(Boolean);

        return {
            targetValue,
            totalHosts,
            liveHosts,
            openPorts,
            closedPorts: metrics.closedPorts ?? 0,
            filteredPorts: metrics.filteredPorts ?? 0,
            servicesDetected: metrics.servicesDetected ?? this.servicesData.length,
            totalThreats,
            warningCount,
            unavailableCount,
            startedAt,
            finishedAt,
            scanDuration,
            addressState,
            executionModeLabel,
            scanTypeLabel: this.getScanTypeLabel(
                this.scanData?.scan_type ||
                this.scanData?.payload?.config?.scanType ||
                this.scanData?.payload?.config?.scan_type ||
                'IP_SCAN'
            ),
            statusLabel,
            limitations,
            executiveSummary: executiveSummaryParts.join(' '),
            riskScore: metrics.riskScore ?? 'غير متاح',
            securityScore: metrics.securityScore ?? 'غير متاح',
            confidenceScore: metrics.confidence ?? 'غير متاح',
            riskLevelLabel,
            highestRiskService: metrics.highestRiskService || 'غير متاح',
            sensitiveServices: metrics.sensitiveServices ?? 0,
            hasRemoteAccess: Boolean(metrics.hasRemoteAccess),
            hasWebExposure: Boolean(metrics.hasWebExposure),
            hasDatabases: Boolean(metrics.hasDatabases),
            alerts: metrics.alerts ?? 0,
            uncertainItems: metrics.uncertainItems ?? 0,
        };
    }

    setupEventListeners() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                tabButtons.forEach((btn) => btn.classList.remove('active'));
                tabPanes.forEach((pane) => pane.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(`${tabName}-tab`)?.classList.add('active');
            });
        });

        document.getElementById('export-report-btn')?.addEventListener('click', () => this.exportReport());
        document.getElementById('refresh-results-btn')?.addEventListener('click', () => window.location.reload());
        this.setupSearchAndFilters();
    }

    setupSearchAndFilters() {
        this.bindInput('hosts-search', (value) => { this.hostSearchTerm = value; this.refreshHostsViews(); });
        this.bindInput('ports-search', (value) => { this.portSearchTerm = value; this.refreshPortViews(); });
        this.bindInput('services-search', (value) => { this.serviceSearchTerm = value; this.refreshServiceViews(); });
        this.bindInput('vulns-search', (value) => { this.vulnSearchTerm = value; this.refreshVulnViews(); });
        this.bindSelect('hosts-status-filter', (value) => { this.hostStatusFilter = value; this.refreshHostsViews(); });
        this.bindSelect('ports-state-filter', (value) => { this.portStateFilter = value; this.refreshPortViews(); });
        this.bindSelect('ports-sort-by', (value) => { this.portSortBy = value; this.refreshPortViews(); });
        this.bindSelect('services-sort-by', (value) => { this.serviceSortBy = value; this.refreshServiceViews(); });
        this.bindSelect('vulns-severity-filter', (value) => { this.vulnSeverityFilter = value; this.refreshVulnViews(); });
        this.bindSelect('vulns-sort-by', (value) => { this.vulnSortBy = value; this.refreshVulnViews(); });
    }

    bindInput(id, callback) {
        document.getElementById(id)?.addEventListener('input', (event) => callback(event.target.value || ''));
    }

    bindSelect(id, callback) {
        document.getElementById(id)?.addEventListener('change', (event) => callback(event.target.value || 'all'));
    }

    refreshHostsViews() {
        this.applyHostFilters();
        this.displayHosts();
        this.displayOverview();
    }

    refreshPortViews() {
        this.applyPortFilters();
        this.displayPorts();
        this.displayOverview();
    }

    refreshServiceViews() {
        this.applyServiceFilters();
        this.displayServices();
        this.displayOverview();
    }

    refreshVulnViews() {
        this.applyVulnerabilityFilters();
        this.displayVulnerabilities();
        this.displayOverview();
    }

    applyAllFilters() {
        this.applyHostFilters();
        this.applyPortFilters();
        this.applyServiceFilters();
        this.applyVulnerabilityFilters();
    }

    applyHostFilters() {
        const statusFilter = this.normalizeText(this.hostStatusFilter);
        const searchTerm = this.normalizeText(this.hostSearchTerm);
        this.filteredHostsData = this.hostsData.filter((host) => {
            const status = this.normalizeText(host.status || host.state);
            const haystack = this.normalizeText([
                host.ip_address, host.ip, host.mac_address, host.hostname, host.reverse_dns, host.vendor, host.os_name, host.os
            ].filter(Boolean).join(' '));
            return (!searchTerm || haystack.includes(searchTerm)) && (statusFilter === 'all' || status === statusFilter);
        });
    }

    applyPortFilters() {
        const stateFilter = this.normalizeText(this.portStateFilter);
        const searchTerm = this.normalizeText(this.portSearchTerm);
        const severityRank = { critical: 4, high: 3, medium: 2, low: 1, unknown: 0 };

        this.filteredPortsData = this.portsData.filter((port) => {
            const state = this.normalizeText(port.state);
            const haystack = this.normalizeText([
                port.ip_address, port.ip, port.port, port.protocol, port.service_name, port.service_label,
                port.service_product, port.service_version, port.description, port.risk_reason
            ].filter(Boolean).join(' '));
            return (!searchTerm || haystack.includes(searchTerm)) && (stateFilter === 'all' || state === stateFilter);
        }).sort((left, right) => {
            if (this.portSortBy === 'port') return (left.port || 0) - (right.port || 0);
            if (this.portSortBy === 'service') return this.safeValue(left.service_label).localeCompare(this.safeValue(right.service_label), 'ar');
            if (this.portSortBy === 'state') return this.safeValue(left.state).localeCompare(this.safeValue(right.state), 'ar');
            return (severityRank[right.risk_level] || 0) - (severityRank[left.risk_level] || 0) || ((left.port || 0) - (right.port || 0));
        });
    }

    applyServiceFilters() {
        const searchTerm = this.normalizeText(this.serviceSearchTerm);
        this.filteredServicesData = this.servicesData.filter((service) => {
            const haystack = this.normalizeText([
                service.ip_address, service.port, service.service_name, service.transport, service.service_product,
                service.service_version, service.category, service.description
            ].filter(Boolean).join(' '));
            return !searchTerm || haystack.includes(searchTerm);
        }).sort((left, right) => {
            if (this.serviceSortBy === 'port') return (left.port || 0) - (right.port || 0);
            if (this.serviceSortBy === 'category') return this.translateServiceCategory(left.category).localeCompare(this.translateServiceCategory(right.category), 'ar');
            return this.safeValue(left.service_name).localeCompare(this.safeValue(right.service_name), 'ar');
        });
    }

    applyVulnerabilityFilters() {
        const severityFilter = this.normalizeText(this.vulnSeverityFilter);
        const searchTerm = this.normalizeText(this.vulnSearchTerm);
        const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
        this.filteredVulnsData = this.vulnsData.filter((vuln) => {
            const severity = this.normalizeText(vuln.severity);
            const haystack = this.normalizeText([
                vuln.ip_address, vuln.ip, vuln.type, vuln.title, vuln.description, vuln.port, vuln.confidence, vuln.recommendation
            ].filter(Boolean).join(' '));
            return (!searchTerm || haystack.includes(searchTerm)) && (severityFilter === 'all' || severity === severityFilter);
        }).sort((left, right) => {
            if (this.vulnSortBy === 'title') return this.safeValue(left.title).localeCompare(this.safeValue(right.title), 'ar');
            if (this.vulnSortBy === 'port') return (left.port || 0) - (right.port || 0);
            return (severityRank[right.severity] || 0) - (severityRank[left.severity] || 0);
        });
    }

    async exportReport() {
        try {
            loadingManager.showGlobal('جارٍ تجهيز طلب إنشاء التقرير...');
            const response = await api.createReport({
                reportType: 'IP_SCAN',
                format: 'PDF',
                sourceJobId: this.scanId,
                metadata: {
                    scanId: this.scanId,
                    targetValue: this.scanData?.target_value || this.scanData?.targetValue || null
                }
            });
            if (!response.success) throw new Error('Failed to queue report generation');
            this.notify('تمت جدولة إنشاء التقرير بنجاح.', 'success');
        } catch (error) {
            console.error('Error exporting report:', error);
            this.notify('فشل إنشاء التقرير.', 'error');
        } finally {
            loadingManager.hideGlobal();
        }
    }

    getScanTypeLabel(scanType) {
        const labels = {
            IMPORTED_REPORT: 'تقرير مستورد معتمد',
            QUICK_SCAN: 'فحص سريع',
            COMPREHENSIVE_SCAN: 'فحص شامل',
            PORT_SCAN: 'فحص المنافذ',
            SERVICE_SCAN: 'تصنيف الخدمات',
            OS_DETECTION: 'كشف نظام التشغيل',
            VULNERABILITY_SCAN: 'فحص الملاحظات الأمنية',
            STEALTH_SCAN: 'فحص منخفض البصمة',
            IP_SCAN: 'فحص عنوان IP',
        };
        return labels[scanType] || scanType || 'غير متاح';
    }

    getStatusText(status) {
        const labels = {
            pending: 'في الانتظار',
            running: 'قيد التنفيذ',
            completed: 'مكتمل',
            failed: 'فشل',
            cancelled: 'ملغي',
            stopped: 'متوقف',
            timeout: 'انتهت المهلة',
            up: 'حي',
            down: 'غير متاح',
            filtered: 'مفلتر',
            open: 'مفتوح',
            closed: 'مغلق',
            unknown: 'غير معروف',
        };
        return labels[this.normalizeText(status)] || this.safeValue(status);
    }

    getSeverityLabel(severity) {
        const labels = { critical: 'حرجة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
        return labels[this.normalizeText(severity)] || 'غير مصنفة';
    }

    getConfidenceLabel(confidence) {
        const labels = { high: 'مرتفعة', medium: 'متوسطة', low: 'منخفضة' };
        return labels[this.normalizeText(confidence)] || 'غير متاح';
    }

    translateServiceCategory(category) {
        const labels = {
            'Web Services': 'خدمات الويب',
            'Remote Access': 'الوصول عن بعد',
            Databases: 'قواعد البيانات',
            'File Sharing': 'مشاركة الملفات',
            Infrastructure: 'البنية التحتية',
            Other: 'أخرى',
        };
        return labels[category] || this.safeValue(category);
    }

    timelineStatusClass(status) {
        const normalized = this.normalizeText(status);
        if (normalized.includes('تحذير')) return 'warning';
        if (normalized.includes('فشل')) return 'danger';
        return 'success';
    }

    normalizeText(value) {
        return String(value || '').trim().toLowerCase();
    }

    formatDate(dateString) {
        if (!dateString) return 'غير متاح';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return 'غير متاح';
        return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }

    formatDuration(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return 'غير متاح';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        if (hours > 0) return `${hours} س ${minutes} د ${remainingSeconds} ث`;
        if (minutes > 0) return `${minutes} د ${remainingSeconds} ث`;
        return `${remainingSeconds} ث`;
    }

    formatDurationMs(durationMs) {
        if (!Number.isFinite(durationMs) || durationMs < 0) return 'غير متاح';
        if (durationMs < 1000) return `${durationMs} ms`;
        return this.formatDuration(Math.round(durationMs / 1000));
    }

    safeCount(value) {
        return value === null || value === undefined || value === '' ? '0' : String(value);
    }

    safeValue(value) {
        return value === null || value === undefined || value === '' ? 'غير متاح' : String(value);
    }

    setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = this.safeValue(value);
    }

    notify(message, type) {
        if (window.notificationManager?.show) return window.notificationManager.show(message, type);
        if (window.notificationManager?.showNotification) window.notificationManager.showNotification(message, type);
    }
}

window.IPScanResultsManager = IPScanResultsManager;
window.ipScanResultsManager = new IPScanResultsManager();
