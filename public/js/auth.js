// Authentication Manager - مدير المصادقة والجلسات
class AuthManager {
  constructor(apiClient) {
    this.api = apiClient;
    this.currentUser = null;
  }

  // تسجيل الدخول
  async login(username, password, mfaToken = null) {
    try {
      const response = await this.api.login(username, password, mfaToken);
      
      window.appLogger?.debug('Login response:', response);
      
      // Check if login was successful
      if (response.success === false) {
        return { 
          success: false, 
          error: response.error || 'فشل تسجيل الدخول',
          requiresMFA: response.requiresMFA || false
        };
      }
      
      // Handle successful login
      if (response.success && response.data) {
        const token = response.data.token;
        const user = response.data.user;
        
        if (token) {
          this.api.setToken(token);
          this.currentUser = user;
          return { success: true, user: user, requiresMFA: false };
        }
      }
      
      // Handle MFA requirement
      if (response.requiresMFA) {
        return { success: false, requiresMFA: true };
      }
      
      return { success: false, error: 'استجابة غير صحيحة من الخادم' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'حدث خطأ أثناء تسجيل الدخول' };
    }
  }

  // تسجيل الخروج
  async logout() {
    try {
      await this.api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.api.clearToken();
      this.currentUser = null;
      window.location.href = '/login.html';
    }
  }

  // التحقق من الجلسة
  async checkSession() {
    try {
      const response = await this.api.getCurrentUser();
      this.currentUser = response.user || response.data || null;
      return true;
    } catch (error) {
      this.api.clearToken();
      return false;
    }
  }

  // الحصول على المستخدم الحالي
  getCurrentUser() {
    return this.currentUser;
  }

  // التحقق من تسجيل الدخول
  isAuthenticated() {
    return !!this.api.token;
  }

  // التحقق من الصلاحية
  hasPermission(permission) {
    if (!this.currentUser || !this.currentUser.permissions) {
      return false;
    }
    return this.currentUser.permissions.includes(permission);
  }

  // التحقق من الدور
  hasRole(role) {
    if (!this.currentUser || !this.currentUser.roles) {
      return false;
    }
    return this.currentUser.roles.includes(role);
  }
}

// تصدير AuthManager للاستخدام العام
if (typeof window !== 'undefined') {
  window.AuthManager = AuthManager;
}

