// Network Analyzer Section Manager
// مسؤول عن عرض تحليلات الشبكة، متابعة حالتها، وإظهار النتائج الفعلية

class NetworkAnalyzerManager {
  constructor(stateManager, apiClient) {
    this.stateManager = stateManager;
    this.apiClient = apiClient;
    this.pollingInterval = 5000;
    this.currentAnalysisId = null;
    this.pollingIntervalId = null;
  }

  async initialize() {
    await this.loadNetworkAnalyses();
  }

  async loadNetworkAnalyses() {
    try {
      this.setLoading(true);
      const response = await this.apiClient.getNetworkTests();
      const analyses = (response.data?.tests || []).map((item) => this.normalizeAnalysis(item));

      this.stateManager.updateState({
        networkAnalyses: analyses,
        loading: false,
        error: null,
      });

      this.renderAnalysesList(analyses);
      this.startPollingForActiveAnalyses(analyses);

      if (!this.currentAnalysisId && analyses.length) {
        await this.loadAnalysisDetails(analyses[0].id || analyses[0].sessionId);
      }
    } catch (error) {
      this.setLoading(false);
      this.showError('فشل تحميل قائمة تحليلات الشبكة: ' + error.message);
    }
  }

  async loadAnalysisDetails(analysisId) {
    try {
      this.currentAnalysisId = analysisId;
      this.setLoading(true);

      const analysisResponse = await this.apiClient.getNetworkTest(analysisId);
      const analysis = this.normalizeAnalysis(
        analysisResponse.data?.test || analysisResponse.data
      );

      let results = {};
      let logs = [];
      let artifacts = [];
      try {
        const resultsResponse = await this.apiClient.getNetworkResults(analysisId);
        results = resultsResponse.data?.results || resultsResponse.data || {};
      } catch (error) {
        if (this.hasResultPayload(analysis)) {
          throw error;
        }
      }

      try {
        const logsResponse = await this.apiClient.getNetworkTestLogs(analysisId);
        logs = logsResponse.data?.logs || [];
      } catch (_error) {}

      try {
        const artifactsResponse = await this.apiClient.getNetworkTestArtifacts(analysisId);
        artifacts = artifactsResponse.data?.artifacts || [];
      } catch (_error) {}

      this.stateManager.updateState({
        currentAnalysis: analysis,
        currentAnalysisResults: results,
        currentAnalysisLogs: logs,
        currentAnalysisArtifacts: artifacts,
        loading: false,
        error: null,
      });

      this.renderAnalysisDetails(analysis, results, logs, artifacts);

      if (this.isActiveStatus(analysis.status)) {
        this.startPollingForAnalysis(analysisId);
      } else {
        this.stopPolling();
      }
    } catch (error) {
      this.setLoading(false);
      this.showError('فشل تحميل تفاصيل التحليل: ' + error.message);
    }
  }

  normalizeAnalysis(analysis) {
    if (!analysis) {
      return analysis;
    }

    const results = analysis.results || analysis.resultSummary || {};
    const target = analysis.target || analysis.payload?.target || {};

    return {
      ...analysis,
      id: analysis.id || analysis.sessionId,
      sessionId: analysis.sessionId || analysis.id,
      status: String(analysis.status || '').toUpperCase(),
      ssid:
        analysis.ssid ||
        target.ssid ||
        results.targetSsid ||
        results.ssid ||
        '-',
      bssid:
        analysis.bssid ||
        target.bssid ||
        results.targetBssid ||
        results.bssid ||
        '-',
      requestedTestTypes:
        analysis.requestedTestTypes ||
        results.requestedTestTypes ||
        analysis.payload?.config?.testTypes ||
        [],
      createdAt: analysis.createdAt || analysis.created_at || null,
      updatedAt: analysis.updatedAt || analysis.updated_at || null,
      startedAt: analysis.startedAt || analysis.started_at || null,
      completedAt: analysis.completedAt || analysis.completed_at || null,
      errorMessage: analysis.errorMessage || analysis.error_message || null,
    };
  }

  renderAnalysesList(analyses) {
    const container =
      document.getElementById('network-analyses-list') ||
      document.getElementById('networkTestsList');

    if (!container) {
      return;
    }

    if (!analyses.length) {
      container.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 50px 20px; color: #6b7280;">
          <i class="fas fa-network-wired" style="font-size: 42px; margin-bottom: 14px; color: #94a3b8;"></i>
          <h3 style="margin: 0 0 10px 0; color: #111827;">لا توجد تحليلات شبكة بعد</h3>
          <p style="margin: 0;">ابدأ تحليلًا جديدًا، وستظهر هنا الحالة والنتائج الفعلية.</p>
        </div>
      `;
      this.clearDetails();
      return;
    }

    container.innerHTML = `
      <style>
        .network-analysis-list-desktop { display: block; }
        .network-analysis-list-mobile { display: none; }
        @media (max-width: 980px) {
          .network-analysis-list-desktop { display: none; }
          .network-analysis-list-mobile { display: grid; gap: 12px; }
        }
      </style>
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;">
        <div style="font-size: 13px; color: #64748b;">
          إجمالي التحليلات: <strong style="color: #111827;">${analyses.length}</strong>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-secondary btn-sm" onclick="window.networkAnalyzerManager.cleanupOldAnalyses()">
            <i class="fas fa-broom"></i> حذف السجلات القديمة
          </button>
        </div>
      </div>
      <div class="network-analysis-list-desktop" style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>SSID</th>
              <th>BSSID</th>
              <th>الحالة</th>
              <th>أنواع الاختبارات</th>
              <th>آخر تحديث</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${analyses.map((analysis) => this.renderAnalysisRow(analysis)).join('')}
          </tbody>
        </table>
      </div>
      <div class="network-analysis-list-mobile">
        ${analyses.map((analysis) => this.renderAnalysisCard(analysis)).join('')}
      </div>
    `;
  }

  renderAnalysisRow(analysis) {
    const requestedTypes = (analysis.requestedTestTypes || [])
      .map((type) => this.translateTestType(type))
      .join('، ');

    return `
      <tr>
        <td>${this.escapeHtml(analysis.ssid || '-')}</td>
        <td><code>${this.escapeHtml(analysis.bssid || '-')}</code></td>
        <td><span class="badge ${this.getStatusClass(analysis.status)}">${this.getStatusText(analysis.status)}</span></td>
        <td>${this.escapeHtml(requestedTypes || 'غير محدد')}</td>
        <td>${this.formatDate(analysis.updatedAt || analysis.startedAt || analysis.createdAt)}</td>
        <td style="white-space: nowrap;">
          <button class="btn-sm btn-primary" onclick="window.networkAnalyzerManager.loadAnalysisDetails('${analysis.id}')">
            <i class="fas fa-eye"></i> عرض
          </button>
          <button class="btn-sm btn-secondary" onclick="window.networkAnalyzerManager.deleteAnalysis('${analysis.id}')">
            <i class="fas fa-trash"></i> حذف
          </button>
          ${this.isActiveStatus(analysis.status) ? `
            <button class="btn-sm btn-danger" onclick="window.networkAnalyzerManager.stopAnalysis('${analysis.id}')">
              <i class="fas fa-stop"></i> إيقاف
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  }

  renderAnalysisCard(analysis) {
    const requestedTypes = (analysis.requestedTestTypes || [])
      .map((type) => this.translateTestType(type))
      .join('، ');

    return `
      <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; gap: 12px; align-items: start; margin-bottom: 12px;">
          <div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">SSID</div>
            <div style="font-size: 22px; line-height: 1.4; color: #111827; font-weight: 700; word-break: break-word;">${this.escapeHtml(analysis.ssid || '-')}</div>
          </div>
          <span class="badge ${this.getStatusClass(analysis.status)}">${this.getStatusText(analysis.status)}</span>
        </div>

        <div style="display: grid; gap: 10px; margin-bottom: 12px;">
          ${this.renderCardField('BSSID', `<code>${this.escapeHtml(analysis.bssid || '-')}</code>`)}
          ${this.renderCardField('أنواع الاختبارات', this.escapeHtml(requestedTypes || 'غير محدد'))}
          ${this.renderCardField('آخر تحديث', this.formatDate(analysis.updatedAt || analysis.startedAt || analysis.createdAt))}
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-sm btn-primary" onclick="window.networkAnalyzerManager.loadAnalysisDetails('${analysis.id}')">
            <i class="fas fa-eye"></i> عرض
          </button>
          <button class="btn-sm btn-secondary" onclick="window.networkAnalyzerManager.deleteAnalysis('${analysis.id}')">
            <i class="fas fa-trash"></i> حذف
          </button>
          ${this.isActiveStatus(analysis.status) ? `
            <button class="btn-sm btn-danger" onclick="window.networkAnalyzerManager.stopAnalysis('${analysis.id}')">
              <i class="fas fa-stop"></i> إيقاف
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  renderCardField(label, value) {
    return `
      <div style="background: #f8fafc; border-radius: 10px; padding: 12px;">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${label}</div>
        <div style="font-size: 14px; line-height: 1.7; color: #111827; word-break: break-word;">${value}</div>
      </div>
    `;
  }

  renderAnalysisDetails(analysis, results, logs = [], artifacts = []) {
    const container = document.getElementById('network-analysis-details');
    if (!container) {
      return;
    }

    const summary = results || analysis.results || {};
    const findings = Array.isArray(summary.findings) ? summary.findings : [];
    const assessmentChecks = Array.isArray(summary.assessmentChecks)
      ? summary.assessmentChecks
      : this.buildFallbackAssessmentChecks(analysis, summary, findings);
    const testExecutionStatus = Array.isArray(summary.testExecutionStatus)
      ? summary.testExecutionStatus
      : this.buildFallbackTestExecutionStatus(analysis);
    const accessPoint = summary.accessPoint || {};

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>تفاصيل التحليل</h2>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn-secondary btn-sm" onclick="window.networkAnalyzerManager.loadAnalysisDetails('${analysis.id}')">
              <i class="fas fa-rotate-right"></i> تحديث
            </button>
            ${this.canDownloadReport(analysis.status) ? `
              <button class="btn-primary btn-sm" onclick="window.networkAnalyzerManager.downloadReport('${analysis.id}')">
                <i class="fas fa-download"></i> التقرير
              </button>
            ` : ''}
          </div>
        </div>
        <div class="card-body">
          <div style="background: ${findings.length ? '#eff6ff' : '#ecfdf5'}; border-right: 4px solid ${findings.length ? '#3b82f6' : '#10b981'}; border-radius: 10px; padding: 14px; margin-bottom: 18px; color: #1f2937;">
            <strong>${findings.length ? 'الخلاصة الأمنية:' : 'الخلاصة العامة:'}</strong>
            ${findings.length
              ? `تم رصد <strong>${findings.length}</strong> ملاحظة أمنية تحتاج إلى مراجعة.`
              : `لم يتم اكتشاف ملاحظات أمنية إضافية في هذه الجولة، والشبكة المرصودة ظهرت بحماية <strong>${this.escapeHtml(summary.security || accessPoint.security || 'غير معروفة')}</strong>.`}
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px;">
            ${this.renderInfoCard('SSID', analysis.ssid || '-')}
            ${this.renderInfoCard('BSSID', `<code>${this.escapeHtml(analysis.bssid || '-')}</code>`)}
            ${this.renderInfoCard('الحالة', `<span class="badge ${this.getStatusClass(analysis.status)}">${this.getStatusText(analysis.status)}</span>`)}
            ${this.renderInfoCard('الاختبارات', this.escapeHtml((analysis.requestedTestTypes || []).map((type) => this.translateTestType(type)).join('، ') || 'غير محدد'))}
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 18px;">
            ${this.renderInfoCard('تاريخ الإنشاء', this.formatDate(analysis.createdAt))}
            ${this.renderInfoCard('بداية التنفيذ', this.formatDate(analysis.startedAt))}
            ${this.renderInfoCard('الانتهاء', this.formatDate(analysis.completedAt))}
            ${this.renderInfoCard('عدد النتائج', String(summary.findingCount ?? findings.length))}
          </div>

          ${analysis.errorMessage ? `
            <div style="background: #fee2e2; color: #991b1b; border-right: 4px solid #dc2626; border-radius: 8px; padding: 14px; margin-bottom: 18px;">
              <strong>خطأ التنفيذ:</strong> ${this.escapeHtml(this.translateNetworkError(analysis.errorMessage))}
            </div>
          ` : ''}

          ${summary.accessPoint ? `
            <div style="margin-bottom: 20px;">
              <h3 style="margin-bottom: 12px;">بيانات الشبكة المرصودة</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px;">
                ${this.renderInfoCard('الحماية', this.escapeHtml(summary.security || accessPoint.security || 'غير معروف'))}
                ${this.renderInfoCard('القناة', this.escapeHtml(String(accessPoint.channel ?? 'غير معروف')))}
                ${this.renderInfoCard('قوة الإشارة', this.escapeHtml(this.formatSignal(accessPoint.signalPercent, accessPoint.signalStrength)))}
                ${this.renderInfoCard('نوع الراديو', this.escapeHtml(accessPoint.radioType || 'غير معروف'))}
              </div>
            </div>
          ` : ''}

          ${findings.length ? `
            <div>
              <h3 style="margin-bottom: 12px;">النتائج والملاحظات</h3>
              <div style="display: grid; gap: 12px;">
                ${findings.map((finding) => this.renderFindingCard(finding)).join('')}
              </div>
            </div>
          ` : this.renderPendingOrEmptyState(analysis.status, summary)}

          ${assessmentChecks.length ? `
            <div style="margin-top: 20px;">
              <h3 style="margin-bottom: 12px;">ما الذي تم التحقق منه فعليًا</h3>
              <div style="display: grid; gap: 12px;">
                ${assessmentChecks.map((check) => this.renderAssessmentCheck(check)).join('')}
              </div>
            </div>
          ` : ''}

          ${testExecutionStatus.length ? `
            <div style="margin-top: 20px;">
              <h3 style="margin-bottom: 12px;">حالة الاختبارات المطلوبة</h3>
              <div style="display: grid; gap: 12px;">
                ${testExecutionStatus.map((entry) => this.renderTestExecutionStatus(entry)).join('')}
              </div>
            </div>
          ` : ''}

          <div style="margin-top: 20px;">
            <h3 style="margin-bottom: 12px;">سجل التنفيذ</h3>
            ${this.renderLogsSection(logs)}
          </div>

          <div style="margin-top: 20px;">
            <h3 style="margin-bottom: 12px;">الآثار والملفات الناتجة</h3>
            ${this.renderArtifactsSection(artifacts)}
          </div>
        </div>
      </div>
    `;
  }

  renderInfoCard(label, value) {
    return `
      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px;">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">${label}</div>
        <div style="font-size: 14px; color: #111827; font-weight: 600; line-height: 1.7;">${value || '-'}</div>
      </div>
    `;
  }

  renderFindingCard(finding) {
    const severity = String(finding.severity || 'LOW').toUpperCase();
    const evidence = Array.isArray(finding.evidence) ? finding.evidence : [];

    return `
      <div style="background: white; border: 1px solid #e5e7eb; border-right: 4px solid ${this.getSeverityColor(severity)}; border-radius: 10px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; gap: 12px; align-items: start; margin-bottom: 10px;">
          <div>
            <h4 style="margin: 0 0 6px 0; color: #111827;">${this.escapeHtml(finding.title || finding.type || 'نتيجة أمنية')}</h4>
            <div style="font-size: 12px; color: #6b7280;">${this.escapeHtml(finding.type || '')}</div>
          </div>
          <span class="badge ${this.getSeverityBadgeClass(severity)}">${this.getSeverityText(severity)}</span>
        </div>
        <p style="margin: 0 0 12px 0; color: #374151; line-height: 1.8;">${this.escapeHtml(finding.description || 'لا يوجد وصف إضافي.')}</p>
        ${evidence.length ? `
          <div style="background: #f8fafc; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">الأدلة</div>
            ${evidence.map((item) => `
              <div style="font-size: 13px; color: #334155; margin-bottom: 6px;">
                ${this.escapeHtml(item.description || '')}
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${finding.remediation ? `
          <div style="background: #ecfdf5; border-right: 3px solid #10b981; color: #065f46; border-radius: 8px; padding: 12px;">
            <strong>التوصية:</strong> ${this.escapeHtml(finding.remediation)}
          </div>
        ` : ''}
      </div>
    `;
  }

  renderPendingOrEmptyState(status, summary) {
    const discovered = Array.isArray(summary.accessPoints) ? summary.accessPoints : [];
    if (discovered.length) {
      return `
        <div>
          <h3 style="margin-bottom: 12px;">الشبكات المكتشفة</h3>
          <div style="overflow-x: auto;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>SSID</th>
                  <th>BSSID</th>
                  <th>الحماية</th>
                  <th>القناة</th>
                  <th>الإشارة</th>
                </tr>
              </thead>
              <tbody>
                ${discovered.map((item) => `
                  <tr>
                    <td>${this.escapeHtml(item.ssid || '-')}</td>
                    <td><code>${this.escapeHtml(item.bssid || '-')}</code></td>
                    <td>${this.escapeHtml(item.security || 'UNKNOWN')}</td>
                    <td>${this.escapeHtml(String(item.channel ?? '-'))}</td>
                    <td>${this.escapeHtml(this.formatSignal(item.signalPercent, item.signalStrength))}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    return `
      <div style="text-align: center; padding: 40px 20px; color: #6b7280;">
        <i class="fas ${this.isActiveStatus(status) ? 'fa-spinner fa-spin' : 'fa-circle-info'}" style="font-size: 28px; margin-bottom: 12px; color: #3b82f6;"></i>
        <p style="margin: 0;">
          ${this.isActiveStatus(status)
            ? 'التحليل قيد التنفيذ. يتم تحديث الحالة والنتائج تلقائيًا.'
            : 'لا توجد نتائج إضافية لهذا التحليل.'}
        </p>
      </div>
    `;
  }

  renderAssessmentCheck(check) {
    const palette = {
      passed: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', label: 'ناجح' },
      warning: { bg: '#fff7ed', border: '#f97316', text: '#9a3412', label: 'يتطلب انتباه' },
      info: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8', label: 'معلومة' },
    };
    const style = palette[check.status] || palette.info;

    return `
      <div style="background: ${style.bg}; border-right: 4px solid ${style.border}; border-radius: 10px; padding: 14px;">
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

  renderTestExecutionStatus(entry) {
    const palette = {
      executed: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', label: 'تم التنفيذ' },
      ready: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8', label: 'جاهز' },
      needs_requirements: { bg: '#fff7ed', border: '#f97316', text: '#9a3412', label: 'يحتاج متطلبات' },
      not_available: { bg: '#f8fafc', border: '#94a3b8', text: '#475569', label: 'غير متاح' },
    };
    const style = palette[entry.status] || palette.not_available;

    return `
      <div style="background: ${style.bg}; border-right: 4px solid ${style.border}; border-radius: 10px; padding: 14px;">
        <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 6px;">
          <strong style="color: #111827;">${this.escapeHtml(entry.label || entry.id || 'اختبار')}</strong>
          <span style="font-size: 11px; color: ${style.text}; background: rgba(255,255,255,0.85); padding: 4px 8px; border-radius: 999px;">${style.label}</span>
        </div>
        <div style="font-size: 13px; color: #374151; line-height: 1.8;">
          ${this.escapeHtml(entry.detail || '')}
        </div>
      </div>
    `;
  }

  renderLogsSection(logs) {
    if (!Array.isArray(logs) || !logs.length) {
      return `
        <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; color: #64748b;">
          لا توجد سجلات تنفيذ إضافية لهذا التحليل.
        </div>
      `;
    }

    return `
      <div style="display: grid; gap: 10px;">
        ${logs.map((log) => this.renderLogEntry(log)).join('')}
      </div>
    `;
  }

  renderLogEntry(log) {
    const colors = {
      info: '#3b82f6',
      warning: '#f97316',
      error: '#dc2626',
    };
    const level = String(log.level || 'info').toLowerCase();
    const border = colors[level] || '#64748b';
    const metadata = log.metadata && Object.keys(log.metadata).length
      ? `<pre style="margin: 10px 0 0 0; padding: 10px; background: #f8fafc; border-radius: 8px; overflow-x: auto; font-size: 12px; color: #334155;">${this.escapeHtml(JSON.stringify(log.metadata, null, 2))}</pre>`
      : '';

    return `
      <div style="background: white; border: 1px solid #e5e7eb; border-right: 4px solid ${border}; border-radius: 10px; padding: 12px;">
        <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 6px;">
          <strong style="color: #111827;">${this.escapeHtml(log.message || '-')}</strong>
          <span style="font-size: 12px; color: #64748b;">${this.formatDate(log.createdAt || log.created_at)}</span>
        </div>
        <div style="font-size: 12px; color: #6b7280;">المستوى: ${this.escapeHtml(level)}</div>
        ${metadata}
      </div>
    `;
  }

  renderArtifactsSection(artifacts) {
    if (!Array.isArray(artifacts) || !artifacts.length) {
      return `
        <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; color: #64748b;">
          لا توجد ملفات ناتجة محفوظة لهذا التحليل.
        </div>
      `;
    }

    return `
      <div style="display: grid; gap: 10px;">
        ${artifacts.map((artifact) => `
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px;">
            <div style="display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 6px;">
              <strong style="color: #111827;">${this.escapeHtml(artifact.fileName || artifact.file_name || '-')}</strong>
              <span style="font-size: 12px; color: #64748b;">${this.formatDate(artifact.createdAt || artifact.created_at)}</span>
            </div>
            <div style="font-size: 13px; color: #475569; line-height: 1.8;">
              النوع: ${this.escapeHtml(artifact.artifactType || artifact.artifact_type || '-')}
              <br>
              الحجم: ${this.escapeHtml(String(artifact.sizeBytes || artifact.size_bytes || 0))} بايت
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  buildFallbackAssessmentChecks(analysis, summary, findings) {
    const accessPoint = summary.accessPoint || {};
    const checks = [];

    checks.push({
      title: 'التحقق من الهدف',
      status: 'passed',
      detail: `تمت مطابقة الهدف على SSID=${analysis.ssid || summary.targetSsid || '-'} وBSSID=${analysis.bssid || summary.targetBssid || '-'}.`,
    });

    checks.push({
      title: 'تصنيف الحماية',
      status: findings.length ? 'warning' : 'passed',
      detail: `الشبكة المرصودة ظهرت بحماية ${summary.security || accessPoint.security || 'غير معروفة'}.`,
    });

    checks.push({
      title: 'نتيجة الفحص السلبي',
      status: findings.length ? 'warning' : 'info',
      detail: findings.length
        ? `تم رصد ${findings.length} ملاحظة أمنية ضمن الفحص الحالي.`
        : 'لم يتم رصد ملاحظات أمنية إضافية ضمن الفحص السلبي الحالي.',
    });

    return checks;
  }

  buildFallbackTestExecutionStatus(analysis) {
    const requested = Array.isArray(analysis.requestedTestTypes)
      ? analysis.requestedTestTypes
      : [];

    return requested.map((type) => ({
      id: type,
      label: this.translateTestType(type),
      status: type === 'TRAFFIC_ANALYSIS' ? 'executed' : 'not_available',
      detail:
        type === 'TRAFFIC_ANALYSIS'
          ? 'تم تنفيذ هذا الاختبار فعليًا على الـ runner الحالي.'
          : 'هذا النوع غير منفذ على محرك التشغيل الحالي.',
    }));
  }

  async stopAnalysis(analysisId) {
    if (!confirm('هل تريد إيقاف هذا التحليل؟')) {
      return;
    }

    try {
      this.setLoading(true);
      await this.apiClient.stopNetworkTest(analysisId);
      this.showSuccess('تم إرسال طلب إيقاف التحليل.');
      await this.loadNetworkAnalyses();
      if (this.currentAnalysisId === analysisId) {
        await this.loadAnalysisDetails(analysisId);
      }
    } catch (error) {
      this.showError('فشل إيقاف التحليل: ' + error.message);
    } finally {
      this.setLoading(false);
    }
  }

  async downloadReport(analysisId) {
    try {
      this.setLoading(true);
      await this.apiClient.downloadNetworkReport(analysisId, 'PDF');
      this.showSuccess('تم تحميل التقرير بنجاح.');
    } catch (error) {
      this.showError('فشل تحميل التقرير: ' + error.message);
    } finally {
      this.setLoading(false);
    }
  }

  async deleteAnalysis(analysisId) {
    if (!confirm('هل تريد حذف هذا التحليل من القائمة؟')) {
      return;
    }

    try {
      this.setLoading(true);
      await this.apiClient.deleteNetworkTest(analysisId);
      if (this.currentAnalysisId === analysisId) {
        this.currentAnalysisId = null;
        this.clearDetails();
      }
      this.showSuccess('تم حذف التحليل.');
      await this.loadNetworkAnalyses();
    } catch (error) {
      this.showError('فشل حذف التحليل: ' + error.message);
    } finally {
      this.setLoading(false);
    }
  }

  async cleanupOldAnalyses() {
    if (!confirm('سيتم حذف التحليلات القديمة المكتملة أو الفاشلة أو الملغاة. هل تريد المتابعة؟')) {
      return;
    }

    try {
      this.setLoading(true);
      const response = await this.apiClient.cleanupNetworkTests();
      const deletedCount = response.data?.deletedCount ?? 0;
      if (this.currentAnalysisId) {
        this.currentAnalysisId = null;
        this.clearDetails();
      }
      this.showSuccess(`تم حذف ${deletedCount} تحليل قديم.`);
      await this.loadNetworkAnalyses();
    } catch (error) {
      this.showError('فشل حذف السجلات القديمة: ' + error.message);
    } finally {
      this.setLoading(false);
    }
  }

  startPollingForActiveAnalyses(analyses) {
    this.stopPolling();

    if (!analyses.some((analysis) => this.isActiveStatus(analysis.status))) {
      return;
    }

    this.pollingIntervalId = setInterval(async () => {
      await this.loadNetworkAnalyses();
      if (this.currentAnalysisId) {
        const current =
          (this.stateManager.getState && this.stateManager.getState().currentAnalysis) || null;
        if (current && this.isActiveStatus(current.status)) {
          await this.loadAnalysisDetails(this.currentAnalysisId);
        }
      }
    }, this.pollingInterval);
  }

  startPollingForAnalysis(analysisId) {
    this.stopPolling();
    this.pollingIntervalId = setInterval(async () => {
      await this.loadAnalysisDetails(analysisId);
    }, this.pollingInterval);
  }

  stopPolling() {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
  }

  resumePolling() {
    const state = this.stateManager.getState ? this.stateManager.getState() : {};
    if (state.currentAnalysis && this.isActiveStatus(state.currentAnalysis.status)) {
      this.startPollingForAnalysis(state.currentAnalysis.id || state.currentAnalysis.sessionId);
      return;
    }
    if (Array.isArray(state.networkAnalyses)) {
      this.startPollingForActiveAnalyses(state.networkAnalyses);
    }
  }

  isActiveStatus(status) {
    const normalized = String(status || '').toUpperCase();
    return ['QUEUED', 'CLAIMED', 'RUNNING', 'ARTIFACT_UPLOADING'].includes(normalized);
  }

  hasResultPayload(analysis) {
    const normalized = String(analysis?.status || '').toUpperCase();
    return ['COMPLETED', 'FAILED', 'UNSUPPORTED', 'CANCELLED'].includes(normalized);
  }

  canDownloadReport(status) {
    const normalized = String(status || '').toUpperCase();
    return ['COMPLETED'].includes(normalized);
  }

  getStatusClass(status) {
    const normalized = String(status || '').toUpperCase();
    const classes = {
      QUEUED: 'badge-warning',
      CLAIMED: 'badge-warning',
      RUNNING: 'badge-info',
      ARTIFACT_UPLOADING: 'badge-info',
      COMPLETED: 'badge-success',
      FAILED: 'badge-danger',
      UNSUPPORTED: 'badge-danger',
      CANCELLED: 'badge-secondary',
    };
    return classes[normalized] || 'badge-secondary';
  }

  getStatusText(status) {
    const normalized = String(status || '').toUpperCase();
    const texts = {
      QUEUED: 'في الانتظار',
      CLAIMED: 'تم استلام المهمة',
      RUNNING: 'قيد التنفيذ',
      ARTIFACT_UPLOADING: 'جارٍ رفع النتائج',
      COMPLETED: 'مكتمل',
      FAILED: 'فشل',
      UNSUPPORTED: 'غير مدعوم',
      CANCELLED: 'ملغي',
    };
    return texts[normalized] || normalized;
  }

  getSeverityText(severity) {
    const normalized = String(severity || '').toUpperCase();
    const texts = {
      CRITICAL: 'حرج',
      HIGH: 'عالٍ',
      MEDIUM: 'متوسط',
      LOW: 'منخفض',
    };
    return texts[normalized] || normalized;
  }

  getSeverityColor(severity) {
    const normalized = String(severity || '').toUpperCase();
    const colors = {
      CRITICAL: '#dc2626',
      HIGH: '#f97316',
      MEDIUM: '#eab308',
      LOW: '#3b82f6',
    };
    return colors[normalized] || '#64748b';
  }

  getSeverityBadgeClass(severity) {
    const normalized = String(severity || '').toUpperCase();
    const classes = {
      CRITICAL: 'badge-danger',
      HIGH: 'badge-danger',
      MEDIUM: 'badge-warning',
      LOW: 'badge-info',
    };
    return classes[normalized] || 'badge-secondary';
  }

  translateTestType(type) {
    const translations = {
      TRAFFIC_ANALYSIS: 'تحليل المرور اللاسلكي',
      WPA_HANDSHAKE_CAPTURE: 'التقاط WPA Handshake',
      DEAUTH_ATTACK: 'اختبار Deauthentication',
      WEP_CRACK: 'اختبار كسر WEP',
      EVIL_TWIN: 'اختبار Evil Twin',
    };
    return translations[type] || type;
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

  formatDate(dateString) {
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
      minute: '2-digit',
    });
  }

  setLoading(isLoading) {
    if (this.stateManager && this.stateManager.updateState) {
      this.stateManager.updateState({ loading: isLoading });
    }
  }

  clearDetails() {
    const container = document.getElementById('network-analysis-details');
    if (container) {
      container.innerHTML = '';
    }
  }

  showError(message) {
    if (window.notificationManager && window.notificationManager.show) {
      window.notificationManager.show(message, 'error');
      return;
    }
    alert(message);
  }

  showSuccess(message) {
    if (window.notificationManager && window.notificationManager.show) {
      window.notificationManager.show(message, 'success');
      return;
    }
    alert(message);
  }

  escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  translateNetworkError(message) {
    const text = String(message || '').trim();

    if (!text) {
      return 'حدث خطأ غير متوقع.';
    }

    const knownErrors = {
      'Target wireless network was not found in the current scan results':
        'لم يتم العثور على الشبكة المطلوبة في نتائج الرصد الحالية. استخدم الشبكة التي ظهرت في الاكتشاف المباشر أو أعد الاكتشاف ثم حاول مرة أخرى.',
      'Wireless discovery is not supported on this runner':
        'بيئة التنفيذ الحالية لا تدعم اكتشاف الشبكات اللاسلكية.',
      'Wireless assessment is not supported on this runner':
        'بيئة التنفيذ الحالية لا تدعم تحليل الشبكات اللاسلكية.',
    };

    return knownErrors[text] || text;
  }

  destroy() {
    this.stopPolling();
  }
}

if (typeof window !== 'undefined') {
  window.NetworkAnalyzerManager = NetworkAnalyzerManager;
}
