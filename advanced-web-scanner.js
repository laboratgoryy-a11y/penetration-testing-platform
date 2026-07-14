/**
 * Advanced Web Scanner - محرك فحص ويب متقدم
 * يستخدم تقنيات متقدمة لاكتشاف الثغرات الأمنية
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

class AdvancedWebScanner {
  constructor(db) {
    this.db = db;
    this.visitedUrls = new Set();
    this.discoveredUrls = new Set();
    this.vulnerabilities = [];
    this.maxDepth = 3;
    this.maxRequests = 100;
    this.requestCount = 0;
    this.baseUrl = null;
    this.scanId = null;
    
    // تكوين axios مع timeout وheaders واقعية
    this.client = axios.create({
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      validateStatus: (status) => status < 500 // قبول جميع الردود أقل من 500
    });
  }

  /**
   * بدء الفحص الشامل
   */
  async startScan(scanId, targetUrl, config = {}) {
    this.scanId = scanId;
    this.baseUrl = new URL(targetUrl);
    this.maxDepth = config.maxDepth || 3;
    this.maxRequests = config.maxRequests || 100;
    this.vulnerabilityTypes = config.vulnerabilityTypes || [
      'SQL_INJECTION',
      'XSS',
      'CSRF',
      'DIRECTORY_TRAVERSAL',
      'COMMAND_INJECTION',
      'XXE',
      'SSRF',
      'OPEN_REDIRECT',
      'SECURITY_MISCONFIGURATION',
      'SENSITIVE_DATA_EXPOSURE'
    ];

    console.log(`🚀 Starting advanced scan for: ${targetUrl}`);
    console.log(`📊 Config: maxDepth=${this.maxDepth}, maxRequests=${this.maxRequests}`);

    try {
      // تحديث حالة الفحص
      this.updateScanStatus('RUNNING');

      // المرحلة 1: الزحف واكتشاف الصفحات
      console.log('📡 Phase 1: Crawling and URL Discovery');
      await this.crawl(targetUrl, 0);

      // المرحلة 2: فحص الثغرات
      console.log('🔍 Phase 2: Vulnerability Testing');
      await this.scanForVulnerabilities();

      // المرحلة 3: فحص الأمان العام
      console.log('🛡️ Phase 3: Security Configuration Testing');
      await this.testSecurityHeaders();
      await this.testSSLTLS();

      // إنهاء الفحص
      this.updateScanStatus('COMPLETED');
      
      console.log(`✅ Scan completed!`);
      console.log(`📊 Results: ${this.visitedUrls.size} pages, ${this.vulnerabilities.length} vulnerabilities`);

      return {
        success: true,
        pagesScanned: this.visitedUrls.size,
        vulnerabilitiesFound: this.vulnerabilities.length,
        vulnerabilities: this.vulnerabilities
      };

    } catch (error) {
      console.error('❌ Scan failed:', error.message);
      this.updateScanStatus('FAILED', error.message);
      throw error;
    }
  }

  /**
   * الزحف إلى الصفحات واكتشاف الروابط
   */
  async crawl(url, depth) {
    // التحقق من الحدود
    if (depth > this.maxDepth || this.requestCount >= this.maxRequests) {
      console.log(`  ⏭️ Skipping (depth=${depth}, requests=${this.requestCount})`);
      return;
    }

    // التحقق من أن الرابط لم يتم زيارته
    if (this.visitedUrls.has(url)) {
      console.log(`  ⏭️ Already visited: ${url}`);
      return;
    }

    // التحقق من أن الرابط ضمن النطاق
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname !== this.baseUrl.hostname) {
        console.log(`  ⏭️ Out of scope: ${url}`);
        return;
      }
    } catch (e) {
      console.log(`  ❌ Invalid URL: ${url}`);
      return;
    }

    console.log(`  🔗 Crawling [depth=${depth}, #${this.requestCount + 1}]: ${url}`);
    this.visitedUrls.add(url);
    this.requestCount++;

    try {
      const response = await this.client.get(url);
      const html = response.data;
      const $ = cheerio.load(html);

      // تحديث قاعدة البيانات
      this.updateScanProgress();

      // استخراج الروابط
      const links = this.extractLinks($, url);
      console.log(`    📎 Found ${links.length} links`);
      
      // استخراج النماذج
      const forms = this.extractForms($, url);
      console.log(`    📝 Found ${forms.length} forms`);
      
      // حفظ معلومات الصفحة
      this.savePageInfo(url, {
        statusCode: response.status,
        title: $('title').text(),
        forms: forms.length,
        links: links.length,
        headers: response.headers
      });

      // الزحف إلى الروابط المكتشفة
      for (const link of links.slice(0, 20)) { // حد أقصى 20 رابط لكل صفحة
        if (this.requestCount < this.maxRequests) {
          await this.crawl(link, depth + 1);
          await this.sleep(200); // تأخير 200ms لتجنب الحظر
        }
      }

    } catch (error) {
      console.log(`  ⚠️ Error crawling ${url}: ${error.message}`);
      if (error.response) {
        console.log(`    Status: ${error.response.status}`);
      }
    }
  }

  /**
   * استخراج الروابط من الصفحة
   */
  extractLinks($, baseUrl) {
    const links = new Set();
    
    $('a[href]').each((i, elem) => {
      try {
        const href = $(elem).attr('href');
        const absoluteUrl = new URL(href, baseUrl).href;
        
        // تجاهل الروابط الخارجية والملفات
        if (absoluteUrl.startsWith(this.baseUrl.origin) && 
            !absoluteUrl.match(/\.(jpg|jpeg|png|gif|pdf|zip|css|js)$/i)) {
          links.add(absoluteUrl);
        }
      } catch (e) {
        // تجاهل الروابط غير الصالحة
      }
    });

    return Array.from(links);
  }

  /**
   * استخراج النماذج من الصفحة
   */
  extractForms($, pageUrl) {
    const forms = [];
    
    $('form').each((i, elem) => {
      const form = {
        action: $(elem).attr('action') || pageUrl,
        method: ($(elem).attr('method') || 'GET').toUpperCase(),
        inputs: []
      };

      $(elem).find('input, textarea, select').each((j, input) => {
        form.inputs.push({
          name: $(input).attr('name'),
          type: $(input).attr('type') || 'text',
          value: $(input).attr('value') || ''
        });
      });

      forms.push(form);
    });

    return forms;
  }

  /**
   * فحص الثغرات الأمنية
   */
  async scanForVulnerabilities() {
    const urlsToTest = Array.from(this.visitedUrls);

    for (const url of urlsToTest) {
      if (this.vulnerabilityTypes.includes('SQL_INJECTION')) {
        await this.testSQLInjection(url);
      }
      
      if (this.vulnerabilityTypes.includes('XSS')) {
        await this.testXSS(url);
      }
      
      if (this.vulnerabilityTypes.includes('DIRECTORY_TRAVERSAL')) {
        await this.testDirectoryTraversal(url);
      }
      
      if (this.vulnerabilityTypes.includes('OPEN_REDIRECT')) {
        await this.testOpenRedirect(url);
      }

      await this.sleep(50);
    }
  }

  /**
   * اختبار SQL Injection
   */
  async testSQLInjection(url) {
    const payloads = [
      "' OR '1'='1",
      "' OR '1'='1' --",
      "' OR '1'='1' /*",
      "admin' --",
      "1' OR '1'='1",
      "' UNION SELECT NULL--",
      "' AND 1=1--",
      "' AND 1=2--"
    ];

    const urlObj = new URL(url);
    
    // اختبار كل معامل في URL
    for (const [param, value] of urlObj.searchParams.entries()) {
      for (const payload of payloads) {
        try {
          const testUrl = new URL(url);
          testUrl.searchParams.set(param, payload);
          
          const response = await this.client.get(testUrl.href);
          const body = response.data.toLowerCase();

          // البحث عن علامات SQL Injection
          if (body.includes('sql syntax') || 
              body.includes('mysql') || 
              body.includes('postgresql') ||
              body.includes('ora-') ||
              body.includes('syntax error') ||
              body.includes('unclosed quotation')) {
            
            this.addVulnerability({
              type: 'SQL_INJECTION',
              severity: 'CRITICAL',
              url: url,
              parameter: param,
              payload: payload,
              description: `محتمل SQL Injection في المعامل "${param}"`,
              evidence: `تم اكتشاف رسالة خطأ SQL في الاستجابة`,
              remediation: 'استخدم Prepared Statements أو Parameterized Queries',
              cvssScore: 9.8
            });
            
            console.log(`  🚨 SQL Injection found in ${param} at ${url}`);
            break; // لا حاجة لاختبار المزيد من payloads لهذا المعامل
          }
        } catch (e) {
          // تجاهل الأخطاء
        }
      }
    }
  }

  /**
   * اختبار XSS (Cross-Site Scripting)
   */
  async testXSS(url) {
    const payloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '"><script>alert("XSS")</script>',
      "'><script>alert('XSS')</script>",
      '<iframe src="javascript:alert(\'XSS\')">',
      '<body onload=alert("XSS")>'
    ];

    const urlObj = new URL(url);
    
    for (const [param, value] of urlObj.searchParams.entries()) {
      for (const payload of payloads) {
        try {
          const testUrl = new URL(url);
          testUrl.searchParams.set(param, payload);
          
          const response = await this.client.get(testUrl.href);
          const body = response.data;

          // البحث عن payload في الاستجابة بدون encoding
          if (body.includes(payload) || 
              body.includes(payload.replace(/"/g, '&quot;')) ||
              body.includes('<script>') && body.includes('alert')) {
            
            this.addVulnerability({
              type: 'XSS',
              severity: 'HIGH',
              url: url,
              parameter: param,
              payload: payload,
              description: `محتمل XSS (Cross-Site Scripting) في المعامل "${param}"`,
              evidence: `تم العثور على payload في الاستجابة بدون تنظيف`,
              remediation: 'قم بتنظيف وترميز جميع المدخلات قبل عرضها',
              cvssScore: 7.5
            });
            
            console.log(`  🚨 XSS found in ${param} at ${url}`);
            break;
          }
        } catch (e) {
          // تجاهل الأخطاء
        }
      }
    }
  }

  /**
   * اختبار Directory Traversal
   */
  async testDirectoryTraversal(url) {
    const payloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\win.ini',
      '....//....//....//etc/passwd',
      '..%2F..%2F..%2Fetc%2Fpasswd',
      '..%5c..%5c..%5cwindows%5cwin.ini'
    ];

    const urlObj = new URL(url);
    
    for (const [param, value] of urlObj.searchParams.entries()) {
      for (const payload of payloads) {
        try {
          const testUrl = new URL(url);
          testUrl.searchParams.set(param, payload);
          
          const response = await this.client.get(testUrl.href);
          const body = response.data.toLowerCase();

          // البحث عن محتوى ملفات النظام
          if (body.includes('root:') || 
              body.includes('[extensions]') ||
              body.includes('for 16-bit app support')) {
            
            this.addVulnerability({
              type: 'DIRECTORY_TRAVERSAL',
              severity: 'HIGH',
              url: url,
              parameter: param,
              payload: payload,
              description: `محتمل Directory Traversal في المعامل "${param}"`,
              evidence: `تم الوصول إلى ملفات النظام`,
              remediation: 'تحقق من صحة مسارات الملفات ولا تسمح بـ ../ في المدخلات',
              cvssScore: 7.5
            });
            
            console.log(`  🚨 Directory Traversal found in ${param} at ${url}`);
            break;
          }
        } catch (e) {
          // تجاهل الأخطاء
        }
      }
    }
  }

  /**
   * اختبار Open Redirect
   */
  async testOpenRedirect(url) {
    const payloads = [
      'https://evil.com',
      '//evil.com',
      '///evil.com',
      'https://evil.com@target.com'
    ];

    const urlObj = new URL(url);
    const redirectParams = ['redirect', 'url', 'next', 'return', 'returnUrl', 'goto', 'target'];
    
    for (const param of redirectParams) {
      if (urlObj.searchParams.has(param)) {
        for (const payload of payloads) {
          try {
            const testUrl = new URL(url);
            testUrl.searchParams.set(param, payload);
            
            const response = await this.client.get(testUrl.href, {
              maxRedirects: 0,
              validateStatus: (status) => status < 400
            });

            // التحقق من إعادة التوجيه
            if (response.status >= 300 && response.status < 400) {
              const location = response.headers.location;
              if (location && (location.includes('evil.com') || location.startsWith('//'))) {
                
                this.addVulnerability({
                  type: 'OPEN_REDIRECT',
                  severity: 'MEDIUM',
                  url: url,
                  parameter: param,
                  payload: payload,
                  description: `محتمل Open Redirect في المعامل "${param}"`,
                  evidence: `إعادة توجيه إلى: ${location}`,
                  remediation: 'تحقق من صحة عناوين URL قبل إعادة التوجيه',
                  cvssScore: 6.1
                });
                
                console.log(`  🚨 Open Redirect found in ${param} at ${url}`);
                break;
              }
            }
          } catch (e) {
            // تجاهل الأخطاء
          }
        }
      }
    }
  }

  /**
   * اختبار Security Headers
   */
  async testSecurityHeaders() {
    try {
      const response = await this.client.get(this.baseUrl.href);
      const headers = response.headers;

      const securityHeaders = {
        'x-frame-options': 'X-Frame-Options',
        'x-content-type-options': 'X-Content-Type-Options',
        'strict-transport-security': 'Strict-Transport-Security',
        'content-security-policy': 'Content-Security-Policy',
        'x-xss-protection': 'X-XSS-Protection'
      };

      for (const [header, name] of Object.entries(securityHeaders)) {
        if (!headers[header]) {
          this.addVulnerability({
            type: 'SECURITY_MISCONFIGURATION',
            severity: 'LOW',
            url: this.baseUrl.href,
            description: `مفقود ${name} header`,
            evidence: `لم يتم العثور على ${name} في response headers`,
            remediation: `أضف ${name} header لتحسين الأمان`,
            cvssScore: 3.7
          });
          
          console.log(`  ⚠️ Missing security header: ${name}`);
        }
      }
    } catch (e) {
      console.log(`  ⚠️ Error testing security headers: ${e.message}`);
    }
  }

  /**
   * اختبار SSL/TLS
   */
  async testSSLTLS() {
    if (this.baseUrl.protocol === 'https:') {
      try {
        // محاولة الاتصال بـ HTTP
        const httpUrl = this.baseUrl.href.replace('https://', 'http://');
        const response = await this.client.get(httpUrl, {
          maxRedirects: 0,
          validateStatus: (status) => status < 500
        });

        // التحقق من إعادة التوجيه إلى HTTPS
        if (response.status < 300 || response.status >= 400) {
          this.addVulnerability({
            type: 'SECURITY_MISCONFIGURATION',
            severity: 'MEDIUM',
            url: httpUrl,
            description: 'الموقع لا يفرض HTTPS',
            evidence: 'يمكن الوصول إلى الموقع عبر HTTP بدون إعادة توجيه',
            remediation: 'أضف إعادة توجيه تلقائية من HTTP إلى HTTPS',
            cvssScore: 5.3
          });
          
          console.log(`  ⚠️ HTTPS not enforced`);
        }
      } catch (e) {
        // تجاهل الأخطاء
      }
    } else {
      this.addVulnerability({
        type: 'SENSITIVE_DATA_EXPOSURE',
        severity: 'HIGH',
        url: this.baseUrl.href,
        description: 'الموقع لا يستخدم HTTPS',
        evidence: 'الموقع يعمل على HTTP فقط',
        remediation: 'قم بتفعيل HTTPS باستخدام شهادة SSL/TLS',
        cvssScore: 7.5
      });
      
      console.log(`  🚨 Site not using HTTPS`);
    }
  }

  /**
   * إضافة ثغرة مكتشفة
   */
  addVulnerability(vuln) {
    const vulnId = `vuln-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const vulnerability = {
      id: vulnId,
      scan_session_id: this.scanId,
      type: vuln.type,
      severity: vuln.severity,
      location: vuln.url, // استخدام location بدلاً من url
      parameter: vuln.parameter || null,
      payload: vuln.payload || null,
      description: vuln.description,
      evidence: vuln.evidence || null,
      remediation: vuln.remediation || null,
      cvss_score: vuln.cvssScore || null,
      discovered_at: new Date().toISOString()
    };

    this.vulnerabilities.push(vulnerability);

    // حفظ في قاعدة البيانات
    try {
      const insertVuln = this.db.prepare(`
        INSERT INTO vulnerabilities (
          id, scan_session_id, type, severity, location,
          description, evidence, remediation, cvss_score, discovered_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertVuln.run(
        vulnId,
        this.scanId,
        vuln.type,
        vuln.severity,
        vuln.url,
        vuln.description,
        vuln.evidence || null,
        vuln.remediation || null,
        vuln.cvssScore || null,
        new Date().toISOString()
      );
      
      console.log(`  💾 Saved vulnerability: ${vuln.type} at ${vuln.url}`);
    } catch (e) {
      console.error('Error saving vulnerability:', e.message);
    }
  }

  /**
   * حفظ معلومات الصفحة
   */
  savePageInfo(url, info) {
    // يمكن حفظ معلومات إضافية عن كل صفحة هنا
  }

  /**
   * تحديث حالة الفحص
   */
  updateScanStatus(status, errorMsg = null) {
    try {
      const update = this.db.prepare(`
        UPDATE scan_sessions 
        SET status = ?, 
            total_requests = ?,
            total_vulnerabilities = ?,
            completed_at = ?
        WHERE id = ?
      `);

      update.run(
        status,
        this.visitedUrls.size,
        this.vulnerabilities.length,
        status === 'COMPLETED' || status === 'FAILED' ? new Date().toISOString() : null,
        this.scanId
      );
      
      console.log(`  📊 Status updated: ${status}`);
      console.log(`  📊 Pages: ${this.visitedUrls.size}, Vulnerabilities: ${this.vulnerabilities.length}`);
    } catch (e) {
      console.error('Error updating scan status:', e.message);
    }
  }

  /**
   * تحديث تقدم الفحص
   */
  updateScanProgress() {
    try {
      const update = this.db.prepare(`
        UPDATE scan_sessions 
        SET total_requests = ?,
            total_vulnerabilities = ?
        WHERE id = ?
      `);

      update.run(
        this.visitedUrls.size,
        this.vulnerabilities.length,
        this.scanId
      );
    } catch (e) {
      console.error('Error updating scan progress:', e.message);
    }
  }

  /**
   * تأخير (للتحكم في معدل الطلبات)
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = AdvancedWebScanner;
