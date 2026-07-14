(function () {
  const operationLabels = {
    WEB_SCAN: 'فحص الويب',
    IP_SCAN: 'فحص IP',
    PHISHING_CAMPAIGN: 'حملات التصيد',
    NETWORK_ANALYSIS: 'تحليل الشبكات',
    REPORT_GENERATION: 'التقارير',
  };

  const statusLabels = {
    ACTIVE: 'نشط',
    REVOKED: 'ملغي',
    EXPIRED: 'منتهي',
    queued: 'في الانتظار',
    claimed: 'تم استلامه',
    running: 'قيد التشغيل',
    completed: 'مكتمل',
    failed: 'فشل',
    cancelled: 'ملغي',
    unsupported: 'غير مدعوم',
  };

  function getAuthValue(auth, snake, camel, fallback = '') {
    return auth?.[camel] ?? auth?.[snake] ?? fallback;
  }

  function formatDate(value) {
    if (!value) return 'غير محدد';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'غير محدد';
    return date.toLocaleDateString('ar-SA');
  }

  function cleanListValue(value) {
    return String(value || '')
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function isIpScope(value) {
    return /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(value) ||
      /^(\d{1,3}\.){3}\d{1,3}\s*-\s*(\d{1,3}\.){3}\d{1,3}$/.test(value);
  }

  function isMacAddress(value) {
    return /^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i.test(value);
  }

  function buildScope(targetSystem, scopeText, allowedOperations) {
    const entries = cleanListValue(scopeText);
    if (targetSystem && !entries.includes(targetSystem)) {
      entries.unshift(targetSystem);
    }

    const scope = {
      domains: [],
      ipRanges: [],
      networks: [],
      emailDomains: [],
    };

    for (const entry of entries) {
      const normalized = entry.replace(/^https?:\/\//i, '').split('/')[0].trim();
      if (!normalized) continue;

      if (entry.includes('@')) {
        const domain = entry.split('@')[1]?.trim();
        if (domain) scope.emailDomains.push(domain);
        continue;
      }

      if (isIpScope(entry)) {
        scope.ipRanges.push(entry);
        continue;
      }

      if (isMacAddress(entry)) {
        scope.networks.push({ bssid: entry.toLowerCase() });
        continue;
      }

      if (allowedOperations.includes('NETWORK_ANALYSIS')) {
        scope.networks.push({ ssid: entry });
      }

      scope.domains.push(normalized);
    }

    return {
      domains: [...new Set(scope.domains)],
      ipRanges: [...new Set(scope.ipRanges)],
      networks: scope.networks,
      emailDomains: [...new Set(scope.emailDomains)],
    };
  }

  function selectedOperations(value) {
    if (value === 'ALL') {
      return [
        'WEB_SCAN',
        'IP_SCAN',
        'PHISHING_CAMPAIGN',
        'NETWORK_ANALYSIS',
        'REPORT_GENERATION',
      ];
    }
    return [value].filter(Boolean);
  }

  window.translateStatus = function translateStatus(status) {
    return statusLabels[status] || statusLabels[String(status || '').toUpperCase()] || status || 'غير محدد';
  };

  window.translateOperationType = function translateOperationType(type) {
    return operationLabels[type] || type || 'غير محدد';
  };

  window.loadAuthorizationsSection = async function loadAuthorizationsSection() {
    const page = document.getElementById('authorizations-page');
    if (!page) return;

    page.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>التصاريح</h2>
          <button class="btn-primary btn-sm" onclick="showNewAuthorizationModal()">
            <i class="fas fa-plus"></i> تصريح جديد
          </button>
        </div>
        <div class="card-body">
          <div id="authorizationsList">جاري تحميل التصاريح...</div>
        </div>
      </div>
    `;

    try {
      window.showLoading?.();
      const response = await api.getAuthorizations();
      const authorizations = response.success ? response.data?.authorizations || response.data || [] : [];
      window.renderAuthorizationsList(authorizations);
    } catch (error) {
      window.notificationManager?.show('فشل تحميل التصاريح: ' + error.message, 'error');
    } finally {
      window.hideLoading?.();
    }
  };

  window.renderAuthorizationsList = function renderAuthorizationsList(authorizations) {
    const container = document.getElementById('authorizationsList');
    if (!container) return;

    if (!Array.isArray(authorizations) || authorizations.length === 0) {
      container.innerHTML = '<p class="text-center">لا توجد تصاريح حتى الآن. أنشئ تصريحًا جديدًا لاستخدام الأقسام.</p>';
      return;
    }

    container.innerHTML = authorizations.map((auth) => {
      const orgName = getAuthValue(auth, 'organization_name', 'organizationName', 'تصريح بدون اسم');
      const status = getAuthValue(auth, 'status', 'status', 'غير محدد');
      const validUntil = getAuthValue(auth, 'valid_until', 'validUntil', null);
      const operations = getAuthValue(auth, 'allowed_operations', 'allowedOperations', [])
        .map((op) => operationLabels[op] || op)
        .join('، ');

      return `
        <div class="activity-item">
          <div class="activity-icon ${status === 'ACTIVE' ? 'green' : 'red'}">
            <i class="fas fa-key"></i>
          </div>
          <div class="activity-content">
            <p class="activity-title">${orgName}</p>
            <p class="activity-time">الحالة: ${window.translateStatus(status)} | صالح حتى: ${formatDate(validUntil)}</p>
            <p class="activity-time">الأقسام المسموحة: ${operations || 'غير محدد'}</p>
          </div>
          <button class="btn-secondary btn-sm" onclick="viewAuthorization('${auth.id}')">عرض</button>
        </div>
      `;
    }).join('');
  };

  window.showNewAuthorizationModal = function showNewAuthorizationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal authorization-modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 700px;">
        <div class="modal-header">
          <h2><i class="fas fa-key"></i> تصريح جديد</h2>
          <button class="btn-icon" onclick="this.closest('.modal').remove()" aria-label="إغلاق">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <form id="authorization-form" class="operation-form">
            <div class="form-group">
              <label for="auth-org-name"><i class="fas fa-building"></i> اسم الجهة المالكة للتصريح *</label>
              <input type="text" id="auth-org-name" name="organizationName" placeholder="مثال: شركة ABC" required>
              <small class="form-help">اسم الشركة أو الجهة التي منحتك الإذن بالاختبار.</small>
            </div>

            <div class="form-group">
              <label for="auth-target-system"><i class="fas fa-crosshairs"></i> الهدف أو النطاق *</label>
              <input type="text" id="auth-target-system" name="targetSystem" placeholder="example.com أو 192.168.1.0/24 أو اسم الشبكة" required>
              <small class="form-help">اكتب الهدف الأساسي. يمكن إضافة أهداف أخرى في خانة النطاق.</small>
            </div>

            <div class="form-group">
              <label for="auth-operation-type"><i class="fas fa-tasks"></i> القسم المسموح *</label>
              <select id="auth-operation-type" name="operationType" required>
                <option value="">اختر القسم...</option>
                <option value="WEB_SCAN">فحص الويب</option>
                <option value="IP_SCAN">فحص IP</option>
                <option value="PHISHING_CAMPAIGN">حملات التصيد</option>
                <option value="NETWORK_ANALYSIS">تحليل الشبكات</option>
                <option value="REPORT_GENERATION">التقارير</option>
                <option value="ALL">كل الأقسام</option>
              </select>
            </div>

            <div class="form-group">
              <label for="auth-scope"><i class="fas fa-list"></i> النطاق المصرح به</label>
              <textarea id="auth-scope" name="scope" rows="4" placeholder="كل هدف في سطر مستقل&#10;example.com&#10;192.168.1.0/24&#10;faraa net"></textarea>
              <small class="form-help">ضع النطاقات، عناوين IP، CIDR، البريد، أو أسماء الشبكات المسموح اختبارها.</small>
            </div>

            <div class="form-group">
              <label for="auth-start-date"><i class="fas fa-calendar-alt"></i> تاريخ البداية *</label>
              <input type="date" id="auth-start-date" name="startDate" required>
            </div>

            <div class="form-group">
              <label for="auth-end-date"><i class="fas fa-calendar-check"></i> تاريخ النهاية *</label>
              <input type="date" id="auth-end-date" name="endDate" required>
            </div>

            <div class="form-group">
              <label for="auth-reference"><i class="fas fa-file-contract"></i> رقم المرجع</label>
              <input type="text" id="auth-reference" name="referenceNumber" placeholder="AUTH-2026-001">
            </div>

            <div class="form-group">
              <label for="auth-contact"><i class="fas fa-user"></i> الشخص المسؤول</label>
              <input type="text" id="auth-contact" name="contactPerson" placeholder="أحمد محمد - ahmad@example.com">
            </div>

            <div class="form-group">
              <label for="auth-notes"><i class="fas fa-sticky-note"></i> ملاحظات</label>
              <textarea id="auth-notes" name="notes" rows="3" placeholder="أي ملاحظات إضافية عن التصريح..."></textarea>
            </div>

            <div class="form-actions">
              <button type="submit" class="btn-primary"><i class="fas fa-check"></i> إنشاء التصريح</button>
              <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()">إلغاء</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.getElementById('auth-start-date').value = today;
    document.getElementById('auth-end-date').value = nextMonth.toISOString().slice(0, 10);
    document.getElementById('authorization-form').addEventListener('submit', window.handleAuthorizationSubmit);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.remove();
    });
  };

  window.handleAuthorizationSubmit = async function handleAuthorizationSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const allowedOperations = selectedOperations(formData.get('operationType'));
    const targetSystem = String(formData.get('targetSystem') || '').trim();

    if (allowedOperations.length === 0) {
      window.notificationManager?.show('اختر القسم المسموح للتصريح', 'error');
      return;
    }

    const data = {
      organizationName: String(formData.get('organizationName') || '').trim(),
      scope: buildScope(targetSystem, formData.get('scope'), allowedOperations),
      validFrom: formData.get('startDate'),
      validUntil: formData.get('endDate'),
      signedBy: String(formData.get('contactPerson') || formData.get('organizationName') || '').trim(),
      digitalSignature: String(formData.get('referenceNumber') || '').trim() || `MANUAL-${Date.now()}`,
      allowedOperations,
    };

    try {
      window.showLoading?.();
      const response = await api.createAuthorization(data);
      if (!response.success) {
        throw new Error(response.error?.message || 'فشل إنشاء التصريح');
      }
      document.querySelector('.authorization-modal')?.remove();
      window.notificationManager?.show('تم إنشاء التصريح بنجاح', 'success');
      await window.loadAuthorizationsSection();
    } catch (error) {
      window.notificationManager?.show('فشل إنشاء التصريح: ' + error.message, 'error');
    } finally {
      window.hideLoading?.();
    }
  };

  window.viewAuthorization = function viewAuthorization(id) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h2><i class="fas fa-key"></i> تفاصيل التصريح</h2>
          <button class="btn-icon" onclick="this.closest('.modal').remove()" aria-label="إغلاق">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body" id="authorization-details-content">
          <div class="text-center">جاري تحميل التفاصيل...</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    window.loadAuthorizationDetails(id);
  };

  window.loadAuthorizationDetails = async function loadAuthorizationDetails(id) {
    const content = document.getElementById('authorization-details-content');
    try {
      const response = await api.getAuthorization(id);
      if (!response.success) throw new Error('فشل تحميل تفاصيل التصريح');
      const auth = response.data?.authorization || response.data;
      const scope = auth.scope || {};
      const operations = getAuthValue(auth, 'allowed_operations', 'allowedOperations', []);

      content.innerHTML = `
        <div class="info-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-bottom:20px;">
          <div class="info-item"><label>الجهة</label><p><strong>${getAuthValue(auth, 'organization_name', 'organizationName', 'غير محدد')}</strong></p></div>
          <div class="info-item"><label>الحالة</label><p>${window.translateStatus(auth.status)}</p></div>
          <div class="info-item"><label>تاريخ البداية</label><p>${formatDate(getAuthValue(auth, 'valid_from', 'validFrom'))}</p></div>
          <div class="info-item"><label>تاريخ النهاية</label><p>${formatDate(getAuthValue(auth, 'valid_until', 'validUntil'))}</p></div>
          <div class="info-item"><label>الأقسام المسموحة</label><p>${operations.map((op) => operationLabels[op] || op).join('، ') || 'غير محدد'}</p></div>
          <div class="info-item"><label>الموقّع/المسؤول</label><p>${getAuthValue(auth, 'signed_by', 'signedBy', 'غير محدد')}</p></div>
        </div>
        <div style="background:#f9fafb;padding:15px;border-radius:8px;">
          <h3 style="margin-bottom:10px;">النطاق المصرح به</h3>
          ${scope.domains?.length ? `<p><strong>النطاقات:</strong> ${scope.domains.join('، ')}</p>` : ''}
          ${scope.ipRanges?.length ? `<p><strong>عناوين IP:</strong> ${scope.ipRanges.join('، ')}</p>` : ''}
          ${scope.emailDomains?.length ? `<p><strong>نطاقات البريد:</strong> ${scope.emailDomains.join('، ')}</p>` : ''}
          ${scope.networks?.length ? `<p><strong>الشبكات:</strong> ${scope.networks.map((n) => n.ssid || n.bssid).filter(Boolean).join('، ')}</p>` : ''}
          ${!scope.domains?.length && !scope.ipRanges?.length && !scope.emailDomains?.length && !scope.networks?.length ? '<p>لا يوجد نطاق محدد.</p>' : ''}
        </div>
      `;
    } catch (error) {
      if (content) content.innerHTML = `<div class="text-center">فشل تحميل التفاصيل: ${error.message}</div>`;
    }
  };

  function replaceBrokenText(root = document) {
    const replacements = new Map([
      ['ظ…ظ†طµط© ط§ظ„ط§ط®طھط±ط§ظ‚', 'منصة الاختراق'],
      ['ظ„ظˆط­ط© ط§ظ„طھط­ظƒظ…', 'لوحة التحكم'],
      ['ظپط­طµ ط§ظ„ظˆظٹط¨', 'فحص الويب'],
      ['ط­ظ…ظ„ط§طھ ط§ظ„طھطµظٹط¯', 'حملات التصيد'],
      ['ظپط­طµ IP', 'فحص IP'],
      ['طھط­ظ„ظٹظ„ ط§ظ„ط´ط¨ظƒط§طھ', 'تحليل الشبكات'],
      ['ط§ظ„طھظ‚ط§ط±ظٹط±', 'التقارير'],
      ['ط§ظ„طھطµط§ط±ظٹط­', 'التصاريح'],
      ['ط§ظ„ط³ط¬ظ„ط§طھ', 'السجلات'],
      ['طھط³ط¬ظٹظ„ ط§ظ„ط®ط±ظˆط¬', 'تسجيل الخروج'],
      ['ط§ظ„ظ…ط³طھط®ط¯ظ…', 'المستخدم'],
      ['ط¨ط¯ط، ط¹ظ…ظ„ظٹط© ط¬ط¯ظٹط¯ط©', 'بدء عملية جديدة'],
      ['ط¹ظ…ظ„ظٹط§طھ ط§ظ„ظپط­طµ', 'عمليات الفحص'],
      ['ط§ظ„ط«ط؛ط±ط§طھ ط§ظ„ظ…ظƒطھط´ظپط©', 'الثغرات المكتشفة'],
      ['ط§ط®طھط¨ط§ط±ط§طھ ط§ظ„ط´ط¨ظƒط©', 'اختبارات الشبكة'],
      ['طھظˆط²ظٹط¹ ط§ظ„ط«ط؛ط±ط§طھ ط­ط³ط¨ ط§ظ„ظ†ظˆط¹', 'توزيع الثغرات حسب النوع'],
      ['ط§ظ„ظ†ط´ط§ط· ط§ظ„ط£ط®ظٹط±', 'النشاط الأخير'],
      ['ط¹ط±ط¶ ط§ظ„ظƒظ„', 'عرض الكل'],
      ['ظپط­طµ ط¬ط¯ظٹط¯', 'فحص جديد'],
      ['ط­ظ…ظ„ط© طھطµظٹط¯', 'حملة تصيد'],
      ['ط§ط®طھط¨ط§ط± ط´ط¨ظƒط©', 'اختبار شبكة'],
      ['طھظ‚ط±ظٹط± ط¬ط¯ظٹط¯', 'تقرير جديد'],
    ]);

    const walker = document.createTreeWalker(root.body || root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let text = node.nodeValue;
      for (const [bad, good] of replacements) {
        text = text.split(bad).join(good);
      }
      node.nodeValue = text;
    }
    document.title = 'منصة اختبار الاختراق والأمن الهجومي';
  }

  document.addEventListener('DOMContentLoaded', () => {
    replaceBrokenText();
    setTimeout(replaceBrokenText, 300);
  });
})();
