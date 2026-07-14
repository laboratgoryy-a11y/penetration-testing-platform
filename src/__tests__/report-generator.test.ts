import { Pool } from 'pg';
import { ReportGenerator, ReportFormat, ReportMetadata } from '../services/ReportGenerator';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
jest.mock('fs');
jest.mock('pg');

describe('ReportGenerator', () => {
  let reportGenerator: ReportGenerator;
  let mockDb: jest.Mocked<Pool>;
  const testReportsDir = './test-reports';

  beforeEach(() => {
    // Setup mock database
    mockDb = {
      query: jest.fn(),
    } as any;

    // Setup mock filesystem
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation();
    (fs.writeFileSync as jest.Mock).mockImplementation();
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('test content'));
    (fs.unlinkSync as jest.Mock).mockImplementation();

    reportGenerator = new ReportGenerator(mockDb, testReportsDir);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateWebScanReport', () => {
    const mockMetadata: ReportMetadata = {
      title: 'Web Scan Report',
      author: 'Test User',
      organization: 'Test Org',
      confidentialityLevel: 'CONFIDENTIAL',
    };

    beforeEach(() => {
      // Mock scan session data
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('scan_sessions')) {
          return Promise.resolve({
            rows: [{
              id: 'session-123',
              target_url: 'https://example.com',
              started_at: new Date('2024-01-01'),
              completed_at: new Date('2024-01-02'),
              total_requests: 100,
            }],
          } as any);
        }
        if (query.includes('vulnerabilities')) {
          return Promise.resolve({
            rows: [
              {
                type: 'SQL_INJECTION',
                severity: 'CRITICAL',
                location: '/api/users',
                description: 'SQL injection vulnerability',
                evidence: 'Error message revealed',
                remediation: 'Use parameterized queries',
                cvss_score: 9.8,
              },
              {
                type: 'XSS',
                severity: 'HIGH',
                location: '/search',
                description: 'Cross-site scripting',
                evidence: 'Script executed',
                remediation: 'Sanitize input',
                cvss_score: 7.5,
              },
            ],
          } as any);
        }
        if (query.includes('INSERT INTO reports')) {
          return Promise.resolve({ rows: [] } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });
    });

    test('should generate PDF report', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'PDF',
        mockMetadata
      );

      expect(report).toBeDefined();
      expect(report.type).toBe('WEB_SCAN');
      expect(report.format).toBe('PDF');
      expect(report.metadata).toEqual(mockMetadata);
      expect(Buffer.isBuffer(report.content)).toBe(true);
    });

    test('should generate HTML report', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      expect(report).toBeDefined();
      expect(report.type).toBe('WEB_SCAN');
      expect(report.format).toBe('HTML');
      expect(typeof report.content).toBe('string');
      expect(report.content).toContain('<!DOCTYPE html>');
      expect(report.content).toContain('SQL_INJECTION');
      expect(report.content).toContain('XSS');
    });

    test('should generate JSON report', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'JSON',
        mockMetadata
      );

      expect(report).toBeDefined();
      expect(report.type).toBe('WEB_SCAN');
      expect(report.format).toBe('JSON');
      expect(typeof report.content).toBe('string');
      
      const parsed = JSON.parse(report.content as string);
      expect(parsed.sessionId).toBe('session-123');
      expect(parsed.vulnerabilities).toHaveLength(2);
    });

    test('should generate CSV report', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'CSV',
        mockMetadata
      );

      expect(report).toBeDefined();
      expect(report.type).toBe('WEB_SCAN');
      expect(report.format).toBe('CSV');
      expect(typeof report.content).toBe('string');
      expect(report.content).toContain('Type,Severity,Location');
      expect(report.content).toContain('SQL_INJECTION');
    });

    test('should include comprehensive vulnerability details', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      const content = report.content as string;
      
      // Check for vulnerability description
      expect(content).toContain('SQL injection vulnerability');
      
      // Check for severity levels
      expect(content).toContain('CRITICAL');
      expect(content).toContain('HIGH');
      
      // Check for location
      expect(content).toContain('/api/users');
      
      // Check for evidence
      expect(content).toContain('Error message revealed');
      
      // Check for remediation
      expect(content).toContain('Use parameterized queries');
      
      // Check for CVSS score
      expect(content).toContain('9.8');
    });

    test('should save report to database and filesystem', async () => {
      await reportGenerator.generateWebScanReport(
        'session-123',
        'PDF',
        mockMetadata
      );

      // Verify file was written
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // Verify database insert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reports'),
        expect.any(Array)
      );
    });
  });

  describe('generatePhishingReport', () => {
    const mockMetadata: ReportMetadata = {
      title: 'Phishing Campaign Report',
      author: 'Test User',
      organization: 'Test Org',
      confidentialityLevel: 'CONFIDENTIAL',
    };

    beforeEach(() => {
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('phishing_campaigns')) {
          return Promise.resolve({
            rows: [{
              id: 'campaign-123',
              name: 'Q1 Security Test',
              launched_at: new Date('2024-01-01'),
              completed_at: new Date('2024-01-07'),
            }],
          } as any);
        }
        if (query.includes('campaign_targets')) {
          return Promise.resolve({
            rows: [
              {
                id: 'target-1',
                email: 'user1@example.com',
                name: 'User One',
                department: 'IT',
                opened: '1',
                clicked: '1',
                entered: '1',
              },
              {
                id: 'target-2',
                email: 'user2@example.com',
                name: 'User Two',
                department: 'HR',
                opened: '1',
                clicked: '0',
                entered: '0',
              },
            ],
          } as any);
        }
        if (query.includes('campaign_interactions')) {
          return Promise.resolve({
            rows: [
              {
                interaction_type: 'EMAIL_OPENED',
                timestamp: new Date('2024-01-01T10:00:00Z'),
                ip_address: '192.168.1.1',
                user_agent: 'Mozilla/5.0',
              },
            ],
          } as any);
        }
        if (query.includes('INSERT INTO reports')) {
          return Promise.resolve({ rows: [] } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });
    });

    test('should generate phishing report with all formats', async () => {
      const formats: ReportFormat[] = ['PDF', 'HTML', 'JSON', 'CSV'];
      
      for (const format of formats) {
        const report = await reportGenerator.generatePhishingReport(
          'campaign-123',
          format,
          mockMetadata
        );

        expect(report).toBeDefined();
        expect(report.type).toBe('PHISHING_CAMPAIGN');
        expect(report.format).toBe(format);
      }
    });

    test('should include interaction statistics', async () => {
      const report = await reportGenerator.generatePhishingReport(
        'campaign-123',
        'HTML',
        mockMetadata
      );

      const content = report.content as string;
      
      // Check for target count
      expect(content).toContain('2');
      
      // Check for email addresses
      expect(content).toContain('user1@example.com');
      expect(content).toContain('user2@example.com');
    });
  });

  describe('generateNetworkReport', () => {
    const mockMetadata: ReportMetadata = {
      title: 'Network Analysis Report',
      author: 'Test User',
      organization: 'Test Org',
      confidentialityLevel: 'CONFIDENTIAL',
    };

    beforeEach(() => {
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('network_test_sessions')) {
          return Promise.resolve({
            rows: [{
              id: 'session-123',
              ssid: 'TestNetwork',
              bssid: '00:11:22:33:44:55',
              started_at: new Date('2024-01-01'),
              completed_at: new Date('2024-01-02'),
              config: {},
            }],
          } as any);
        }
        if (query.includes('network_vulnerabilities')) {
          return Promise.resolve({
            rows: [
              {
                type: 'WEAK_ENCRYPTION',
                severity: 'HIGH',
                description: 'WEP encryption detected',
                evidence: 'Encryption type: WEP',
                remediation: 'Upgrade to WPA3',
              },
            ],
          } as any);
        }
        if (query.includes('discovered_devices')) {
          return Promise.resolve({
            rows: [
              {
                mac_address: 'AA:BB:CC:DD:EE:FF',
                ip_address: '192.168.1.100',
                hostname: 'device1',
                vendor: 'Apple',
              },
            ],
          } as any);
        }
        if (query.includes('INSERT INTO reports')) {
          return Promise.resolve({ rows: [] } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });
    });

    test('should generate network report with all formats', async () => {
      const formats: ReportFormat[] = ['PDF', 'HTML', 'JSON', 'CSV'];
      
      for (const format of formats) {
        const report = await reportGenerator.generateNetworkReport(
          'session-123',
          format,
          mockMetadata
        );

        expect(report).toBeDefined();
        expect(report.type).toBe('NETWORK_ANALYSIS');
        expect(report.format).toBe(format);
      }
    });

    test('should include network details', async () => {
      const report = await reportGenerator.generateNetworkReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      const content = report.content as string;
      
      expect(content).toContain('TestNetwork');
      expect(content).toContain('00:11:22:33:44:55');
      expect(content).toContain('WEAK_ENCRYPTION');
      expect(content).toContain('AA:BB:CC:DD:EE:FF');
    });
  });

  describe('generateComplianceReport', () => {
    const mockMetadata: ReportMetadata = {
      title: 'Compliance Report',
      author: 'Test User',
      organization: 'Test Org',
      confidentialityLevel: 'RESTRICTED',
    };

    beforeEach(() => {
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('UNION ALL')) {
          return Promise.resolve({
            rows: [
              {
                id: 'op-1',
                operation_type: 'WEB_SCAN',
                timestamp: new Date('2024-01-01'),
                user_id: 'user-123',
                target: 'https://example.com',
                authorization_id: 'auth-123',
                result: 'COMPLETED',
              },
              {
                id: 'op-2',
                operation_type: 'PHISHING_CAMPAIGN',
                timestamp: new Date('2024-01-02'),
                user_id: 'user-456',
                target: 'Test Campaign',
                authorization_id: null,
                result: 'FAILED',
              },
            ],
          } as any);
        }
        if (query.includes('INSERT INTO reports')) {
          return Promise.resolve({ rows: [] } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });
    });

    test('should generate compliance report', async () => {
      const report = await reportGenerator.generateComplianceReport(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'HTML',
        mockMetadata
      );

      expect(report).toBeDefined();
      expect(report.type).toBe('COMPLIANCE');
      expect(report.format).toBe('HTML');
    });

    test('should include authorized and unauthorized operations', async () => {
      const report = await reportGenerator.generateComplianceReport(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'HTML',
        mockMetadata
      );

      const content = report.content as string;
      
      // Should show total operations
      expect(content).toContain('2');
      
      // Should show authorized operations
      expect(content).toContain('auth-123');
      
      // Should highlight unauthorized attempts
      expect(content).toContain('غير موجود');
    });
  });

  describe('Report Storage', () => {
    test('should retrieve saved report', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'report-123',
          type: 'WEB_SCAN',
          format: 'PDF',
          file_path: '/path/to/report.pdf',
          metadata: { title: 'Test Report' },
          generated_at: new Date(),
        }],
      } as any);

      const report = await reportGenerator.getReport('report-123');

      expect(report).toBeDefined();
      expect(report?.id).toBe('report-123');
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    test('should delete report from database and filesystem', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ file_path: '/path/to/report.pdf' }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      (fs.existsSync as jest.Mock).mockReturnValue(true);

      await reportGenerator.deleteReport('report-123');

      expect(fs.unlinkSync).toHaveBeenCalledWith('/path/to/report.pdf');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM reports'),
        ['report-123']
      );
    });

    test('should list reports with filters', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            type: 'WEB_SCAN',
            format: 'PDF',
            metadata: {},
            generated_at: new Date(),
          },
          {
            id: 'report-2',
            type: 'PHISHING_CAMPAIGN',
            format: 'HTML',
            metadata: {},
            generated_at: new Date(),
          },
        ],
      } as any);

      const reports = await reportGenerator.listReports('WEB_SCAN');

      expect(reports).toHaveLength(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('type = $1'),
        expect.arrayContaining(['WEB_SCAN'])
      );
    });
  });

  describe('Error Handling', () => {
    test('should throw error for non-existent scan session', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] } as any);

      await expect(
        reportGenerator.generateWebScanReport(
          'non-existent',
          'PDF',
          {} as ReportMetadata
        )
      ).rejects.toThrow('Scan session not found');
    });

    test('should throw error for unsupported format', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'session-123' }],
      } as any);

      await expect(
        reportGenerator.generateWebScanReport(
          'session-123',
          'INVALID' as ReportFormat,
          {} as ReportMetadata
        )
      ).rejects.toThrow('Unsupported format');
    });
  });

  // Additional unit tests for ReportGenerator - Task 16.5
  describe('توليد تقارير بتنسيقات مختلفة', () => {
    const mockMetadata: ReportMetadata = {
      title: 'Test Report',
      author: 'Test User',
      organization: 'Test Org',
      confidentialityLevel: 'CONFIDENTIAL',
    };

    beforeEach(() => {
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('scan_sessions')) {
          return Promise.resolve({
            rows: [{
              id: 'session-123',
              target_url: 'https://example.com',
              started_at: new Date('2024-01-01'),
              completed_at: new Date('2024-01-02'),
              total_requests: 100,
            }],
          } as any);
        }
        if (query.includes('vulnerabilities')) {
          return Promise.resolve({
            rows: [
              {
                type: 'SQL_INJECTION',
                severity: 'CRITICAL',
                location: '/api/users',
                description: 'SQL injection vulnerability',
                evidence: 'Error message revealed',
                remediation: 'Use parameterized queries',
                cvss_score: 9.8,
              },
            ],
          } as any);
        }
        if (query.includes('INSERT INTO reports')) {
          return Promise.resolve({ rows: [] } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });
    });

    test('should generate PDF format correctly', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'PDF',
        mockMetadata
      );

      expect(report.format).toBe('PDF');
      expect(Buffer.isBuffer(report.content)).toBe(true);
      expect(report.content.length).toBeGreaterThan(0);
    });

    test('should generate HTML format correctly', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      expect(report.format).toBe('HTML');
      expect(typeof report.content).toBe('string');
      expect(report.content).toContain('<!DOCTYPE html>');
      expect(report.content).toContain('<html');
      expect(report.content).toContain('</html>');
    });

    test('should generate JSON format correctly', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'JSON',
        mockMetadata
      );

      expect(report.format).toBe('JSON');
      expect(typeof report.content).toBe('string');
      
      // Verify it's valid JSON
      const parsed = JSON.parse(report.content as string);
      expect(parsed).toBeDefined();
      expect(parsed.sessionId).toBe('session-123');
    });

    test('should generate CSV format correctly', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'CSV',
        mockMetadata
      );

      expect(report.format).toBe('CSV');
      expect(typeof report.content).toBe('string');
      expect(report.content).toContain(',');
      expect(report.content).toContain('\n');
    });

    test('should support all formats for phishing reports', async () => {
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('phishing_campaigns')) {
          return Promise.resolve({
            rows: [{
              id: 'campaign-123',
              name: 'Test Campaign',
              launched_at: new Date(),
              completed_at: new Date(),
            }],
          } as any);
        }
        if (query.includes('campaign_targets')) {
          return Promise.resolve({ rows: [] } as any);
        }
        if (query.includes('campaign_interactions')) {
          return Promise.resolve({ rows: [] } as any);
        }
        if (query.includes('INSERT INTO reports')) {
          return Promise.resolve({ rows: [] } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });

      const formats: ReportFormat[] = ['PDF', 'HTML', 'JSON', 'CSV'];
      
      for (const format of formats) {
        const report = await reportGenerator.generatePhishingReport(
          'campaign-123',
          format,
          mockMetadata
        );

        expect(report.format).toBe(format);
      }
    });

    test('should support all formats for network reports', async () => {
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('network_test_sessions')) {
          return Promise.resolve({
            rows: [{
              id: 'session-123',
              ssid: 'TestNetwork',
              bssid: '00:11:22:33:44:55',
              started_at: new Date(),
              completed_at: new Date(),
              config: {},
            }],
          } as any);
        }
        if (query.includes('network_vulnerabilities')) {
          return Promise.resolve({ rows: [] } as any);
        }
        if (query.includes('discovered_devices')) {
          return Promise.resolve({ rows: [] } as any);
        }
        if (query.includes('INSERT INTO reports')) {
          return Promise.resolve({ rows: [] } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });

      const formats: ReportFormat[] = ['PDF', 'HTML', 'JSON', 'CSV'];
      
      for (const format of formats) {
        const report = await reportGenerator.generateNetworkReport(
          'session-123',
          format,
          mockMetadata
        );

        expect(report.format).toBe(format);
      }
    });
  });

  describe('محتوى التقرير الشامل', () => {
    const mockMetadata: ReportMetadata = {
      title: 'Comprehensive Report',
      author: 'Security Analyst',
      organization: 'Test Organization',
      confidentialityLevel: 'CONFIDENTIAL',
    };

    beforeEach(() => {
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('scan_sessions')) {
          return Promise.resolve({
            rows: [{
              id: 'session-123',
              target_url: 'https://example.com',
              started_at: new Date('2024-01-01T10:00:00Z'),
              completed_at: new Date('2024-01-01T12:00:00Z'),
              total_requests: 250,
            }],
          } as any);
        }
        if (query.includes('vulnerabilities')) {
          return Promise.resolve({
            rows: [
              {
                type: 'SQL_INJECTION',
                severity: 'CRITICAL',
                location: '/api/users?id=1',
                description: 'SQL injection vulnerability allows unauthorized database access',
                evidence: 'SQL error: "You have an error in your SQL syntax"',
                remediation: 'Use parameterized queries or prepared statements',
                cvss_score: 9.8,
              },
              {
                type: 'XSS',
                severity: 'HIGH',
                location: '/search?q=<script>',
                description: 'Reflected XSS allows execution of arbitrary JavaScript',
                evidence: 'Script tag reflected in response without encoding',
                remediation: 'Implement proper output encoding and Content Security Policy',
                cvss_score: 7.3,
              },
              {
                type: 'CSRF',
                severity: 'MEDIUM',
                location: '/api/update-profile',
                description: 'Missing CSRF protection on state-changing operations',
                evidence: 'No CSRF token validation observed',
                remediation: 'Implement CSRF tokens for all state-changing requests',
                cvss_score: 5.4,
              },
            ],
          } as any);
        }
        if (query.includes('INSERT INTO reports')) {
          return Promise.resolve({ rows: [] } as any);
        }
        return Promise.resolve({ rows: [] } as any);
      });
    });

    test('should include vulnerability description', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      const content = report.content as string;
      
      expect(content).toContain('SQL injection vulnerability allows unauthorized database access');
      expect(content).toContain('Reflected XSS allows execution of arbitrary JavaScript');
      expect(content).toContain('Missing CSRF protection on state-changing operations');
    });

    test('should include severity levels', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      const content = report.content as string;
      
      expect(content).toContain('CRITICAL');
      expect(content).toContain('HIGH');
      expect(content).toContain('MEDIUM');
    });

    test('should include reproduction steps (location)', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      const content = report.content as string;
      
      expect(content).toContain('/api/users?id=1');
      expect(content).toContain('/search?q=<script>');
      expect(content).toContain('/api/update-profile');
    });

    test('should include remediation recommendations', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      const content = report.content as string;
      
      expect(content).toContain('Use parameterized queries or prepared statements');
      expect(content).toContain('Implement proper output encoding and Content Security Policy');
      expect(content).toContain('Implement CSRF tokens for all state-changing requests');
    });

    test('should include executive summary', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      const content = report.content as string;
      
      // Should contain summary section
      expect(content).toContain('ملخص');
      
      // Should contain total vulnerabilities count
      expect(content).toContain('3');
      
      // Should contain severity breakdown
      expect(content).toContain('1'); // Critical count
    });

    test('should include statistics', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      const content = report.content as string;
      
      // Should contain total requests
      expect(content).toContain('250');
      
      // Should contain scan duration info
      expect(content).toContain('2024-01-01');
    });

    test('should include CVSS scores', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      const content = report.content as string;
      
      expect(content).toContain('9.8');
      expect(content).toContain('7.3');
      expect(content).toContain('5.4');
    });

    test('should include evidence for each vulnerability', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      const content = report.content as string;
      
      expect(content).toContain('SQL error: "You have an error in your SQL syntax"');
      expect(content).toContain('Script tag reflected in response without encoding');
      expect(content).toContain('No CSRF token validation observed');
    });

    test('should include metadata in report', async () => {
      const report = await reportGenerator.generateWebScanReport(
        'session-123',
        'HTML',
        mockMetadata
      );

      expect(report.metadata.title).toBe('Comprehensive Report');
      expect(report.metadata.author).toBe('Security Analyst');
      expect(report.metadata.organization).toBe('Test Organization');
      expect(report.metadata.confidentialityLevel).toBe('CONFIDENTIAL');
      
      const content = report.content as string;
      expect(content).toContain('Comprehensive Report');
      expect(content).toContain('Security Analyst');
    });
  });
});
