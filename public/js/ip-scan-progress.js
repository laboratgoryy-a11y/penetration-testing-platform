/**
 * IP Scan Progress Component
 * مكون عرض تقدم فحص IP
 */

class IPScanProgress {
    constructor(scanId) {
        this.scanId = scanId;
        this.pollInterval = null;
        this.pollDelay = 2000; // 2 seconds
    }

    /**
     * تهيئة مكون التقدم
     */
    async initialize() {
        window.appLogger?.debug('Initializing scan progress for:', this.scanId);
        await this.loadScanDetails();
        this.startPolling();
    }

    /**
     * تحميل تفاصيل الفحص
     */
    async loadScanDetails() {
        try {
            const response = await api.getIpScan(this.scanId);
            
            if (response.success) {
                this.updateProgressUI(response.data);
            } else {
                notificationManager.error('فشل تحميل تفاصيل الفحص');
            }
        } catch (error) {
            console.error('Error loading scan details:', error);
            notificationManager.error('حدث خطأ أثناء تحميل التفاصيل');
        }
    }

    /**
     * بدء polling للحصول على التحديثات
     */
    startPolling() {
        this.pollInterval = setInterval(async () => {
            try {
                const response = await api.getIpScanStatus(this.scanId);
                
                if (response.success) {
                    const scanData = {
                        ...response.data,
                        status: String(response.data.status || '').toUpperCase()
                    };
                    this.updateProgressUI(scanData);
                    
                    // إيقاف polling إذا انتهى الفحص
                    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(scanData.status)) {
                        this.stopPolling();
                        this.onScanComplete(scanData);
                    }
                }
            } catch (error) {
                console.error('Error polling scan status:', error);
            }
        }, this.pollDelay);
    }

    /**
     * إيقاف polling
     */
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * تحديث واجهة التقدم
     */
    updateProgressUI(scanData) {
        // تحديث شريط التقدم
        const progressBar = document.getElementById('scan-progress-bar');
        const progressText = document.getElementById('scan-progress-text');
        
        if (progressBar && progressText) {
            const progress = scanData.progress || 0;
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
            
            // تغيير اللون حسب الحالة
            if (scanData.status === 'COMPLETED') {
                progressBar.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
            } else if (scanData.status === 'FAILED') {
                progressBar.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
            }
        }

        // تحديث الحالة
        const statusBadge = document.getElementById('scan-status-badge');
        if (statusBadge) {
            statusBadge.textContent = this.getStatusText(scanData.status);
            statusBadge.className = `status-badge status-${scanData.status.toLowerCase()}`;
        }

        // تحديث الوقت المتبقي
        const timeRemaining = document.getElementById('scan-time-remaining');
        if (timeRemaining && scanData.estimatedTimeRemaining) {
            timeRemaining.textContent = this.formatTimeRemaining(scanData.estimatedTimeRemaining);
        }

        // تحديث معلومات الهدف
        const targetInfo = document.getElementById('scan-target-info');
        if (targetInfo && scanData.target) {
            targetInfo.textContent = scanData.target.value || scanData.target_value;
        }

        // تحديث نوع الفحص
        const scanTypeInfo = document.getElementById('scan-type-info');
        if (scanTypeInfo && scanData.config) {
            const scanType = scanData.config.scanType || scanData.scan_type;
            scanTypeInfo.textContent = this.getScanTypeText(scanType);
        }

        // تحديث وقت البدء
        const startTime = document.getElementById('scan-start-time');
        if (startTime && scanData.startedAt) {
            startTime.textContent = new Date(scanData.startedAt || scanData.started_at).toLocaleString('ar-SA');
        }
    }

    /**
     * معالجة اكتمال الفحص
     */
    onScanComplete(scanData) {
        if (scanData.status === 'COMPLETED') {
            notificationManager.success('اكتمل الفحص بنجاح!');
            
            // عرض زر عرض النتائج
            const actionsContainer = document.getElementById('scan-actions');
            if (actionsContainer) {
                actionsContainer.innerHTML = `
                    <button class="btn-primary btn-lg" onclick="viewScanResults('${this.scanId}')">
                        <i class="fas fa-eye"></i> عرض النتائج
                    </button>
                    <button class="btn-secondary" onclick="window.location.href='/ip-scanner.html'">
                        <i class="fas fa-arrow-right"></i> العودة للقائمة
                    </button>
                `;
            }
        } else if (scanData.status === 'FAILED') {
            notificationManager.error('فشل الفحص');
            
            // عرض رسالة الخطأ
            const errorContainer = document.getElementById('scan-error-message');
            if (errorContainer && scanData.errorMessage) {
                errorContainer.style.display = 'block';
                errorContainer.querySelector('.error-text').textContent = scanData.errorMessage || scanData.error_message;
            }
        }
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
     * الحصول على نص نوع الفحص
     */
    getScanTypeText(type) {
        const scanTypes = {
            QUICK_SCAN: 'فحص سريع',
            COMPREHENSIVE_SCAN: 'فحص شامل',
            PORT_SCAN: 'فحص المنافذ',
            SERVICE_SCAN: 'كشف الخدمات',
            OS_DETECTION: 'كشف نظام التشغيل',
            VULNERABILITY_SCAN: 'فحص الثغرات',
            STEALTH_SCAN: 'فحص خفي'
        };
        return scanTypes[type] || type;
    }

    /**
     * تنسيق الوقت المتبقي
     */
    formatTimeRemaining(seconds) {
        if (!seconds || seconds <= 0) return 'غير معروف';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours} ساعة ${minutes} دقيقة`;
        } else if (minutes > 0) {
            return `${minutes} دقيقة ${secs} ثانية`;
        } else {
            return `${secs} ثانية`;
        }
    }

    /**
     * تنظيف الموارد
     */
    cleanup() {
        this.stopPolling();
    }
}

// دالة عامة لعرض النتائج
function viewScanResults(scanId) {
    window.location.href = `/ip-scan-results.html?scanId=${scanId}`;
}

// دالة عامة لإيقاف الفحص
async function stopCurrentScan(scanId) {
    if (!confirm('هل أنت متأكد من إيقاف هذا الفحص؟')) {
        return;
    }

    try {
        loadingManager.showGlobal('جاري إيقاف الفحص...');
        
        const response = await api.stopIpScan(scanId);
        
        if (response.success) {
            notificationManager.success('تم إيقاف الفحص بنجاح');
            setTimeout(() => {
                window.location.href = '/ip-scanner.html';
            }, 1500);
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

