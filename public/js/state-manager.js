/**
 * State Manager - إدارة مركزية للحالة مع دعم Polling والإشعارات
 */
class StateManager {
  constructor() {
    this.state = {
      dashboard: {
        stats: null,
        vulnerabilityDistribution: null,
        lastUpdate: null,
        loading: false
      },
      scans: {
        list: [],
        activeScans: [],
        currentScan: null,
        loading: false
      },
      campaigns: {
        list: [],
        activeCampaigns: [],
        currentCampaign: null,
        loading: false
      },
      networkAnalyses: {
        list: [],
        activeAnalyses: [],
        currentAnalysis: null,
        loading: false
      },
      permissions: {
        list: [],
        loading: false
      },
      reports: {
        list: [],
        loading: false
      },
      auditLogs: {
        list: [],
        loading: false
      },
      user: null,
      currentSection: 'dashboard'
    };

    this.listeners = [];
    this.pollingIntervals = new Map();
  }

  /**
   * الحصول على الحالة الكاملة أو جزء منها
   */
  getState(path = null) {
    if (!path) return this.state;
    
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * تحديث الحالة وإشعار المستمعين
   */
  setState(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.state;
    
    for (const key of keys) {
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }
    
    target[lastKey] = value;
    this.notifyListeners(path, value);
  }

  /**
   * تحديث عدة قيم في الحالة دفعة واحدة
   * @param {Object} updates - object يحتوي على المفاتيح والقيم للتحديث
   */
  updateState(updates) {
    if (typeof updates !== 'object' || updates === null) {
      console.error('updateState expects an object');
      return;
    }
    
    Object.keys(updates).forEach(key => {
      this.setState(key, updates[key]);
    });
  }

  /**
   * الاشتراك في تغييرات الحالة
   */
  subscribe(callback) {
    this.listeners.push(callback);
    
    // إرجاع دالة لإلغاء الاشتراك
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * إشعار جميع المستمعين بالتغييرات
   */
  notifyListeners(path, value) {
    this.listeners.forEach(callback => {
      try {
        callback(path, value, this.state);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  /**
   * بدء polling لتحديث البيانات بشكل دوري
   */
  startPolling(key, callback, interval = 30000) {
    // إيقاف polling السابق إن وجد
    this.stopPolling(key);
    
    // تنفيذ callback فوراً
    callback();
    
    // بدء polling
    const intervalId = setInterval(callback, interval);
    this.pollingIntervals.set(key, intervalId);
    
    window.appLogger?.debug(`✓ Started polling: ${key} (every ${interval}ms)`);
  }

  /**
   * إيقاف polling محدد
   */
  stopPolling(key) {
    if (this.pollingIntervals.has(key)) {
      clearInterval(this.pollingIntervals.get(key));
      this.pollingIntervals.delete(key);
      window.appLogger?.debug(`✓ Stopped polling: ${key}`);
    }
  }

  /**
   * إيقاف جميع عمليات polling
   */
  stopAllPolling() {
    this.pollingIntervals.forEach((intervalId, key) => {
      clearInterval(intervalId);
      window.appLogger?.debug(`✓ Stopped polling: ${key}`);
    });
    this.pollingIntervals.clear();
  }

  /**
   * تحديث إحصائيات Dashboard
   */
  updateDashboardStats(stats) {
    this.setState('dashboard.stats', stats);
    this.setState('dashboard.lastUpdate', new Date().toISOString());
  }

  /**
   * تحديث توزيع الثغرات
   */
  updateVulnerabilityDistribution(distribution) {
    this.setState('dashboard.vulnerabilityDistribution', distribution);
  }

  /**
   * تحديث قائمة الفحوصات
   */
  updateScans(scans) {
    this.setState('scans.list', scans);
    
    // تحديث الفحوصات النشطة
    const activeScans = scans.filter(scan => 
      scan.status === 'RUNNING' || scan.status === 'PENDING'
    );
    this.setState('scans.activeScans', activeScans);
  }

  /**
   * تحديث قائمة الحملات
   */
  updateCampaigns(campaigns) {
    this.setState('campaigns.list', campaigns);
    
    // تحديث الحملات النشطة
    const activeCampaigns = campaigns.filter(campaign => 
      campaign.status === 'ACTIVE'
    );
    this.setState('campaigns.activeCampaigns', activeCampaigns);
  }

  /**
   * تحديث قائمة تحليلات الشبكات
   */
  updateNetworkAnalyses(analyses) {
    this.setState('networkAnalyses.list', analyses);
    
    // تحديث التحليلات النشطة
    const activeAnalyses = analyses.filter(analysis => 
      analysis.status === 'RUNNING' || analysis.status === 'PENDING'
    );
    this.setState('networkAnalyses.activeAnalyses', activeAnalyses);
  }

  /**
   * تعيين حالة loading
   */
  setLoading(section, loading) {
    this.setState(`${section}.loading`, loading);
    
    // عرض أو إخفاء loading indicator
    if (window.loadingManager) {
      const containerId = `${section}-page`;
      if (loading) {
        window.loadingManager.show(`#${containerId}`, 'جاري تحميل البيانات...');
      } else {
        window.loadingManager.hide(`#${containerId}`);
      }
    }
  }

  /**
   * تعيين حالة loading لعنصر محدد
   */
  setElementLoading(elementId, loading, message = 'جاري التحميل...') {
    if (window.loadingManager) {
      if (loading) {
        window.loadingManager.show(`#${elementId}`, message);
      } else {
        window.loadingManager.hide(`#${elementId}`);
      }
    }
  }

  /**
   * تعيين المستخدم الحالي
   */
  setUser(user) {
    this.setState('user', user);
  }

  /**
   * تعيين القسم الحالي
   */
  setCurrentSection(section) {
    this.setState('currentSection', section);
  }

  /**
   * إعادة تعيين الحالة
   */
  reset() {
    this.stopAllPolling();
    this.state = {
      dashboard: { stats: null, vulnerabilityDistribution: null, lastUpdate: null, loading: false },
      scans: { list: [], activeScans: [], currentScan: null, loading: false },
      campaigns: { list: [], activeCampaigns: [], currentCampaign: null, loading: false },
      networkAnalyses: { list: [], activeAnalyses: [], currentAnalysis: null, loading: false },
      permissions: { list: [], loading: false },
      reports: { list: [], loading: false },
      auditLogs: { list: [], loading: false },
      user: null,
      currentSection: 'dashboard'
    };
    this.notifyListeners('reset', null);
  }
}

// تصدير instance واحد (Singleton)
window.stateManager = new StateManager();

