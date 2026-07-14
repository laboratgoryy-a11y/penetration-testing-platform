// Dashboard specific functionality
class DashboardManager {
    constructor() {
        this.api = window.api;
        this.stateManager = window.stateManager;
        this.chart = null;
        this.pollingKey = 'dashboard';
    }

    async initialize() {
        window.appLogger?.debug('✓ Initializing Dashboard Manager');
        
        // تحميل البيانات الأولية
        await this.loadDashboardData();
        
        // بدء polling كل 30 ثانية
        this.stateManager.startPolling(this.pollingKey, async () => {
            await this.loadDashboardData();
        }, 30000);
        
        // الاشتراك في تغييرات الحالة
        this.stateManager.subscribe((path, value) => {
            if (path.startsWith('dashboard.')) {
                this.renderDashboard();
            }
        });
        
        // ربط الأحداث
        this.bindEvents();
    }

    async loadDashboardData() {
        try {
            this.stateManager.setLoading('dashboard', true);
            
            // تحميل الإحصائيات
            const statsResponse = await this.api.getDashboardStats();
            if (statsResponse.success) {
                this.stateManager.updateDashboardStats(statsResponse.data);
            }
            
            // تحميل توزيع الثغرات
            const distResponse = await this.api.getVulnerabilityDistribution();
            if (distResponse.success) {
                this.stateManager.updateVulnerabilityDistribution(distResponse.data);
            }
            
            // تحميل النشاط الأخير
            try {
                const response = await this.api.getRecentActivity();
                if (response.success && response.data) {
                    this.renderRecentActivity(response.data.logs || response.data);
                } else {
                    this.renderRecentActivity([]);
                }
            } catch (error) {
                console.error('Error loading recent activity:', error);
                this.renderRecentActivity([]);
            }
            
            this.stateManager.setLoading('dashboard', false);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.stateManager.setLoading('dashboard', false);
            if (window.notificationManager) {
                window.notificationManager.error('��� ����� ������ ���� ������');
            }
        }
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        if (!activities || activities.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 10px; opacity: 0.3;"></i>
                    <p>لا يوجد نشاط حديث</p>
                    <p style="font-size: 14px; opacity: 0.7;">ابدأ بإنشاء عملية جديدة لرؤية النشاط هنا</p>
                </div>
            `;
            return;
        }

        // عرض آخر 5 أنشطة فقط
        const recentActivities = activities.slice(0, 5);
        
        container.innerHTML = recentActivities.map(activity => {
            const icon = this.getActivityIcon(activity.action || activity.event_type);
            const color = this.getActivityColor(activity.action || activity.event_type);
            
            return `
                <div class="activity-item">
                    <div class="activity-icon ${color}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <p class="activity-title">${this.formatActivityTitle(activity)}</p>
                        <p class="activity-time">${this.formatTime(activity.timestamp || activity.created_at)}</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    getActivityIcon(action) {
        const icons = {
            'SCAN_CREATED': 'fa-globe',
            'SCAN_COMPLETED': 'fa-check-circle',
            'CAMPAIGN_CREATED': 'fa-fish',
            'CAMPAIGN_LAUNCHED': 'fa-paper-plane',
            'NETWORK_TEST_CREATED': 'fa-network-wired',
            'NETWORK_TEST_COMPLETED': 'fa-check-circle',
            'AUTHORIZATION_CREATED': 'fa-key',
            'REPORT_GENERATED': 'fa-file-pdf',
            'USER_LOGIN': 'fa-sign-in-alt',
            'USER_LOGOUT': 'fa-sign-out-alt'
        };
        return icons[action] || 'fa-info-circle';
    }

    getActivityColor(action) {
        const colors = {
            'SCAN_CREATED': 'blue',
            'SCAN_COMPLETED': 'green',
            'CAMPAIGN_CREATED': 'green',
            'CAMPAIGN_LAUNCHED': 'purple',
            'NETWORK_TEST_CREATED': 'purple',
            'NETWORK_TEST_COMPLETED': 'green',
            'AUTHORIZATION_CREATED': 'blue',
            'REPORT_GENERATED': 'red',
            'USER_LOGIN': 'green',
            'USER_LOGOUT': 'gray'
        };
        return colors[action] || 'blue';
    }

    formatActivityTitle(activity) {
        const titles = {
            'SCAN_CREATED': `فحص جديد: ${activity.details?.target_url || 'غير محدد'}`,
            'SCAN_COMPLETED': `اكتمل الفحص: ${activity.details?.target_url || 'غير محدد'}`,
            'CAMPAIGN_CREATED': `حملة تصيد جديدة: ${activity.details?.name || 'غير محدد'}`,
            'CAMPAIGN_LAUNCHED': `تم إطلاق حملة: ${activity.details?.name || 'غير محدد'}`,
            'NETWORK_TEST_CREATED': `اختبار شبكة جديد: ${activity.details?.ssid || 'غير محدد'}`,
            'NETWORK_TEST_COMPLETED': `اكتمل اختبار الشبكة: ${activity.details?.ssid || 'غير محدد'}`,
            'AUTHORIZATION_CREATED': `تصريح جديد: ${activity.details?.organization_name || 'غير محدد'}`,
            'REPORT_GENERATED': `تقرير جديد: ${activity.details?.type || 'غير محدد'}`,
            'USER_LOGIN': `تسجيل دخول: ${activity.user_email || 'مستخدم'}`,
            'USER_LOGOUT': `تسجيل خروج: ${activity.user_email || 'مستخدم'}`
        };
        
        return titles[activity.action || activity.event_type] || activity.description || 'نشاط جديد';
    }

    renderDashboard() {
        const stats = this.stateManager.getState('dashboard.stats');
        const lastUpdate = this.stateManager.getState('dashboard.lastUpdate');
        const loading = this.stateManager.getState('dashboard.loading');
        
        // تحديث الإحصائيات
        if (stats) {
            this.updateStatsDisplay(stats);
        }
        
        // تحديث timestamp آخر تحديث
        if (lastUpdate) {
            this.updateLastUpdateDisplay(lastUpdate);
        }
        
        // تحديث الرسم البياني
        const distribution = this.stateManager.getState('dashboard.vulnerabilityDistribution');
        if (distribution) {
            this.updateVulnerabilityChart(distribution);
        }
        
        // تحديث loading indicator
        this.updateLoadingState(loading);
    }

    updateStatsDisplay(stats) {
        const elements = {
            'dashboard-total-scans': stats.totalScans || 0,
            'dashboard-total-vulnerabilities': stats.totalVulnerabilities || 0,
            'dashboard-total-campaigns': stats.activeCampaigns || 0,
            'dashboard-total-network-tests': stats.networkTests || 0
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    updateLastUpdateDisplay(timestamp) {
        const container = document.getElementById('dashboard-last-update');
        if (container) {
            const date = new Date(timestamp);
            container.textContent = `آخر تحديث: ${this.formatTime(timestamp)}`;
        }
    }

    updateVulnerabilityChart(distribution) {
        const canvas = document.getElementById('vulnerability-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // تدمير الرسم السابق إن وجد
        if (this.chart) {
            this.chart.destroy();
        }
        
        // إنشاء رسم جديد
        if (typeof Chart !== 'undefined') {
            this.chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['XSS', 'SQL Injection', 'CSRF', 'RCE', 'LFI', 'أخرى'],
                    datasets: [{
                        data: [
                            distribution.xss || 0,
                            distribution.sqli || 0,
                            distribution.csrf || 0,
                            distribution.rce || 0,
                            distribution.lfi || 0,
                            distribution.other || 0
                        ],
                        backgroundColor: [
                            '#ef4444', '#f97316', '#eab308', 
                            '#3b82f6', '#8b5cf6', '#6b7280'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            rtl: true,
                            labels: {
                                font: {
                                    family: 'Cairo, sans-serif',
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    updateLoadingState(loading) {
        const indicator = document.getElementById('dashboard-loading');
        if (indicator) {
            indicator.style.display = loading ? 'block' : 'none';
        }
    }


    bindEvents() {
        // ربط زر "بدء عملية جديدة"
        const newOperationBtn = document.getElementById('btn-new-operation');
        if (newOperationBtn) {
            window.appLogger?.debug('✓ Button "btn-new-operation" found, adding event listener');
            newOperationBtn.addEventListener('click', () => {
                window.appLogger?.debug('🖱️ Button clicked!');
                window.appLogger?.debug('✓ window.operationsManager exists:', !!window.operationsManager);
                
                if (window.operationsManager) {
                    window.appLogger?.debug('✓ Calling showNewOperationModal()...');
                    try {
                        window.operationsManager.showNewOperationModal();
                    } catch (error) {
                        console.error('❌ Error calling showNewOperationModal():', error);
                        console.error('Stack:', error.stack);
                    }
                } else {
                    console.error('❌ window.operationsManager is not defined!');
                    alert('خطأ: Operations Manager غير متاح. يرجى إعادة تحميل الصفحة.');
                }
            });
        } else {
            console.error('❌ Button "btn-new-operation" not found!');
        }
        
        // ربط الإجراءات السريعة
        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAction(action);
            });
        });
    }

    handleAction(action) {
        switch (action) {
            case 'new-scan':
                window.navigationManager.navigateTo('web-scan');
                break;
            case 'new-campaign':
                window.navigationManager.navigateTo('phishing');
                break;
            case 'new-test':
                window.navigationManager.navigateTo('network');
                break;
            case 'generate-report':
                window.navigationManager.navigateTo('reports');
                break;
        }
    }

    formatTime(timestamp) {
        if (!timestamp) return 'غير محدد';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        return `منذ ${days} يوم`;
    }

    destroy() {
        // إيقاف polling
        if (this.stateManager) {
            this.stateManager.stopPolling(this.pollingKey);
        }
        
        // تدمير الرسم البياني
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}

// Export for use in main app
window.dashboardManager = new DashboardManager();


