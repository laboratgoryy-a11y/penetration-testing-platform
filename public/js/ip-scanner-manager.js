/**
 * IP Scanner Manager
 * إدارة واجهة فحص IP باستخدام Nmap
 */

class IPScannerManager {
    constructor() {
        this.currentScanId = null;
        this.scanTypes = {
            QUICK_SCAN: 'فحص سريع',
            COMPREHENSIVE_SCAN: 'فحص شامل',
            PORT_SCAN: 'فحص المنافذ',
            SERVICE_SCAN: 'كشف الخدمات',
            OS_DETECTION: 'كشف نظام التشغيل',
            VULNERABILITY_SCAN: 'فحص الثغرات',
            STEALTH_SCAN: 'فحص خفي'
        };
        this.timingTemplates = {
            T0: 'بطيء جداً (T0)',
            T1: 'بطيء (T1)',
            T2: 'عادي (T2)',
            T3: 'سريع (T3)',
            T4: 'سريع جداً (T4)',
            T5: 'أقصى سرعة (T5)'
        };
    }

    /**
     * تهيئة مدير فحص IP
     */
    initialize() {
        window.appLogger?.debug('Initializing IP Scanner Manager...');
        this.setupEventListeners();
        this.loadRecentScans();
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        window.appLogger?.debug('Setting up event listeners...');
        
        // نموذج بدء فحص جديد
        const startScanBtn = document.getElementById('start-ip-scan-btn');
        window.appLogger?.debug('Start scan button:', startScanBtn);
        
        if (startScanBtn) {
            window.appLogger?.debug('Adding click listener to start scan button');
            startScanBtn.addEventListener('click', () => {
                window.appLogger?.debug('Start scan button clicked!');
                this.showNewScanForm();
            });
        } else {
            console.error('Start scan button not found!');
        }

        // زر مقارنة الفحوصات
        const compareBtn = document.getElementById('compare-scans-btn');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => {
                window.appLogger?.debug('Compare scans button clicked!');
                if (window.ipScanComparisonManager) {
                    window.ipScanComparisonManager.showComparisonModal();
                }
            });
        }

        // نموذج الفحص
        const scanForm = document.getElementById('ip-scan-form');
        if (scanForm) {
            scanForm.addEventListener('submit', (e) => this.handleScanSubmit(e));
        }

        // تغيير نوع الفحص
        const scanTypeSelect = document.getElementById('scan-type');
        if (scanTypeSelect) {
            scanTypeSelect.addEventListener('change', (e) => this.handleScanTypeChange(e));
        }

        // زر الخيارات المتقدمة
        const advancedToggle = document.getElementById('toggle-advanced-options');
        if (advancedToggle) {
            advancedToggle.addEventListener('click', () => this.toggleAdvancedOptions());
        }
    }

    /**
     * عرض نموذج فحص جديد
     */
    showNewScanForm() {
        window.appLogger?.debug('🔍 showNewScanForm called');
        window.appLogger?.debug('📊 scanTypes:', this.scanTypes);
        window.appLogger?.debug('📊 scanTypes keys:', Object.keys(this.scanTypes));
        window.appLogger?.debug('📊 scanTypes entries:', Object.entries(this.scanTypes));
        
        // إنشاء HTML للخيارات
        const scanTypeOptions = Object.entries(this.scanTypes).map(([key, value]) => {
            window.appLogger?.debug(`  Creating option: ${key} = ${value}`);
            return `<option value="${key}">${value}</option>`;
        }).join('');
        
        window.appLogger?.debug('📊 scanTypeOptions HTML:', scanTypeOptions);
        
        const formHtml = `
            <div class="modal-overlay" id="scan-modal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h2><i class="fas fa-network-wired"></i> فحص IP جديد</h2>
                        <button class="btn-close" onclick="window.ipScannerManager.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="ip-scan-form" action="" onsubmit="return false;">
                            <!-- معلومات الهدف -->
                            <div class="form-section">
                                <h3><i class="fas fa-bullseye"></i> معلومات الهدف</h3>
                                
                                <div class="form-group">
                                    <label for="target-type">نوع الهدف *</label>
                                    <select id="target-type" name="targetType" required>
                                        <option value="SINGLE_IP">عنوان IP واحد</option>
                                        <option value="IP_RANGE">نطاق IP</option>
                                        <option value="CIDR">CIDR</option>
                                        <option value="HOSTNAME">اسم المضيف</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label for="target-value">الهدف *</label>
                                    <input type="text" id="target-value" name="targetValue" 
                                           placeholder="مثال: 192.168.1.100" required>
                                    <small class="form-help">أدخل عنوان IP أو نطاق أو اسم المضيف</small>
                                </div>

                                <div class="form-group">
                                    <label for="authorization-id">التصريح *</label>
                                    <select id="authorization-id" name="authorizationId" required>
                                        <option value="">جاري التحميل...</option>
                                    </select>
                                    <small class="form-help">يجب أن يكون لديك تصريح صالح للهدف</small>
                                </div>
                            </div>

                            <!-- إعدادات الفحص -->
                            <div class="form-section">
                                <h3><i class="fas fa-cog"></i> إعدادات الفحص</h3>
                                
                                <div class="form-group">
                                    <label for="scan-type">نوع الفحص *</label>
                                    <select id="scan-type" name="scanType" required>
                                        ${scanTypeOptions}
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label for="timing">سرعة الفحص</label>
                                    <select id="timing" name="timing">
                                        ${Object.entries(this.timingTemplates).map(([key, value]) => 
                                            `<option value="${key}" ${key === 'T4' ? 'selected' : ''}>${value}</option>`
                                        ).join('')}
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="service-detection" name="serviceDetection" checked>
                                        <span>كشف الخدمات</span>
                                    </label>
                                </div>

                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="os-detection" name="osDetection">
                                        <span>كشف نظام التشغيل</span>
                                    </label>
                                </div>

                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="vulnerability-scan" name="vulnerabilityScan">
                                        <span>فحص الثغرات</span>
                                    </label>
                                </div>
                            </div>

                            <!-- خيارات متقدمة -->
                            <div class="form-section">
                                <button type="button" class="btn-link" id="toggle-advanced-options">
                                    <i class="fas fa-chevron-down"></i> خيارات متقدمة
                                </button>
                                
                                <div id="advanced-options" style="display: none; margin-top: 15px;">
                                    <div class="form-group">
                                        <label for="port-range-type">نطاق المنافذ</label>
                                        <select id="port-range-type" name="portRangeType">
                                            <option value="TOP_100">أشهر 100 منفذ</option>
                                            <option value="TOP_1000">أشهر 1000 منفذ</option>
                                            <option value="ALL">جميع المنافذ (1-65535)</option>
                                            <option value="CUSTOM">مخصص</option>
                                        </select>
                                    </div>

                                    <div class="form-group" id="custom-ports-group" style="display: none;">
                                        <label for="custom-ports">المنافذ المخصصة</label>
                                        <input type="text" id="custom-ports" name="customPorts" 
                                               placeholder="مثال: 80,443,8080 أو 1-1000">
                                    </div>

                                    <div class="form-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="stealth-mode" name="stealthMode">
                                            <span>الوضع الخفي</span>
                                        </label>
                                    </div>

                                    <div class="form-group">
                                        <label for="nse-scripts">NSE Scripts (اختياري)</label>
                                        <input type="text" id="nse-scripts" name="nseScripts" 
                                               placeholder="مثال: vuln,exploit">
                                        <small class="form-help">أدخل أسماء السكريبتات مفصولة بفواصل</small>
                                    </div>
                                </div>
                            </div>

                            <!-- أزرار الإجراءات -->
                            <div class="form-actions">
                                <button type="button" class="btn-secondary" onclick="window.ipScannerManager.closeModal()">
                                    إلغاء
                                </button>
                                <button type="submit" class="btn-primary">
                                    <i class="fas fa-play"></i> بدء الفحص
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', formHtml);
        
        // التحقق من القائمة المنسدلة وملئها يدوياً إذا لزم الأمر
        setTimeout(() => {
            const scanTypeSelect = document.getElementById('scan-type');
            window.appLogger?.debug('📊 Checking scan-type select after creation:');
            window.appLogger?.debug('  Element:', scanTypeSelect);
            window.appLogger?.debug('  Options count:', scanTypeSelect ? scanTypeSelect.options.length : 'N/A');
            
            if (scanTypeSelect) {
                if (scanTypeSelect.options.length > 0) {
                    window.appLogger?.debug('  ✅ Options loaded successfully');
                    for (let i = 0; i < scanTypeSelect.options.length; i++) {
                        window.appLogger?.debug(`    ${i + 1}. ${scanTypeSelect.options[i].value} - ${scanTypeSelect.options[i].text}`);
                    }
                } else {
                    console.warn('  ⚠️ No options found, manually populating...');
                    this.populateScanTypeSelect(scanTypeSelect);
                }
            } else {
                console.error('  ❌ Select element not found!');
            }
            
            // التحقق من قائمة التوقيت أيضاً
            const timingSelect = document.getElementById('timing');
            if (timingSelect && timingSelect.options.length === 0) {
                console.warn('  ⚠️ Timing select empty, manually populating...');
                this.populateTimingSelect(timingSelect);
            }
        }, 100);
        
        this.loadAuthorizations();
        this.setupFormEventListeners();
    }

    /**
     * ملء قائمة نوع الفحص يدوياً
     */
    populateScanTypeSelect(selectElement) {
        window.appLogger?.debug('🔧 Manually populating scan type select');
        selectElement.innerHTML = ''; // مسح أي محتوى موجود
        
        Object.entries(this.scanTypes).forEach(([key, value]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = value;
            selectElement.appendChild(option);
            window.appLogger?.debug(`  ✅ Added: ${key} - ${value}`);
        });
        
        window.appLogger?.debug(`  ✅ Total options added: ${selectElement.options.length}`);
    }

    /**
     * ملء قائمة التوقيت يدوياً
     */
    populateTimingSelect(selectElement) {
        window.appLogger?.debug('🔧 Manually populating timing select');
        selectElement.innerHTML = '';
        
        Object.entries(this.timingTemplates).forEach(([key, value]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = value;
            if (key === 'T4') {
                option.selected = true;
            }
            selectElement.appendChild(option);
            window.appLogger?.debug(`  ✅ Added: ${key} - ${value}`);
        });
        
        window.appLogger?.debug(`  ✅ Total options added: ${selectElement.options.length}`);
    }

    /**
     * إعداد مستمعي أحداث النموذج
     */
    setupFormEventListeners() {
        // معالجة إرسال النموذج
        const scanForm = document.getElementById('ip-scan-form');
        if (scanForm) {
            window.appLogger?.debug('Adding submit listener to form');
            scanForm.addEventListener('submit', (e) => {
                window.appLogger?.debug('Form submit event triggered!');
                this.handleScanSubmit(e);
            });
        } else {
            console.error('Form not found in setupFormEventListeners!');
        }

        // تغيير نوع نطاق المنافذ
        const portRangeType = document.getElementById('port-range-type');
        if (portRangeType) {
            portRangeType.addEventListener('change', (e) => {
                const customPortsGroup = document.getElementById('custom-ports-group');
                if (customPortsGroup) {
                    customPortsGroup.style.display = e.target.value === 'CUSTOM' ? 'block' : 'none';
                }
            });
        }

        // زر الخيارات المتقدمة
        const advancedToggle = document.getElementById('toggle-advanced-options');
        if (advancedToggle) {
            advancedToggle.addEventListener('click', () => this.toggleAdvancedOptions());
        }

        // تغيير نوع الهدف
        const targetType = document.getElementById('target-type');
        if (targetType) {
            targetType.addEventListener('change', (e) => this.updateTargetPlaceholder(e.target.value));
        }
    }

    /**
     * تبديل الخيارات المتقدمة
     */
    toggleAdvancedOptions() {
        const advancedOptions = document.getElementById('advanced-options');
        const toggleBtn = document.getElementById('toggle-advanced-options');
        
        if (advancedOptions && toggleBtn) {
            const isVisible = advancedOptions.style.display !== 'none';
            advancedOptions.style.display = isVisible ? 'none' : 'block';
            
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            }
        }
    }

    /**
     * تحديث placeholder حسب نوع الهدف
     */
    updateTargetPlaceholder(type) {
        const targetValue = document.getElementById('target-value');
        if (!targetValue) return;

        const placeholders = {
            SINGLE_IP: '192.168.1.100',
            IP_RANGE: '192.168.1.1-192.168.1.254',
            CIDR: '192.168.1.0/24',
            HOSTNAME: 'example.com'
        };

        targetValue.placeholder = `مثال: ${placeholders[type] || ''}`;
    }

    /**
     * تحميل التصاريح المتاحة
     */
    async loadAuthorizations() {
        try {
            const response = await api.get('/authorizations');
            const authSelect = document.getElementById('authorization-id');
            
            if (!authSelect) return;

            if (response.success && response.data.authorizations) {
                const allAuths = response.data.authorizations;
                
                // تصفية التصاريح النشطة وغير المنتهية والمناسبة لفحص IP
                const validAuths = allAuths.filter(auth => {
                    const isActive = auth.status === 'ACTIVE';
                    const notExpired = new Date(auth.valid_until || auth.validUntil) > new Date();
                    // التحقق من أن التصريح يسمح بفحص IP أو جميع العمليات
                    const allowedOperations = auth.allowedOperations || auth.allowed_operations || [];
                    const correctType = allowedOperations.includes('IP_SCAN') || 
                        allowedOperations.includes('ALL');
                    
                    return isActive && notExpired && correctType;
                });

                authSelect.innerHTML = validAuths.length > 0
                    ? '<option value="">اختر تصريحاً...</option>' + validAuths.map(auth => 
                        `<option value="${auth.id}">${auth.organization_name || auth.organizationName || 'تصريح ' + auth.id} - صالح حتى ${new Date(auth.valid_until || auth.validUntil).toLocaleDateString('ar-SA')}</option>`
                    ).join('')
                    : '<option value="">لا توجد تصاريح صالحة لفحص IP</option>';
            } else {
                authSelect.innerHTML = '<option value="">فشل تحميل التصاريح</option>';
            }
        } catch (error) {
            console.error('Error loading authorizations:', error);
            const authSelect = document.getElementById('authorization-id');
            if (authSelect) {
                authSelect.innerHTML = '<option value="">خطأ في التحميل</option>';
            }
        }
    }

    /**
     * معالجة إرسال نموذج الفحص
     */
    async handleScanSubmit(e) {
        e.preventDefault();
        
        window.appLogger?.debug('handleScanSubmit called');

        const formData = new FormData(e.target);
        const data = {
            target: {
                type: formData.get('targetType'),
                value: formData.get('targetValue'),
                authorizationId: formData.get('authorizationId')
            },
            config: {
                scanType: formData.get('scanType'),
                timing: formData.get('timing') || 'T4',
                serviceDetection: formData.get('serviceDetection') === 'on',
                osDetection: formData.get('osDetection') === 'on',
                vulnerabilityScan: formData.get('vulnerabilityScan') === 'on',
                stealthMode: formData.get('stealthMode') === 'on'
            }
        };
        
        window.appLogger?.debug('Scan data:', data);

        // إضافة نطاق المنافذ
        const portRangeType = formData.get('portRangeType');
        if (portRangeType) {
            data.config.portRange = { type: portRangeType };
            if (portRangeType === 'CUSTOM') {
                data.config.portRange.customPorts = formData.get('customPorts');
            }
        }

        // إضافة NSE scripts
        const nseScripts = formData.get('nseScripts');
        if (nseScripts) {
            data.config.nseScripts = nseScripts.split(',').map(s => s.trim());
        }

        try {
            window.appLogger?.debug('Calling API...');
            window.showLoading();
            window.notificationManager.show('جاري بدء الفحص...', 'info');
            
            const response = await api.createIpScan(data);
            
            window.appLogger?.debug('API response:', response);
            
            if (response.success) {
                window.notificationManager.show('تم بدء الفحص بنجاح', 'success');
                this.closeModal();
                this.currentScanId = response.data.jobId || response.data.id;
                this.showScanProgress(this.currentScanId);
                this.loadRecentScans();
            } else {
                window.notificationManager.show(response.error || 'فشل بدء الفحص', 'error');
            }
        } catch (error) {
            console.error('Error starting scan:', error);
            window.notificationManager.show('حدث خطأ أثناء بدء الفحص: ' + error.message, 'error');
        } finally {
            window.hideLoading();
        }
    }

    /**
     * عرض تقدم الفحص
     */
    showScanProgress(scanId) {
        window.appLogger?.debug('Showing scan progress for:', scanId);
        
        // إنشاء نافذة منبثقة للتقدم
        const progressModal = `
            <div class="modal-overlay" id="scan-progress-modal">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h2><i class="fas fa-spinner fa-spin"></i> جاري الفحص...</h2>
                        <button class="btn-close" onclick="window.ipScannerManager.closeScanProgress()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- معلومات الفحص -->
                        <div class="scan-info-card">
                            <div class="info-row">
                                <span class="label">معرف الفحص:</span>
                                <span class="value" id="scan-id-display">${scanId}</span>
                            </div>
                            <div class="info-row">
                                <span class="label">الحالة:</span>
                                <span class="value" id="scan-status-display">
                                    <span class="status-badge status-running">جاري التنفيذ</span>
                                </span>
                            </div>
                            <div class="info-row">
                                <span class="label">وقت البدء:</span>
                                <span class="value" id="scan-start-time">${new Date().toLocaleString('ar-SA')}</span>
                            </div>
                        </div>

                        <!-- شريط التقدم -->
                        <div class="progress-section">
                            <div class="progress-bar-container">
                                <div class="progress-bar" id="scan-progress-bar" style="width: 0%">
                                    <span class="progress-text" id="scan-progress-text">0%</span>
                                </div>
                            </div>
                            <p class="progress-message" id="scan-progress-message">جاري تهيئة الفحص...</p>
                        </div>

                        <!-- نتائج الفحص (مخفية في البداية) -->
                        <div id="scan-results-section" style="display: none;">
                            <h3><i class="fas fa-check-circle"></i> نتائج الفحص</h3>
                            <div id="scan-results-content"></div>
                        </div>

                        <!-- سجل الفحص -->
                        <div class="scan-log">
                            <h4><i class="fas fa-list"></i> سجل الفحص</h4>
                            <div class="log-container" id="scan-log-container">
                                <div class="log-entry">
                                    <span class="log-time">${new Date().toLocaleTimeString('ar-SA')}</span>
                                    <span class="log-message">تم بدء الفحص...</span>
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
        
        // بدء مراقبة التقدم
        this.monitorScanProgress(scanId);
    }

    /**
     * مراقبة تقدم الفحص
     */
    async monitorScanProgress(scanId) {
        this.currentScanId = scanId;
        let checkCount = 0;
        const maxChecks = 120; // 2 دقيقة (120 * 1 ثانية)

        const checkProgress = async () => {
            try {
                checkCount++;
                
                // التحقق من حالة الفحص من الخادم
                const response = await api.getIpScanStatus(scanId);
                
                if (response.success && response.data) {
                    const status = String(response.data.status || '').toUpperCase();
                    
                    if (typeof response.data.progress === 'number') {
                        this.updateProgressBar(response.data.progress);
                        this.addLogEntry(`جاري الفحص... ${Math.round(response.data.progress)}%`);
                    } else {
                        this.addLogEntry(`الحالة الحالية: ${status || 'UNKNOWN'}`);
                    }

                    if (status === 'COMPLETED') {
                        // الفحص اكتمل
                        this.updateProgressBar(100);
                        this.addLogEntry('✅ اكتمل الفحص بنجاح!', 'success');
                        await this.displayScanResults(scanId);
                        return;
                    } else if (status === 'FAILED') {
                        // الفحص فشل
                        this.addLogEntry('❌ فشل الفحص: ' + (response.data.message || 'خطأ غير معروف'), 'error');
                        this.updateScanStatus('فشل', 'failed');
                        return;
                    }
                }

                // الاستمرار في المراقبة
                if (checkCount < maxChecks) {
                    setTimeout(checkProgress, 1000);
                } else {
                    this.addLogEntry('⏱️ انتهت مهلة الفحص', 'warning');
                    this.updateScanStatus('انتهت المهلة', 'timeout');
                }
            } catch (error) {
                console.error('Error checking scan progress:', error);
                this.addLogEntry('❌ خطأ في التحقق من التقدم', 'error');
            }
        };

        checkProgress();
    }

    /**
     * تحديث شريط التقدم
     */
    updateProgressBar(progress) {
        const progressBar = document.getElementById('scan-progress-bar');
        const progressText = document.getElementById('scan-progress-text');
        const progressMessage = document.getElementById('scan-progress-message');

        if (progressBar) {
            progressBar.style.width = progress + '%';
        }
        if (progressText) {
            progressText.textContent = Math.round(progress) + '%';
        }
        if (progressMessage) {
            if (progress < 30) {
                progressMessage.textContent = 'جاري فحص المنافذ...';
            } else if (progress < 60) {
                progressMessage.textContent = 'جاري كشف الخدمات...';
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
    addLogEntry(message, type = 'info') {
        const logContainer = document.getElementById('scan-log-container');
        if (!logContainer) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        logEntry.innerHTML = `
            <span class="log-time">${new Date().toLocaleTimeString('ar-SA')}</span>
            <span class="log-message">${message}</span>
        `;

        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;
    }

    /**
     * تحديث حالة الفحص
     */
    updateScanStatus(statusText, statusClass) {
        const statusDisplay = document.getElementById('scan-status-display');
        if (statusDisplay) {
            statusDisplay.innerHTML = `<span class="status-badge status-${statusClass}">${statusText}</span>`;
        }

        const modalHeader = document.querySelector('#scan-progress-modal .modal-header h2');
        if (modalHeader) {
            if (statusClass === 'completed') {
                modalHeader.innerHTML = '<i class="fas fa-check-circle"></i> اكتمل الفحص';
            } else if (statusClass === 'failed') {
                modalHeader.innerHTML = '<i class="fas fa-times-circle"></i> فشل الفحص';
            }
        }

        // إخفاء زر الإيقاف
        const stopBtn = document.getElementById('stop-scan-btn');
        if (stopBtn && (statusClass === 'completed' || statusClass === 'failed')) {
            stopBtn.style.display = 'none';
        }
    }

    /**
     * عرض نتائج الفحص
     */
    async displayScanResults(scanId) {
        try {
            const response = await api.getIpScanResults(scanId);
            
            if (response.success && response.data) {
                const results = response.data.results || response.data;
                const resultsSection = document.getElementById('scan-results-section');
                const resultsContent = document.getElementById('scan-results-content');

                if (resultsSection && resultsContent) {
                    resultsSection.style.display = 'block';

                    const hosts = results.hosts || [];
                    const ports = results.ports || [];
                    const services = results.services || [];

                    resultsContent.innerHTML = `
                        <div class="results-grid">
                            <div class="result-card">
                                <div class="result-icon">
                                    <i class="fas fa-server"></i>
                                </div>
                                <div class="result-info">
                                    <h4>${hosts.length}</h4>
                                    <p>أجهزة مكتشفة</p>
                                </div>
                            </div>

                            <div class="result-card">
                                <div class="result-icon">
                                    <i class="fas fa-door-open"></i>
                                </div>
                                <div class="result-info">
                                    <h4>${ports.length}</h4>
                                    <p>منافذ مفتوحة</p>
                                </div>
                            </div>

                            <div class="result-card">
                                <div class="result-icon">
                                    <i class="fas fa-cogs"></i>
                                </div>
                                <div class="result-info">
                                    <h4>${services.length}</h4>
                                    <p>خدمات مكتشفة</p>
                                </div>
                            </div>
                        </div>

                        ${hosts.length > 0 ? `
                            <div class="results-details">
                                <h4><i class="fas fa-list"></i> تفاصيل الأجهزة</h4>
                                <div class="table-container">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>عنوان IP</th>
                                                <th>الحالة</th>
                                                <th>المنافذ المفتوحة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${hosts.map(host => `
                                                <tr>
                                                    <td>${host.ip || host.address || 'غير معروف'}</td>
                                                    <td><span class="badge badge-success">${host.state || 'up'}</span></td>
                                                    <td>${host.open_ports || 0}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ` : '<p class="empty-state">لم يتم اكتشاف أي أجهزة</p>'}
                    `;

                    this.updateScanStatus('مكتمل', 'completed');
                }
            }
        } catch (error) {
            console.error('Error displaying scan results:', error);
            this.addLogEntry('❌ خطأ في عرض النتائج', 'error');
        }
    }

    /**
     * إيقاف الفحص الحالي
     */
    async stopCurrentScan() {
        if (!this.currentScanId) return;

        if (!confirm('هل أنت متأكد من إيقاف هذا الفحص؟')) {
            return;
        }

        try {
            const response = await api.stopIpScan(this.currentScanId);
            
            if (response.success) {
                this.addLogEntry('⏹️ تم إيقاف الفحص', 'warning');
                this.updateScanStatus('متوقف', 'stopped');
                window.notificationManager.show('تم إيقاف الفحص', 'info');
            }
        } catch (error) {
            console.error('Error stopping scan:', error);
            window.notificationManager.show('فشل إيقاف الفحص', 'error');
        }
    }

    /**
     * إغلاق نافذة التقدم
     */
    closeScanProgress() {
        const modal = document.getElementById('scan-progress-modal');
        if (modal) {
            modal.remove();
        }
        this.currentScanId = null;
        this.loadRecentScans();
    }

    /**
     * تحميل الفحوصات الأخيرة
     */
    async loadRecentScans() {
        try {
            const response = await api.getIpScans();
            
            if (response.success && response.data.scans) {
                this.displayRecentScans(response.data.scans);
            }
        } catch (error) {
            console.error('Error loading recent scans:', error);
        }
    }

    /**
     * عرض الفحوصات الأخيرة
     */
    displayRecentScans(scans) {
        const container = document.getElementById('recent-scans-list');
        if (!container) return;

        if (scans.length === 0) {
            container.innerHTML = '<p class="empty-state">لا توجد فحوصات سابقة</p>';
            return;
        }

        container.innerHTML = scans.map(scan => `
            <div class="scan-card" data-scan-id="${scan.id}">
                <div class="scan-header">
                    <div class="scan-info">
                        <h4>${scan.target_value}</h4>
                        <span class="scan-type">${this.scanTypes[scan.scan_type] || scan.scan_type}</span>
                    </div>
                    <span class="status-badge status-${scan.status.toLowerCase()}">${this.getStatusText(scan.status)}</span>
                </div>
                <div class="scan-meta">
                    <span><i class="fas fa-clock"></i> ${this.formatDate(scan.started_at)}</span>
                    ${scan.progress ? `<span><i class="fas fa-percentage"></i> ${scan.progress}%</span>` : ''}
                </div>
                <div class="scan-actions">
                    <button class="btn-sm btn-primary" onclick="window.ipScannerManager.viewScanDetails('${scan.id}')">
                        <i class="fas fa-eye"></i> عرض
                    </button>
                    ${scan.status === 'RUNNING' ? `
                        <button class="btn-sm btn-danger" onclick="window.ipScannerManager.stopScan('${scan.id}')">
                            <i class="fas fa-stop"></i> إيقاف
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    /**
     * عرض تفاصيل الفحص
     */
    viewScanDetails(scanId) {
        if (window.navigationManager) {
            window.navigationManager.navigateTo('ip-scan-results', { scanId });
        }
    }

    /**
     * إيقاف الفحص
     */
    async stopScan(scanId) {
        if (!confirm('هل أنت متأكد من إيقاف هذا الفحص؟')) {
            return;
        }

        try {
            loadingManager.showGlobal('جاري إيقاف الفحص...');
            
            const response = await api.stopIpScan(scanId);
            
            if (response.success) {
                notificationManager.success('تم إيقاف الفحص بنجاح');
                this.loadRecentScans();
            } else {
                notificationManager.error(response.error || 'فشل إيقاف الفحص');
            }
        } catch (error) {
            console.error('Error stopping scan:', error);
            notificationManager.error('حدث خطأ أثناء إيقاف الفحص');
        } finally {
            loadingManager.hideGlobal();
        }
    }

    /**
     * إغلاق النافذة المنبثقة
     */
    closeModal() {
        const modal = document.getElementById('scan-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * إعادة تحميل النموذج (في حالة وجود مشكلة)
     */
    reloadForm() {
        window.appLogger?.debug('🔄 Reloading form...');
        this.closeModal();
        setTimeout(() => {
            this.showNewScanForm();
        }, 300);
    }

    /**
     * الحصول على نص الحالة
     */
    getStatusText(status) {
        const statusTexts = {
            PENDING: 'قيد الانتظار',
            RUNNING: 'جاري التنفيذ',
            COMPLETED: 'مكتمل',
            FAILED: 'فشل',
            CANCELLED: 'ملغي'
        };
        return statusTexts[status] || status;
    }

    /**
     * تنسيق التاريخ
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        if (days < 7) return `منذ ${days} يوم`;
        
        return date.toLocaleDateString('ar-SA');
    }

    /**
     * اكتشاف الأجهزة القريبة على الشبكة
     */
    async discoverNetwork() {
        try {
            window.showLoading();
            window.notificationManager.show('جاري اكتشاف الأجهزة على الشبكة...', 'info');
            
            const response = await api.post('/network/discover');
            
            if (response.success && response.data) {
                const data = response.data;
                
                // عرض النتائج في modal
                this.showDiscoveryResults(data);
                
                window.notificationManager.show(
                    `تم اكتشاف ${data.hostsFound} جهاز على الشبكة`,
                    'success'
                );
            } else {
                window.notificationManager.show(
                    response.error || 'فشل اكتشاف الشبكة',
                    'error'
                );
            }
        } catch (error) {
            console.error('Error discovering network:', error);
            window.notificationManager.show('حدث خطأ أثناء اكتشاف الشبكة', 'error');
        } finally {
            window.hideLoading();
        }
    }

    /**
     * عرض نتائج اكتشاف الشبكة
     */
    showDiscoveryResults(data) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        
        const hostsHtml = data.hosts.map(host => `
            <tr>
                <td>${host.ip}${host.is_local ? ' <span class="badge badge-primary">محلي</span>' : ''}</td>
                <td>${host.hostname || '-'}</td>
                <td>${host.mac || '-'}</td>
                <td><span class="badge badge-success">${host.state}</span></td>
                <td>
                    <button class="btn-sm btn-primary" onclick="window.ipScannerManager.scanDiscoveredHost('${host.ip}')">
                        <i class="fas fa-search"></i> فحص
                    </button>
                </td>
            </tr>
        `).join('');
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 1000px;">
                <div class="modal-header">
                    <h2>
                        <i class="fas fa-network-wired"></i>
                        الأجهزة المكتشفة على الشبكة
                    </h2>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="info-cards" style="margin-bottom: 20px;">
                        <div class="info-card">
                            <div class="info-label">IP المحلي</div>
                            <div class="info-value">${data.localIp}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-label">نطاق الشبكة</div>
                            <div class="info-value">${data.networkRange}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-label">تم فحصها</div>
                            <div class="info-value">${data.totalScanned}</div>
                        </div>
                        <div class="info-card">
                            <div class="info-label">تم اكتشافها</div>
                            <div class="info-value">${data.hostsFound}</div>
                        </div>
                    </div>
                    
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>عنوان IP</th>
                                    <th>اسم الجهاز</th>
                                    <th>MAC Address</th>
                                    <th>الحالة</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${hostsHtml || '<tr><td colspan="5" class="text-center">لم يتم اكتشاف أي أجهزة</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                        إغلاق
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    /**
     * فحص جهاز مكتشف
     */
    async scanDiscoveredHost(ip) {
        // إغلاق modal النتائج
        const modal = document.querySelector('.modal');
        if (modal) modal.remove();
        
        // فتح نموذج الفحص مع IP محدد مسبقاً
        this.showNewScanForm();
        
        // ملء حقل IP
        setTimeout(() => {
            const targetInput = document.getElementById('scan-target');
            if (targetInput) {
                targetInput.value = ip;
            }
        }, 100);
    }
}
window.ipScannerManager = new IPScannerManager();
