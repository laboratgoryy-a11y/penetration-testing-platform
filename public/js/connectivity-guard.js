class ConnectivityGuard {
  constructor() {
    this.status = {
      online: true,
      required: true,
      message: 'يرجى الاتصال بالإنترنت',
    };
    this.overlay = null;
    this.checking = false;
    this.intervalId = null;
  }

  initialize() {
    this.injectStyles();
    window.addEventListener('online', () => this.check(true));
    window.addEventListener('offline', () => this.showOffline());

    const start = () => {
      this.check(true);
      this.intervalId = window.setInterval(() => this.check(false), 30000);
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }

  async ensureOnline() {
    if (!navigator.onLine) {
      this.showOffline();
      throw new Error('يرجى الاتصال بالإنترنت');
    }

    const status = await this.check(true);
    if (!status.online) {
      this.showOffline();
      throw new Error('يرجى الاتصال بالإنترنت');
    }

    return true;
  }

  async check(force = false) {
    if (this.checking) {
      return this.status;
    }

    if (!navigator.onLine) {
      this.showOffline();
      return this.status;
    }

    this.checking = true;
    try {
      const response = await fetch(`/api/v1/system/connectivity?ts=${Date.now()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const payload = await response.json().catch(() => ({}));
      const status = payload.data || payload.error?.details || {};

      this.status = {
        required: status.required !== false,
        online: response.ok && status.online !== false,
        checkedAt: status.checkedAt,
        host: status.host,
        message: 'يرجى الاتصال بالإنترنت',
      };

      if (this.status.online) {
        this.hideOffline();
      } else {
        this.showOffline();
      }
    } catch (_error) {
      this.showOffline();
    } finally {
      this.checking = false;
    }

    return this.status;
  }

  handleApiConnectivityError() {
    this.showOffline();
  }

  showOffline() {
    this.status = {
      ...this.status,
      online: false,
      required: true,
      message: 'يرجى الاتصال بالإنترنت',
    };

    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'internet-required-overlay';
      this.overlay.innerHTML = `
        <div class="internet-required-card" role="alertdialog" aria-live="assertive">
          <div class="internet-required-icon">
            <i class="fas fa-wifi"></i>
          </div>
          <h2>يرجى الاتصال بالإنترنت</h2>
          <button type="button" class="btn-primary" id="internet-required-retry">
            <i class="fas fa-sync-alt"></i>
            إعادة التحقق
          </button>
        </div>
      `;
      document.body.appendChild(this.overlay);
      this.overlay
        .querySelector('#internet-required-retry')
        ?.addEventListener('click', () => this.check(true));
    }

    document.documentElement.classList.add('internet-required-active');
  }

  hideOffline() {
    document.documentElement.classList.remove('internet-required-active');
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  injectStyles() {
    if (document.getElementById('connectivity-guard-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'connectivity-guard-styles';
    style.textContent = `
      .internet-required-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(15, 23, 42, 0.78);
        backdrop-filter: blur(6px);
        direction: rtl;
      }

      .internet-required-card {
        width: min(460px, 100%);
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
        padding: 30px;
        text-align: center;
        color: #111827;
      }

      .internet-required-icon {
        width: 74px;
        height: 74px;
        border-radius: 50%;
        margin: 0 auto 18px;
        display: grid;
        place-items: center;
        background: #fee2e2;
        color: #dc2626;
        font-size: 30px;
      }

      .internet-required-card h2 {
        margin: 0 0 22px;
        font-size: 1.7rem;
        font-weight: 800;
      }

      .internet-required-active body {
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }
}

window.connectivityGuard = window.connectivityGuard || new ConnectivityGuard();
window.connectivityGuard.initialize();
