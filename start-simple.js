// Simple server without database - for testing frontend only
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Redirect root to login page
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Serve static files (after root redirect)
app.use(express.static(path.join(__dirname, 'public')));

// Mock data
const mockUser = {
  id: '1',
  username: 'admin',
  email: 'admin@example.com'
};

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Auth endpoints
app.post('/api/v1/auth/login', (req, res) => {
  const { username, password, mfaToken } = req.body;
  
  // Simulate validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: 'يرجى إدخال اسم المستخدم وكلمة المرور'
    });
  }

  // Simulate MFA requirement (if username contains 'mfa')
  if (username.toLowerCase().includes('mfa') && !mfaToken) {
    return res.json({
      success: false,
      requiresMFA: true,
      message: 'يرجى إدخال رمز المصادقة الثنائية'
    });
  }

  // Simulate MFA validation
  if (mfaToken && mfaToken !== '123456') {
    return res.status(401).json({
      success: false,
      error: 'رمز المصادقة الثنائية غير صحيح'
    });
  }

  res.json({
    success: true,
    data: {
      user: mockUser,
      token: 'mock-jwt-token-12345',
      requiresMFA: false
    }
  });
});

app.post('/api/v1/auth/logout', (req, res) => {
  res.json({ success: true, data: { message: 'Logged out successfully' } });
});

app.get('/api/v1/auth/me', (req, res) => {
  res.json({ success: true, data: mockUser });
});

// OAuth endpoints (mock)
app.get('/api/v1/auth/google', (req, res) => {
  // In production, this would redirect to Google OAuth
  res.json({
    success: false,
    error: 'Google OAuth not configured in development mode'
  });
});

app.get('/api/v1/auth/facebook', (req, res) => {
  // In production, this would redirect to Facebook OAuth
  res.json({
    success: false,
    error: 'Facebook OAuth not configured in development mode'
  });
});

app.get('/api/v1/auth/google/callback', (req, res) => {
  // OAuth callback handler
  res.redirect('/index.html?login=success');
});

app.get('/api/v1/auth/facebook/callback', (req, res) => {
  // OAuth callback handler
  res.redirect('/index.html?login=success');
});

// Dashboard stats
app.get('/api/v1/dashboard/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalScans: 45,
      activeScans: 3,
      totalVulnerabilities: 127,
      criticalVulnerabilities: 8,
      activeCampaigns: 2,
      networkTests: 12
    }
  });
});

// Vulnerability distribution
app.get('/api/v1/dashboard/vulnerability-distribution', (req, res) => {
  res.json({
    success: true,
    data: {
      xss: 23,
      sqli: 15,
      csrf: 8,
      rce: 5,
      lfi: 12,
      other: 64
    }
  });
});

// Recent activity (audit logs)
app.get('/api/v1/audit', (req, res) => {
  res.json({
    success: true,
    data: {
      logs: [
        {
          id: '1',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          event_type: 'SCAN_COMPLETED',
          action: 'Web scan completed',
          result: 'SUCCESS',
          details: { target: 'https://example.com' }
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          event_type: 'USER_LOGIN',
          action: 'User logged in',
          result: 'SUCCESS',
          details: { username: 'admin' }
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          event_type: 'CAMPAIGN_STARTED',
          action: 'Phishing campaign started',
          result: 'SUCCESS',
          details: { campaign: 'Test Campaign' }
        }
      ],
      pagination: { page: 1, limit: 10, total: 3 }
    }
  });
});

// Scans - Web Scans
app.get('/api/v1/scans/web', (req, res) => {
  res.json({
    success: true,
    data: {
      scans: [
        {
          id: '1',
          target_url: 'https://example.com',
          status: 'COMPLETED',
          started_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date(Date.now() - 1800000).toISOString(),
          total_vulnerabilities: 15
        },
        {
          id: '2',
          target_url: 'https://test-site.com',
          status: 'RUNNING',
          started_at: new Date(Date.now() - 300000).toISOString(),
          completed_at: null,
          total_vulnerabilities: 0
        },
        {
          id: '3',
          target_url: 'https://demo.example.org',
          status: 'PENDING',
          started_at: new Date(Date.now() - 60000).toISOString(),
          completed_at: null,
          total_vulnerabilities: 0
        }
      ],
      pagination: { page: 1, limit: 10, total: 3 }
    }
  });
});

// Legacy endpoint for backward compatibility
app.get('/api/v1/scans', (req, res) => {
  res.json({
    success: true,
    data: {
      scans: [
        {
          id: '1',
          target_url: 'https://example.com',
          status: 'COMPLETED',
          started_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date(Date.now() - 1800000).toISOString(),
          total_vulnerabilities: 15
        }
      ],
      pagination: { page: 1, limit: 10, total: 1 }
    }
  });
});

app.post('/api/v1/scans/web', (req, res) => {
  const { targetUrl, scope } = req.body;
  
  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      error: 'يرجى إدخال عنوان URL'
    });
  }
  
  res.json({
    success: true,
    data: {
      id: `scan-${Date.now()}`,
      target_url: targetUrl,
      status: 'PENDING',
      started_at: new Date().toISOString(),
      message: 'تم بدء الفحص بنجاح'
    }
  });
});

app.post('/api/v1/scans', (req, res) => {
  res.json({
    success: true,
    data: {
      id: '2',
      target_url: req.body.targetUrl,
      status: 'PENDING',
      started_at: new Date().toISOString()
    }
  });
});

// Scan details
app.get('/api/v1/scans/web/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    data: {
      id: id,
      target_url: 'https://example.com',
      status: 'COMPLETED',
      started_at: new Date(Date.now() - 3600000).toISOString(),
      completed_at: new Date(Date.now() - 1800000).toISOString(),
      total_vulnerabilities: 15,
      scan_type: 'FULL',
      progress: 100
    }
  });
});

// Scan vulnerabilities
app.get('/api/v1/scans/web/:id/vulnerabilities', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        type: 'XSS',
        severity: 'HIGH',
        url: 'https://example.com/search',
        description: 'Cross-Site Scripting vulnerability found',
        recommendation: 'Sanitize user input'
      },
      {
        id: '2',
        type: 'SQL_INJECTION',
        severity: 'CRITICAL',
        url: 'https://example.com/login',
        description: 'SQL Injection vulnerability detected',
        recommendation: 'Use parameterized queries'
      },
      {
        id: '3',
        type: 'CSRF',
        severity: 'MEDIUM',
        url: 'https://example.com/profile',
        description: 'Missing CSRF token',
        recommendation: 'Implement CSRF protection'
      }
    ]
  });
});

// Scan status
app.get('/api/v1/scans/web/:id/status', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'COMPLETED',
      progress: 100,
      current_step: 'Finished',
      vulnerabilities_found: 15
    }
  });
});

// Stop scan
app.post('/api/v1/scans/web/:id/stop', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'تم إيقاف الفحص بنجاح',
      status: 'STOPPED'
    }
  });
});

// Phishing campaigns
app.get('/api/v1/phishing/campaigns', (req, res) => {
  res.json({
    success: true,
    data: {
      campaigns: [
        {
          id: '1',
          name: 'Test Campaign',
          status: 'ACTIVE',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          targets_count: 50,
          interactions_count: 12
        }
      ],
      pagination: { page: 1, limit: 10, total: 1 }
    }
  });
});

// Network tests
app.get('/api/v1/network/tests', (req, res) => {
  res.json({
    success: true,
    data: {
      tests: [
        {
          id: '1',
          ssid: 'TestNetwork',
          status: 'COMPLETED',
          started_at: new Date(Date.now() - 7200000).toISOString(),
          completed_at: new Date(Date.now() - 3600000).toISOString()
        }
      ],
      pagination: { page: 1, limit: 10, total: 1 }
    }
  });
});

// Authorizations
app.get('/api/v1/authorizations', (req, res) => {
  res.json({
    success: true,
    data: {
      authorizations: [
        {
          id: '1',
          organization_name: 'Test Organization',
          valid_from: new Date(Date.now() - 2592000000).toISOString(),
          valid_until: new Date(Date.now() + 2592000000).toISOString(),
          status: 'ACTIVE'
        }
      ],
      pagination: { page: 1, limit: 10, total: 1 }
    }
  });
});

// Reports
app.get('/api/v1/reports', (req, res) => {
  res.json({
    success: true,
    data: {
      reports: [
        {
          id: '1',
          type: 'SCAN',
          format: 'PDF',
          generated_at: new Date(Date.now() - 3600000).toISOString(),
          file_path: '/reports/scan-report-1.pdf'
        }
      ],
      pagination: { page: 1, limit: 10, total: 1 }
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('✓ Simple Server Started Successfully!');
  console.log('='.repeat(50));
  console.log(`Server running at: http://localhost:${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}/index.html`);
  console.log(`Login: http://localhost:${PORT}/login.html`);
  console.log('='.repeat(50));
  console.log('Note: This is a mock server for testing the frontend');
  console.log('Database: Not connected (using mock data)');
  console.log('Redis: Not connected (not required for this demo)');
  console.log('='.repeat(50));
});
