// Phishing Campaign functionality
class PhishingManager {
    constructor() {
        this.currentCampaign = null;
    }

    showNewCampaignModal() {
        const modal = this.createModal('حملة تصيد جديدة', `
            <form id="newCampaignForm">
                <div class="form-group">
                    <label>اسم الحملة</label>
                    <input type="text" id="campaignName" required placeholder="حملة اختبار 2024">
                </div>
                
                <div class="form-group">
                    <label>الوصف</label>
                    <textarea id="campaignDescription" rows="3" placeholder="وصف الحملة..."></textarea>
                </div>
                
                <div class="form-group">
                    <label>قالب البريد</label>
                    <select id="campaignTemplate">
                        <option value="default">القالب الافتراضي</option>
                        <option value="banking">بنكي</option>
                        <option value="social">وسائل التواصل</option>
                        <option value="corporate">شركات</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>الأهداف (بريد إلكتروني لكل سطر)</label>
                    <textarea id="campaignTargets" rows="5" required placeholder="user1@example.com
user2@example.com"></textarea>
                </div>
                
                <div class="form-group">
                    <label>رقم التصريح</label>
                    <input type="text" id="campaignAuthorizationId" required placeholder="AUTH-XXXX">
                </div>
                
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="campaignNotifyTargets" checked>
                        إشعار الأهداف بعد الحملة
                    </label>
                </div>
                
                <button type="submit" class="btn-primary btn-block">إنشاء الحملة</button>
            </form>
        `);

        document.getElementById('newCampaignForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.createCampaign();
            modal.remove();
        });
    }

    async createCampaign() {
        const targetsText = document.getElementById('campaignTargets').value;
        const targets = targetsText
            .split('\n')
            .map(email => email.trim())
            .filter(email => email)
            .map(email => ({ email, name: email.split('@')[0] }));

        const campaignData = {
            name: document.getElementById('campaignName').value,
            description: document.getElementById('campaignDescription').value || '',
            authorizationId: document.getElementById('campaignAuthorizationId').value,
            targets: targets,
            emailTemplate: {
                subject: 'رسالة مهمة',
                body: 'محتوى البريد الإلكتروني',
                senderName: 'الإدارة',
                senderEmail: 'admin@company.com'
            },
            landingPage: {
                url: 'https://phishing-test.local/landing',
                captureCredentials: true
            },
            schedule: {
                startTime: new Date().toISOString(),
                endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            },
            notifyTargets: document.getElementById('campaignNotifyTargets').checked
        };

        try {
            window.showLoading();
            const response = await api.createCampaign(campaignData);
            window.hideLoading();
            
            if (response.success) {
                showToast('تم إنشاء الحملة بنجاح', 'success');
                app.loadPhishing();
            }
        } catch (error) {
            window.hideLoading();
            showToast(error.message || 'فشل إنشاء الحملة', 'error');
        }
    }

    async viewCampaign(campaignId) {
        try {
            window.showLoading();
            const [campaignResponse, statsResponse] = await Promise.all([
                api.getCampaign(campaignId),
                api.getCampaignStats(campaignId).catch(() => ({ data: {} }))
            ]);
            window.hideLoading();

            const campaign = campaignResponse.data;
            const stats = statsResponse.data || {};

            this.showCampaignDetails(campaign, stats);
        } catch (error) {
            window.hideLoading();
            showToast('فشل تحميل تفاصيل الحملة', 'error');
        }
    }

    showCampaignDetails(campaign, stats) {
        const modal = this.createModal(`تفاصيل الحملة - ${campaign.name}`, `
            <div class="campaign-details">
                <div class="stats-grid" style="margin-bottom: 20px;">
                    <div class="stat-card">
                        <div class="stat-icon blue">
                            <i class="fas fa-envelope"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.total_sent || 0}</h3>
                            <p>رسائل مرسلة</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon green">
                            <i class="fas fa-eye"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.total_opened || 0}</h3>
                            <p>تم فتحها</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon red">
                            <i class="fas fa-mouse-pointer"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.total_clicked || 0}</h3>
                            <p>تم النقر</p>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon purple">
                            <i class="fas fa-key"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${stats.total_submitted || 0}</h3>
                            <p>تم الإرسال</p>
                        </div>
                    </div>
                </div>
                
                <div class="detail-row">
                    <strong>الحالة:</strong>
                    <span class="badge ${this.getStatusClass(campaign.status)}">${campaign.status}</span>
                </div>
                <div class="detail-row">
                    <strong>تاريخ الإنشاء:</strong>
                    <span>${new Date(campaign.created_at).toLocaleString('ar')}</span>
                </div>
                <div class="detail-row">
                    <strong>الوصف:</strong>
                    <span>${campaign.description || 'لا يوجد وصف'}</span>
                </div>
                
                <h3 style="margin-top: 20px;">الأهداف</h3>
                <div class="targets-list">
                    ${this.renderTargets(campaign.targets || [])}
                </div>
            </div>
        `, 'large');
    }

    renderTargets(targets) {
        if (!targets.length) {
            return '<p class="text-center">لا توجد أهداف</p>';
        }

        return targets.map(target => `
            <div class="target-item">
                <div class="target-email">${target.email}</div>
                <div class="target-status">
                    ${target.opened ? '<i class="fas fa-eye text-success"></i>' : ''}
                    ${target.clicked ? '<i class="fas fa-mouse-pointer text-warning"></i>' : ''}
                    ${target.submitted ? '<i class="fas fa-check text-danger"></i>' : ''}
                </div>
            </div>
        `).join('');
    }

    getStatusClass(status) {
        const normalizedStatus = String(status || '').toUpperCase();
        const classes = {
            'DRAFT': 'secondary',
            'QUEUED': 'warning',
            'ACTIVE': 'success',
            'PAUSED': 'warning',
            'COMPLETED': 'info',
            'CANCELLED': 'danger',
            'FAILED': 'danger'
        };
        return classes[normalizedStatus] || 'secondary';
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
window.PhishingManager = new PhishingManager();
