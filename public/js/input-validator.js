/**
 * Input Validator - نظام التحقق من صحة المدخلات
 * يوفر validation شامل لجميع النماذج مع رسائل خطأ inline
 */
class InputValidator {
  constructor() {
    this.validationRules = {
      required: {
        validate: (value) => value !== null && value !== undefined && value.toString().trim() !== '',
        message: 'هذا الحقل مطلوب'
      },
      email: {
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: 'يرجى إدخال بريد إلكتروني صحيح'
      },
      url: {
        validate: (value) => {
          try {
            new URL(value);
            return /^https?:\/\/.+/.test(value);
          } catch {
            return false;
          }
        },
        message: 'يرجى إدخال رابط صحيح (يجب أن يبدأ بـ http:// أو https://)'
      },
      minLength: {
        validate: (value, min) => value.toString().length >= min,
        message: (min) => `يجب أن يحتوي على ${min} أحرف على الأقل`
      },
      maxLength: {
        validate: (value, max) => value.toString().length <= max,
        message: (max) => `يجب ألا يتجاوز ${max} حرف`
      },
      min: {
        validate: (value, min) => Number(value) >= min,
        message: (min) => `يجب أن تكون القيمة ${min} على الأقل`
      },
      max: {
        validate: (value, max) => Number(value) <= max,
        message: (max) => `يجب ألا تتجاوز القيمة ${max}`
      },
      pattern: {
        validate: (value, pattern) => new RegExp(pattern).test(value),
        message: 'التنسيق غير صحيح'
      },
      number: {
        validate: (value) => !isNaN(value) && isFinite(value),
        message: 'يجب إدخال رقم صحيح'
      },
      integer: {
        validate: (value) => Number.isInteger(Number(value)),
        message: 'يجب إدخال رقم صحيح بدون كسور'
      },
      positive: {
        validate: (value) => Number(value) > 0,
        message: 'يجب أن تكون القيمة موجبة'
      },
      ipAddress: {
        validate: (value) => /^(\d{1,3}\.){3}\d{1,3}$/.test(value) && 
          value.split('.').every(num => Number(num) >= 0 && Number(num) <= 255),
        message: 'يرجى إدخال عنوان IP صحيح'
      },
      macAddress: {
        validate: (value) => /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(value),
        message: 'يرجى إدخال عنوان MAC صحيح (مثال: 00:1A:2B:3C:4D:5E)'
      },
      ssid: {
        validate: (value) => value.length >= 1 && value.length <= 32,
        message: 'يجب أن يكون SSID بين 1 و 32 حرف'
      },
      date: {
        validate: (value) => !isNaN(Date.parse(value)),
        message: 'يرجى إدخال تاريخ صحيح'
      },
      futureDate: {
        validate: (value) => new Date(value) > new Date(),
        message: 'يجب أن يكون التاريخ في المستقبل'
      },
      pastDate: {
        validate: (value) => new Date(value) < new Date(),
        message: 'يجب أن يكون التاريخ في الماضي'
      }
    };

    this.init();
  }

  /**
   * تهيئة نظام التحقق
   */
  init() {
    window.appLogger?.debug('✓ Input Validator initialized');
  }

  /**
   * التحقق من حقل واحد
   */
  validateField(input, rules) {
    const value = input.value;
    const errors = [];

    // التحقق من كل قاعدة
    for (const [ruleName, ruleValue] of Object.entries(rules)) {
      const rule = this.validationRules[ruleName];
      
      if (!rule) {
        console.warn(`Unknown validation rule: ${ruleName}`);
        continue;
      }

      // تخطي التحقق إذا كان الحقل فارغاً وليس مطلوباً
      if (!value && ruleName !== 'required') {
        continue;
      }

      // تنفيذ التحقق
      const isValid = typeof ruleValue === 'boolean' 
        ? rule.validate(value)
        : rule.validate(value, ruleValue);

      if (!isValid) {
        const message = typeof rule.message === 'function'
          ? rule.message(ruleValue)
          : rule.message;
        errors.push(message);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * التحقق من نموذج كامل
   */
  validateForm(formElement) {
    const inputs = formElement.querySelectorAll('[data-validate]');
    let isValid = true;
    const allErrors = {};

    inputs.forEach(input => {
      // الحصول على قواعد التحقق من data attribute
      const rulesStr = input.getAttribute('data-validate');
      const rules = this.parseRules(rulesStr);

      // التحقق من الحقل
      const result = this.validateField(input, rules);

      if (!result.valid) {
        isValid = false;
        allErrors[input.name || input.id] = result.errors;
        this.showFieldError(input, result.errors[0]);
      } else {
        this.clearFieldError(input);
      }
    });

    return {
      valid: isValid,
      errors: allErrors
    };
  }

  /**
   * تحليل قواعد التحقق من string
   */
  parseRules(rulesStr) {
    const rules = {};
    
    if (!rulesStr) return rules;

    const ruleParts = rulesStr.split('|');
    
    ruleParts.forEach(part => {
      const [ruleName, ruleValue] = part.split(':');
      
      if (ruleValue) {
        // قاعدة مع قيمة (مثل minLength:5)
        rules[ruleName] = isNaN(ruleValue) ? ruleValue : Number(ruleValue);
      } else {
        // قاعدة بسيطة (مثل required)
        rules[ruleName] = true;
      }
    });

    return rules;
  }

  /**
   * عرض رسالة خطأ للحقل
   */
  showFieldError(input, message) {
    // إضافة class للحقل
    input.classList.add('input-error');
    input.classList.remove('input-valid');

    // البحث عن عنصر الخطأ أو إنشاؤه
    let errorElement = input.parentElement.querySelector('.field-error');
    
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.className = 'field-error';
      input.parentElement.appendChild(errorElement);
    }

    errorElement.textContent = message;
    errorElement.style.display = 'block';

    // إضافة أيقونة خطأ
    this.updateFieldIcon(input, 'error');
  }

  /**
   * مسح رسالة خطأ الحقل
   */
  clearFieldError(input) {
    input.classList.remove('input-error');
    input.classList.add('input-valid');

    const errorElement = input.parentElement.querySelector('.field-error');
    if (errorElement) {
      errorElement.style.display = 'none';
    }

    // إضافة أيقونة صح
    this.updateFieldIcon(input, 'valid');
  }

  /**
   * تحديث أيقونة الحقل
   */
  updateFieldIcon(input, state) {
    // إزالة الأيقونة القديمة
    const oldIcon = input.parentElement.querySelector('.field-icon');
    if (oldIcon) {
      oldIcon.remove();
    }

    // إضافة أيقونة جديدة
    const icon = document.createElement('i');
    icon.className = 'field-icon fas';
    
    if (state === 'error') {
      icon.classList.add('fa-exclamation-circle');
      icon.style.color = '#ef4444';
    } else if (state === 'valid') {
      icon.classList.add('fa-check-circle');
      icon.style.color = '#10b981';
    }

    // وضع الأيقونة
    input.parentElement.style.position = 'relative';
    icon.style.position = 'absolute';
    icon.style.left = '15px';
    icon.style.top = '50%';
    icon.style.transform = 'translateY(-50%)';
    icon.style.pointerEvents = 'none';

    input.parentElement.appendChild(icon);
  }

  /**
   * تفعيل التحقق التلقائي للنموذج
   */
  enableAutoValidation(formElement) {
    const inputs = formElement.querySelectorAll('[data-validate]');

    inputs.forEach(input => {
      // التحقق عند blur
      input.addEventListener('blur', () => {
        const rulesStr = input.getAttribute('data-validate');
        const rules = this.parseRules(rulesStr);
        const result = this.validateField(input, rules);

        if (!result.valid) {
          this.showFieldError(input, result.errors[0]);
        } else {
          this.clearFieldError(input);
        }
      });

      // مسح الخطأ عند input
      input.addEventListener('input', () => {
        if (input.classList.contains('input-error')) {
          const rulesStr = input.getAttribute('data-validate');
          const rules = this.parseRules(rulesStr);
          const result = this.validateField(input, rules);

          if (result.valid) {
            this.clearFieldError(input);
          }
        }
      });
    });

    // منع submit إذا كان النموذج غير صحيح
    formElement.addEventListener('submit', (e) => {
      const result = this.validateForm(formElement);
      
      if (!result.valid) {
        e.preventDefault();
        
        // التركيز على أول حقل خطأ
        const firstError = formElement.querySelector('.input-error');
        if (firstError) {
          firstError.focus();
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // إظهار إشعار
        if (window.notificationManager) {
          window.notificationManager.error('يرجى تصحيح الأخطاء في النموذج قبل المتابعة');
        }
      }
    });
  }

  /**
   * إضافة قاعدة تحقق مخصصة
   */
  addCustomRule(name, validateFn, message) {
    this.validationRules[name] = {
      validate: validateFn,
      message: message
    };
  }

  /**
   * التحقق من قيمة مباشرة
   */
  validate(value, rules) {
    const tempInput = { value };
    return this.validateField(tempInput, rules);
  }

  /**
   * مسح جميع أخطاء النموذج
   */
  clearFormErrors(formElement) {
    const inputs = formElement.querySelectorAll('[data-validate]');
    inputs.forEach(input => {
      this.clearFieldError(input);
    });
  }
}

// إنشاء instance عام (Singleton)
window.inputValidator = new InputValidator();

// Helper function للاستخدام السهل
window.validateForm = (formElement) => {
  return window.inputValidator.validateForm(formElement);
};

